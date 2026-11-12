// Creates a short-lived signed download URL only after the authenticated
// caller has resolved an owned, completed job. No public bucket exposure.
export function createGenerationOutputDelivery({jobStore,storage,bucket='studio-generations',verifyOutput,enabled=false,expiresIn=120}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 return Object.freeze({
  async getSignedUrl({userId,jobId}={}){
   if(!enabled)throw Error('OUTPUT_DELIVERY_DISABLED');
   if(!uuid.test(userId??'')||!uuid.test(jobId??''))throw Error('INVALID_JOB');
   if(!jobStore?.getOwnedJob||!storage?.from||typeof verifyOutput!=='function')throw Error('DELIVERY_UNAVAILABLE');
   const job=await jobStore.getOwnedJob(userId,jobId);
   if(!job||job.user_id!==userId||job.id!==jobId)throw Error('JOB_NOT_FOUND');
   if(job.status!=='completed')throw Error('JOB_NOT_COMPLETED');
   const path=userId+'/'+jobId+'.mp4';
   if(job.output_path!==path)throw Error('INVALID_OUTPUT_PATH');
   if(await verifyOutput({userId,jobId,outputPath:path})!==true)throw Error('OUTPUT_NOT_VERIFIED');
   const {data,error}=await storage.from(bucket).createSignedUrl(path,expiresIn);
   if(error||typeof data?.signedUrl!=='string'||!data.signedUrl.startsWith('https://'))throw Error('SIGNED_URL_UNAVAILABLE');
   return {url:data.signedUrl,expiresIn};
  }
 });
}
