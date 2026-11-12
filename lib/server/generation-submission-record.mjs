// Persist a provider request ID before any async completion can be accepted.
// This adapter never submits a provider request or charges credits.
export function createGenerationSubmissionRecorder({client,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 return Object.freeze({
  async record({userId,jobId,providerJobId}={}){
   if(!enabled)throw Error('SUBMISSION_RECORDING_DISABLED');
   const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
   if(!uuid.test(userId??'')||!uuid.test(jobId??'')||typeof providerJobId!=='string'||!providerJobId.trim()||providerJobId.length>256)throw Error('INVALID_SUBMISSION');
   if(!client?.from)throw Error('SUBMISSION_STORE_UNAVAILABLE');
   // Conditional write prevents a retry from replacing a previously stored
   // provider request. Never overwrite another customer's job.
   const {data,error}=await client.from('studio_generation_jobs')
    .update({provider_job_id:providerJobId,status:'processing',updated_at:new Date().toISOString()})
    .eq('id',jobId).eq('user_id',userId).eq('status','queued')
    .is('provider_job_id',null)
    .select('id,user_id,provider_job_id,status').maybeSingle();
   if(error)throw Error('SUBMISSION_RECORDING_FAILED');
   if(!data)throw Error('SUBMISSION_STATE_CONFLICT');
   if(data.id!==jobId||data.user_id!==userId||data.provider_job_id!==providerJobId||data.status!=='processing')throw Error('SUBMISSION_RECORDING_INVALID');
   return {jobId,status:'processing'};
  }
 });
}
