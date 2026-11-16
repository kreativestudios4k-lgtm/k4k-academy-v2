// Privileged, owner-scoped lookup for isolated multimodel jobs.
// Must be called only after authenticating the customer's bearer token.
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function createMultimodelJobStore({client,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return Object.freeze({
  async getOwnedJob(userId,jobId){
   if(!enabled)throw Error('MULTIMODEL_JOB_LOOKUP_DISABLED');
   if(!UUID.test(userId??'')||!UUID.test(jobId??''))throw Error('INVALID_JOB');
   if(!client?.from)throw Error('MULTIMODEL_JOB_STORE_UNAVAILABLE');
   const {data,error}=await client.from('k4k_multimodel_jobs')
    .select('id,user_id,model,media_kind,status,provider_request_id,output_path,output_mime')
    .eq('id',jobId).eq('user_id',userId).maybeSingle();
   if(error)throw Error('MULTIMODEL_JOB_LOOKUP_FAILED');
   return data??null;
  }
 });
}
