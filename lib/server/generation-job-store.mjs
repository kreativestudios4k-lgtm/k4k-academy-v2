// Service-role-only job lookup for trusted provider reconciliation.
// Never expose this adapter directly to a browser or accept a user-controlled
// provider identity without first authenticating the upstream event.
export function createGenerationJobStore({client,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 return Object.freeze({
  async getOwnedJob(userId,jobId){
   if(!enabled)throw Error('JOB_LOOKUP_DISABLED');
   if(!uuid.test(userId??'')||!uuid.test(jobId??''))throw Error('INVALID_JOB');
   if(!client?.from)throw Error('JOB_STORE_UNAVAILABLE');
   const {data,error}=await client.from('studio_generation_jobs')
    .select('id,user_id,status,provider_job_id,output_path')
    .eq('id',jobId).eq('user_id',userId).maybeSingle();
   if(error)throw Error('JOB_LOOKUP_FAILED');
   return data??null;
  }
 });
}
