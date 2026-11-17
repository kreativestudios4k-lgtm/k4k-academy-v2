import {prepareHiggsfieldCustomerQuote,verifyHiggsfieldCustomerQuote} from './higgsfield-customer-quote.mjs';
import {genjutsuEstimate} from './higgsfield-genjutsu-motion.mjs';
import {generationCredits,quoteSigner} from './generation-quote.mjs';
import {createHiggsfieldCustomerDispatch} from './higgsfield-customer-dispatch.mjs';
import {createHiggsfieldCustomerCompletion} from './higgsfield-customer-completion.mjs';
import {createHiggsfieldConfirmedFailureReconciler} from './higgsfield-confirmed-failure.mjs';
import {createMultimodelPrivateDelivery} from './multimodel-private-delivery.mjs';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
function exact(body,keys){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!keys.includes(k)))throw Error('INVALID_REQUEST');}
export function createHiggsfieldCustomerService({store,transfer,ledger,database,provider,storage,env,fetchImpl=fetch}){
 const getOwnedJob=async(userId,jobId)=>{
  if(!UUID.test(userId??'')||!UUID.test(jobId??''))throw Error('INVALID_JOB');
  const job=await store.getOwnedJob(userId,jobId);
  if(!job||job.user_id!==userId||job.id!==jobId||job.provider!=='higgsfield'||job.model!=='genjutsu-motion')throw Error('JOB_NOT_FOUND');
  return job;
 };
 const dispatchEnabled=()=>env.VERCEL_ENV==='preview'&&env.K4K_HIGGSFIELD_CUSTOMER_DISPATCH_PREVIEW==='true'&&env.K4K_HIGGSFIELD_GENERATION_PILOT_ENABLED==='true';
 const quoteFor=(job,userId)=>{
  const quote=prepareHiggsfieldCustomerQuote({job,userId,verifiedMedia:job.verified_media,env});
  return quote;
 };
 const summary=j=>({jobId:j.id,status:j.status,credits:j.credits_quoted,createdAt:j.created_at});
 return {
  async prepare(userId,body){
   exact(body,['jobId','videoPath','referencePaths','resolution','prompt']);
   if(!UUID.test(body.jobId??'')||typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>6000)throw Error('INVALID_REQUEST');
   if(env.VERCEL_ENV!=='preview'||env.K4K_HIGGSFIELD_CUSTOMER_QUOTE_PREVIEW!=='true'||env.K4K_HIGGSFIELD_RATE_CARD_APPROVED!=='true')throw Error('HIGGSFIELD_CUSTOMER_QUOTE_DISABLED');
   if(typeof env.K4K_GENERATION_QUOTE_SECRET!=='string'||env.K4K_GENERATION_QUOTE_SECRET.length<32)throw Error('QUOTE_SIGNING_UNAVAILABLE');
   const prior=await store.getOwnedJob(userId,body.jobId);
   if(prior)throw Error('DRAFT_ALREADY_EXISTS');
   const transferred=await transfer({userId,jobId:body.jobId,videoPath:body.videoPath,referencePaths:body.referencePaths,beforeTransfer:seconds=>{
    const cost=genjutsuEstimate({sourceSeconds:seconds,resolution:body.resolution}).usd;
    const max=Number(env.K4K_GENERATION_MAX_USD);
    if(!Number.isFinite(max)||max<=0||max>5||cost>max)throw Error('PROVIDER_BUDGET_BLOCKED');
    generationCredits(cost,env);
   }});
   const job={id:body.jobId,user_id:userId,provider:'higgsfield',model:'genjutsu-motion',media_kind:'video',status:'draft',prompt:body.prompt.trim(),
    normalized_input:{...transferred.input,resolution:body.resolution,prompt:body.prompt.trim()},verified_media:transferred.verifiedMedia};
   const quote=quoteFor(job,userId);
   const checked=verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia:job.verified_media,token:quote.quoteToken,env});
   const signed=quoteSigner(env.K4K_GENERATION_QUOTE_SECRET).verify(quote.quoteToken);
   await store.insert({...job,input_fingerprint:checked.fingerprint,quoted_usd_micros:quote.quoteMicros,credits_quoted:quote.credits,quote_expires_at:new Date(signed.expiresAt).toISOString()});
   return {...quote,dispatchEnabled:dispatchEnabled()};
  },
  async submit(userId,body){
   exact(body,['jobId','quoteToken','requestKey']);
   if(!dispatchEnabled())throw Error('HIGGSFIELD_CUSTOMER_DISPATCH_DISABLED');
   if(!UUID.test(body.requestKey??''))throw Error('INVALID_REQUEST');
   const job=await getOwnedJob(userId,body.jobId);
   if(['processing','completed','failed'].includes(job.status))return summary(job);
   const quote=verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia:job.verified_media,token:body.quoteToken,env});
   // Validate the provider and budgets before touching the wallet.
   if(!provider.ready)throw Error('PROVIDER_UNAVAILABLE');
   const daily=Number(env.K4K_PROVIDER_DAILY_BUDGET_USD)*1e6,total=Number(env.K4K_PROVIDER_TOTAL_BUDGET_USD)*1e6,active=Number(env.K4K_MAX_ACTIVE_JOBS_PER_USER);
   if(!Number.isSafeInteger(daily)||daily<1||daily>1e11||!Number.isSafeInteger(total)||total<1||total>1e11||!Number.isSafeInteger(active)||active<1||active>10)throw Error('BUDGET_NOT_CONFIGURED');
   if(job.status==='draft'&&new Date(job.quote_expires_at).getTime()<Date.now()+30000)throw Error('QUOTE_EXPIRED');
   await ledger.reserve({userId,jobId:job.id,requestKey:body.requestKey,inputFingerprint:quote.fingerprint,quoteMicros:quote.quoteMicros,credits:quote.credits,dailyBudgetMicros:daily,totalBudgetMicros:total,maxActive:active});
   const dispatch=createHiggsfieldCustomerDispatch({enabled:true,env,lookupJob:getOwnedJob,getVerifiedMedia:async({userId,jobId})=>(await getOwnedJob(userId,jobId)).verified_media,provider,database});
   try{
    const result=await dispatch.submitReserved({userId,jobId:job.id,quoteToken:body.quoteToken});
    return {jobId:job.id,status:result.status,credits:quote.credits};
   }catch(error){
    // SQL refuses refunds once ANY dispatch claim exists, including an unknown
    // outcome. Only a demonstrably unsubmitted reservation can be unwound.
    if(!['PROVIDER_SUBMISSION_UNCERTAIN','PROVIDER_RECORDING_REQUIRES_REVIEW'].includes(error.message)){
     try{await ledger.finish({userId,jobId:job.id,outcome:'failed'});}catch{}
    }
    throw error;
   }
  },
  async status(userId,body){
   exact(body,['jobId']);
   let job=await getOwnedJob(userId,body.jobId);
   if(job.status==='processing'){
    // Continue read/reconciliation even when new dispatch is switched off.
    const failure=createHiggsfieldConfirmedFailureReconciler({getOwnedJob,provider,ledger:database,enabled:true});
    const result=await failure.reconcile({userId,jobId:job.id});
    if(result.status==='output_pending')await createHiggsfieldCustomerCompletion({getOwnedJob,provider,storage,ledger,fetchImpl,enabled:true}).reconcile({userId,jobId:job.id});
    job=await getOwnedJob(userId,job.id);
   }
   return {...summary(job),needsReview:job.status==='queued'};
  },
  async list(userId){return (await store.listOwned(userId)).map(summary);},
  async download(userId,body){
   exact(body,['jobId','download']);
   return createMultimodelPrivateDelivery({jobStore:{getOwnedJob},storage,enabled:true}).getSignedUrl({userId,jobId:body.jobId,download:body.download===true});
  }
 };
}
