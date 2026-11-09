// Server-only completion coordinator. The caller must authenticate a trusted
// provider event and independently verify the owned private output object.
export function createGenerationCompletion({ledger,jobStore,verifyOutput,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 return Object.freeze({
  async settle({userId,jobId,providerJobId,outcome,outputPath=null}={}){
   if(!enabled)throw Error('GENERATION_COMPLETION_DISABLED');
   if(!ledger?.finish||!jobStore?.getOwnedJob||typeof verifyOutput!=='function')throw Error('COMPLETION_UNAVAILABLE');
   if(!['completed','failed'].includes(outcome))throw Error('INVALID_OUTCOME');
   if(typeof userId!=='string'||typeof jobId!=='string'||typeof providerJobId!=='string'||!providerJobId)throw Error('INVALID_JOB');
   const job=await jobStore.getOwnedJob(userId,jobId);
   if(!job||job.user_id!==userId||job.id!==jobId||job.provider_job_id!==providerJobId)throw Error('JOB_OWNERSHIP_OR_PROVIDER_MISMATCH');
   if(!['queued','processing'].includes(job.status))throw Error('INVALID_JOB_STATE');
   if(outcome==='completed'){
    if(typeof outputPath!=='string'||!outputPath.startsWith(userId+'/')||!/^[0-9a-f-]{36}\.mp4$/i.test(outputPath.slice(userId.length+1)))throw Error('INVALID_OUTPUT');
    const verified=await verifyOutput({userId,jobId,outputPath});
    if(verified!==true)throw Error('OUTPUT_NOT_VERIFIED');
   }else if(outputPath!==null)throw Error('UNEXPECTED_OUTPUT');
   return ledger.finish(userId,jobId,outcome,outputPath);
  }
 });
}
