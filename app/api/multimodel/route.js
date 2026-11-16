import {randomUUID} from 'node:crypto';
import {multimodelLiveAllowed,multimodelUserAllowed,multimodelQuote,multimodelAuth,signMultimodelQuote,verifyMultimodelQuote,findMultimodelJob,submitMultimodelRequest,pollMultimodelRequest,ingestMultimodelOutput,multimodelError} from '../../../lib/server/multimodel-live-service.mjs';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const reply=(obj,status=200)=>Response.json(obj,{status,headers});
const fail=e=>{const x=multimodelError(e);return reply({error:x.code},x.status)};
function checkEnabled(){if(!multimodelLiveAllowed())throw Error('GENERATION_DISABLED')}
export async function POST(request){
 try{
  checkEnabled();
  const {user,db}=await multimodelAuth(request);
  if(!multimodelUserAllowed(user.id))throw Error('GENERATION_DISABLED');
  let body;try{body=await request.json()}catch{throw Error('INVALID_PROVIDER_INPUT')}
  if(body.action==='quote'){
   const estimate=multimodelQuote({modelId:body.modelId,params:body.parameters});
   const {data:account,error:accountError}=await db.from('k4k_live_credit_accounts').select('balance,billing_hold').eq('user_id',user.id).maybeSingle();
   if(accountError||!account)throw Error('UNAVAILABLE');
   const {count:recent,error:recentError}=await db.from('k4k_multimodel_jobs').select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-86400000).toISOString());
   if(recentError)throw Error('UNAVAILABLE');
   if((recent??0)>30)throw Error('PROVIDER_BUDGET_BLOCKED');
   const {data,error}=await db.from('k4k_multimodel_jobs').insert({
    user_id:user.id,model_id:body.modelId,endpoint:estimate.endpoint,prompt:estimate.input.prompt,
    parameters:estimate.input,kind:estimate.kind,quote_micros:estimate.quoteMicros,quoted_credits:estimate.credits
   }).select('*').single();
   if(error||!data)throw Error('UNAVAILABLE');
   return reply({jobId:data.id,customerCredits:estimate.credits,estimatedProviderUsd:estimate.usd,
    balance:account.balance,canSubmit:!account.billing_hold&&account.balance>=estimate.credits,
    quoteToken:signMultimodelQuote(data),expiresInSeconds:300});
  }
  if(body.action==='submit'){
   const job=await findMultimodelJob(db,user.id,body.jobId);
   if(job.status!=='draft')return reply({jobId:job.id,status:job.status,replayed:true});
   verifyMultimodelQuote(job,body.quoteToken);
   const requestKey=body.requestKey;
   if(typeof requestKey!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestKey))throw Error('INVALID_JOB');
   const daily=Math.min(10,Number(process.env.K4K_MULTIMODEL_DAILY_BUDGET_USD)||0);
   const total=Math.min(20,Number(process.env.K4K_MULTIMODEL_TOTAL_BUDGET_USD)||0);
   if(!(daily>0&&total>0))throw Error('PROVIDER_BUDGET_BLOCKED');
   const {data:reserved,error:reserveError}=await db.rpc('k4k_multimodel_reserve',{
    p_user:user.id,p_job:job.id,p_key:requestKey,p_credits:job.quoted_credits,
    p_quote_micros:job.quote_micros,p_daily_budget_micros:Math.floor(daily*1e6),p_total_budget_micros:Math.floor(total*1e6)
   });
   if(reserveError||!reserved)throw Error(reserveError?.message?.split(':')[0]||'UNAVAILABLE');
   if(reserved.newly_reserved!==true)return reply({jobId:job.id,status:reserved.status,replayed:true});
   let providerId;
   try{providerId=await submitMultimodelRequest(job,process.env.FAL_KEY)}
   catch(error){
    // Failed or timed-out submissions are uncertain: never automatically
    // refund or dispatch another request without authenticated reconciliation.
    return reply({jobId:job.id,status:'queued',reconciliationRequired:true},202);
   }
   const {error:recordError}=await db.from('k4k_multimodel_jobs').update({provider_job_id:providerId,status:'processing',updated_at:new Date().toISOString()})
    .eq('user_id',user.id).eq('id',job.id).eq('status','queued').is('provider_job_id',null);
   if(recordError)throw Error('UNAVAILABLE');
   return reply({jobId:job.id,status:'processing'},202);
  }
  throw Error('INVALID_PROVIDER_INPUT');
 }catch(e){return fail(e)}
}
export async function GET(request){
 try{
  if(!new URL(request.url).searchParams.get('id')){
   if(!multimodelLiveAllowed())return reply({enabled:false,models:[]});
   try{const {user}=await multimodelAuth(request);const allowed=multimodelUserAllowed(user.id);
    return reply({enabled:allowed,models:allowed?['kling_4_0_flash','flux_3_image','nano_banana_2']:[]});
   }catch{return reply({enabled:false,models:[]})}
  }
  checkEnabled();
  const {user,db}=await multimodelAuth(request);
  if(!multimodelUserAllowed(user.id))throw Error('GENERATION_DISABLED');
  const id=new URL(request.url).searchParams.get('id');
  const job=await findMultimodelJob(db,user.id,id);
  if(job.status==='completed'){
   const path=user.id+'/'+job.id+(job.kind==='video'?'.mp4':'.png');
   if(job.output_path!==path)throw Error('UNAVAILABLE');
   const {data,error}=await db.storage.from('studio-generations').createSignedUrl(path,120);
   if(error||!data?.signedUrl)throw Error('UNAVAILABLE');
   return reply({id,status:'completed',kind:job.kind,url:data.signedUrl});
  }
  if(!['processing','queued'].includes(job.status))return reply({id,status:job.status,failureCode:job.failure_code||null});
  if(!job.provider_job_id)return reply({id,status:'queued',reconciliationRequired:true});
  const polled=await pollMultimodelRequest(job,process.env.FAL_KEY);
  if(polled.state==='queued'||polled.state==='processing')return reply({id,status:polled.state});
  if(polled.state==='failed'){
   const {data,error}=await db.rpc('k4k_multimodel_finish',{p_user:user.id,p_job:job.id,p_outcome:'failed',p_output_path:null});
   if(error||!data)throw Error('UNAVAILABLE');
   return reply({id,status:'failed',creditsRefunded:true});
  }
  const path=await ingestMultimodelOutput({db,job,url:polled.url});
  const {data,error}=await db.rpc('k4k_multimodel_finish',{p_user:user.id,p_job:job.id,p_outcome:'completed',p_output_path:path});
  if(error||!data)throw Error('UNAVAILABLE');
  const {data:signed,error:signError}=await db.storage.from('studio-generations').createSignedUrl(path,120);
  if(signError||!signed?.signedUrl)throw Error('UNAVAILABLE');
  return reply({id,status:'completed',kind:job.kind,url:signed.signedUrl});
 }catch(e){return fail(e)}
}
