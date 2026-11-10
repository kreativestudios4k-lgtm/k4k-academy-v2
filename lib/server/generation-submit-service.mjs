import {generationEnvironmentAllowed,generationUserAllowed} from './generation-policy.mjs';
import {createGuardedGenerationLedger} from './guarded-generation-ledger.mjs';
import {createGenerationSubmissionRecorder} from './generation-submission-record.mjs';
import {draftFingerprint,generationCredits,quoteSigner} from './generation-quote.mjs';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function createGenerationSubmitService({database,provider,prepare,env=process.env}={}){
 return async function submit({userId,job,quoteToken,requestKey}={}){
  if(!generationEnvironmentAllowed(env)||env.HIGGSFIELD_GENJUTSU_ENABLED!=='true'||(env.VERCEL_ENV==='preview'&&env.K4K_ENABLE_TEST_GENERATION!=='true'))throw Error('GENERATION_DISABLED');
  if(!uuid.test(userId??'')||!uuid.test(requestKey??'')||job?.user_id!==userId)throw Error('INVALID_JOB');
  if(!generationUserAllowed(userId,env))throw Error('TEST_GENERATION_NOT_AUTHORIZED');
  const quote=quoteSigner(env.HF_CREDENTIALS).verify(quoteToken);
  if(quote.userId!==userId||quote.jobId!==job.id||quote.fingerprint!==draftFingerprint(job,quote.resolution))throw Error('QUOTE_CHANGED');
  const credits=generationCredits(quote.usd,env);
  if(credits!==quote.credits)throw Error('QUOTE_CHANGED');
  const maxUsd=Number(env.K4K_GENERATION_MAX_USD);
  if(!Number.isFinite(maxUsd)||maxUsd<=0||maxUsd>5||quote.usd>maxUsd)throw Error('PROVIDER_BUDGET_BLOCKED');
  // Only quote-bound, server-validated drafts may reach the transactional ledger.
  if(job.status!=='draft')throw Error('JOB_NOT_DRAFT');
  const prepared=await prepare(job,quote.resolution);
  const input=prepared.input??prepared;
  const latest=await provider.estimate(job.model,input,{sourceSeconds:prepared.sourceSeconds,referenceSeconds:prepared.referenceSeconds??0});
  if(latest.usd!==quote.usd)throw Error('QUOTE_CHANGED');
  const ledger=createGuardedGenerationLedger(database,{enabled:true});
  const reservation=await ledger.reserve(userId,job.id,requestKey,credits);
  if(!reservation.newlyReserved)return {jobId:job.id,status:'already_reserved',creditsReserved:credits};
  let result;
  // Every error after dispatch is treated as uncertain. Never auto-refund or
  // create a fresh paid request after a timeout or unexpected provider response.
  try{result=await provider.submit(job.model,input,{enabled:true,idempotencyKey:job.id,maxUsd,quotedUsd:latest.usd})}catch(error){
   // These documented synchronous rejections did not accept a generation.
   if([400,401,403,404,422,423,429].includes(error.httpStatus)){
    await ledger.finish(userId,job.id,'failed');
    return {jobId:job.id,status:'failed',creditsRefunded:true,creditsReserved:0};
   }
   throw Error('PROVIDER_SUBMISSION_UNCERTAIN');
  }
  try{await createGenerationSubmissionRecorder({client:database,enabled:true}).record({userId,jobId:job.id,providerJobId:result.request_id})}catch{throw Error('PROVIDER_RECORDING_REQUIRES_RECONCILIATION')}
  return {jobId:job.id,status:'processing',creditsReserved:credits};
 };
}
