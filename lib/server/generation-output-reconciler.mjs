// Server-only orchestration. Injected provider adapters must authenticate their
// own upstream calls. No HTTP routes, timers, secrets or paid calls live here.
export function createGenerationOutputReconciler({getStatus,retrieve,completeWithBytes,authorizeJob,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return async function reconcile({userId,jobId,providerJobId}={}){
  if(!enabled)throw Error('OUTPUT_RECONCILIATION_DISABLED');
  if(typeof getStatus!=='function'||typeof retrieve!=='function'||typeof completeWithBytes!=='function'||typeof authorizeJob!=='function')throw Error('RECONCILIATION_UNAVAILABLE');
  const authorized=await authorizeJob({userId,jobId,providerJobId});
  if(authorized!==true)throw Error('JOB_OWNERSHIP_OR_PROVIDER_MISMATCH');
  const status=await getStatus({providerJobId});
  if(status?.providerJobId!==providerJobId)throw Error('PROVIDER_JOB_MISMATCH');
  if(status.status==='queued'||status.status==='processing')return Object.freeze({status:'pending'});
  // Failure settlement is deliberately not automatic: a trusted provider
  // failure and owner-scoped reservation must be independently verified.
  if(status.status==='failed')return Object.freeze({status:'provider_failed_review_required'});
  if(status.status!=='completed')throw Error('INVALID_PROVIDER_STATUS');
  const media=await retrieve({providerJobId,verifiedStatus:status});
  if(!media||!(media.bytes instanceof Uint8Array)||media.contentType!=='video/mp4')throw Error('INVALID_PROVIDER_MEDIA');
  return completeWithBytes({userId,jobId,providerJobId,providerStatus:'completed',bytes:media.bytes,contentType:media.contentType});
 };
}
