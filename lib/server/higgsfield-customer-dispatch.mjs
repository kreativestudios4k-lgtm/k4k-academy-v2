import {higgsfieldDispatchEnabled} from './higgsfield-release-policy.mjs';
// Higgsfield Genjutsu dispatch coordinator for staged customer jobs.
// NO public/customer API route invokes this yet. Disabled unless explicitly
// enabled inside preview after real-provider pricing and credits are reviewed.
import {verifyHiggsfieldCustomerQuote} from './higgsfield-customer-quote.mjs';
import {genjutsuInput} from './higgsfield-genjutsu-motion.mjs';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const RID=/^[A-Za-z0-9_-]{1,128}$/;
export function createHiggsfieldCustomerDispatch({lookupJob,getVerifiedMedia,provider,database,env=process.env,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return Object.freeze({
  async submitReserved({userId,jobId,quoteToken}={}){
   if(!enabled||!higgsfieldDispatchEnabled(env))
    throw Error('HIGGSFIELD_CUSTOMER_DISPATCH_DISABLED');
   if(!UUID.test(userId??'')||!UUID.test(jobId??'')||typeof quoteToken!=='string')
    throw Error('INVALID_DISPATCH');
   if(typeof lookupJob!=='function'||typeof getVerifiedMedia!=='function'||!provider?.submit||!database?.rpc)
    throw Error('DISPATCH_UNAVAILABLE');
   const job=await lookupJob(userId,jobId);
   if(!job||job.id!==jobId||job.user_id!==userId||job.provider!=='higgsfield'
     ||job.model!=='genjutsu-motion'||job.status!=='queued')
    throw Error('JOB_NOT_READY');
   const verifiedMedia=await getVerifiedMedia({userId,jobId});
   const quote=verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia,token:quoteToken,env});
   if(job.input_fingerprint!==quote.fingerprint||job.quoted_usd_micros!==quote.quoteMicros
     ||job.credits_quoted!==quote.credits||!job.quote_expires_at
     ||new Date(job.quote_expires_at).getTime()<=Date.now())
    throw Error('RESERVED_QUOTE_MISMATCH');
   const input=genjutsuInput(job.input??job.normalized_input);
   const {data:claim,error:claimError}=await database.rpc('k4k_multimodel_claim_dispatch',{p_user:userId,p_job:jobId});
   if(claimError||!claim||claim.job_id!==jobId||typeof claim.claimed!=='boolean')
    throw Error('DISPATCH_CLAIM_UNAVAILABLE');
   if(!claim.claimed)return Object.freeze({status:claim.state,dispatched:false});
   // The claim is now irreversible; NO automatic retry even on network timeout.
   let submitted;
   try{
    submitted=await provider.submit('motion',input,{
     enabled:true,sourceSeconds:verifiedMedia.seconds,
     maxUsd:quote.quoteMicros/1000000,quotedUsd:quote.quoteMicros/1000000
    });
   }catch{throw Error('PROVIDER_SUBMISSION_UNCERTAIN');}
   if(!RID.test(submitted?.request_id??''))throw Error('PROVIDER_SUBMISSION_UNCERTAIN');
   try{
    const {data,error}=await database.rpc('k4k_multimodel_record_provider_request',{
     p_user:userId,p_job:jobId,p_provider_request:submitted.request_id
    });
    if(error||!data||data.job_id!==jobId||data.status!=='processing')
      throw Error('PROVIDER_RECORDING_REQUIRES_REVIEW');
   }catch{throw Error('PROVIDER_RECORDING_REQUIRES_REVIEW');}
   return Object.freeze({status:'processing',dispatched:true,providerRequestId:submitted.request_id});
  }
 });
}
