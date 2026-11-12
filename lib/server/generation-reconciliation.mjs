// Read-only reconciliation classification. Never resubmits, refunds or
// settles credits automatically; ambiguous provider submissions require review.
export function createGenerationReconciliation({jobStore,providerStatus,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 return Object.freeze({
  async inspect({userId,jobId}={}){
   if(!enabled)throw Error('RECONCILIATION_DISABLED');
   if(!uuid.test(userId??'')||!uuid.test(jobId??''))throw Error('INVALID_JOB');
   if(!jobStore?.getOwnedJob)throw Error('RECONCILIATION_UNAVAILABLE');
   const job=await jobStore.getOwnedJob(userId,jobId);
   if(!job)return {action:'not_found'};
   if(['completed','failed'].includes(job.status))return {action:'terminal',status:job.status};
   if(!['queued','processing'].includes(job.status))return {action:'not_submitted',status:job.status};
   if(!job.provider_job_id)return {action:'manual_review',reason:'PROVIDER_SUBMISSION_AMBIGUOUS'};
   if(typeof providerStatus!=='function')return {action:'manual_review',reason:'PROVIDER_STATUS_UNAVAILABLE'};
   let result;
   try{result=await providerStatus(job.provider_job_id)}catch{return {action:'manual_review',reason:'PROVIDER_STATUS_UNAVAILABLE'};}
   if(result?.status==='completed')return {action:'verify_and_settle',providerJobId:job.provider_job_id};
   if(result?.status==='failed')return {action:'verify_failure_then_refund',providerJobId:job.provider_job_id};
   if(['queued','processing'].includes(result?.status))return {action:'wait',providerJobId:job.provider_job_id};
   return {action:'manual_review',reason:'UNKNOWN_PROVIDER_STATE'};
  }
 });
}
