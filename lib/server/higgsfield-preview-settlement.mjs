// Server-only preview sandbox settlement; never writes production credits.
// The outcome is derived solely from an authenticated Higgsfield status lookup,
// never from a browser-provided "success" or "failed" flag.
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const REQUEST=/^[a-zA-Z0-9_-]{1,128}$/;
const FINISHED=new Set(['settled','refunded']);
export function createHiggsfieldPreviewSettlement({getOwnedJob,provider,ledger,privateOutputReady,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return Object.freeze({
  async reconcile({userId,jobId}={}){
   if(!enabled)throw Error('HIGGSFIELD_PREVIEW_SETTLEMENT_DISABLED');
   if(!UUID.test(userId??'')||!UUID.test(jobId??''))throw Error('INVALID_JOB');
   if(typeof getOwnedJob!=='function'||!provider?.status||!ledger?.rpc||typeof privateOutputReady!=='function')
    throw Error('SETTLEMENT_UNAVAILABLE');
   const job=await getOwnedJob(userId,jobId);
   if(!job||job.id!==jobId||job.user_id!==userId)throw Error('JOB_NOT_FOUND');
   if(FINISHED.has(job.state))return Object.freeze({state:job.state,changed:false});
   if(job.state!=='submitted'||!REQUEST.test(job.provider_request_id??''))
    throw Error('PROVIDER_SUBMISSION_REQUIRES_REVIEW');
   const result=await provider.status(job.provider_request_id);
   if(result?.request_id!==job.provider_request_id||!['queued','in_progress','completed','failed','nsfw','canceled'].includes(result.status))
    throw Error('PROVIDER_STATUS_UNVERIFIED');
   if(['queued','in_progress'].includes(result.status))return Object.freeze({state:'pending',changed:false});
   const complete=result.status==='completed';
   if(complete){
    // A completion cannot keep paid sandbox credits unless the authenticated,
    // owner-scoped private K4K output has first been verified.
    const stored=await privateOutputReady({userId,jobId,requestId:job.provider_request_id});
    if(stored!==true)throw Error('OUTPUT_NOT_SAFELY_STORED');
   }
   // Confirmed provider failed/moderated/canceled is refundable. Network
   // failures, missing request IDs and unknown states are never refundable.
   const outcome=complete?'completed':'failed';
   const {data,error}=await ledger.rpc('k4k_hf_preview_finish',{
    p_user:userId,p_job:jobId,p_request:job.provider_request_id,p_outcome:outcome
   });
   if(error||!data||data.job_id!==jobId||!FINISHED.has(data.state)||typeof data.newly_finished!=='boolean')
    throw Error('SANDBOX_SETTLEMENT_REQUIRES_REVIEW');
   return Object.freeze({state:data.state,changed:data.newly_finished});
  }
 });
}
