// Trusted server-only coordinator for a completed provider job.
// The caller must independently authenticate the provider status and retrieve
// bytes through an allowlisted provider API; never pass browser-supplied data.
// No public route, polling schedule, or paid provider request is created here.
export function createGenerationOutputCoordinator({jobStore,ingest,pipeline,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return async function completeWithBytes({userId,jobId,providerJobId,bytes,contentType='video/mp4',providerStatus}={}){
  if(!enabled)throw Error('OUTPUT_COORDINATION_DISABLED');
  if(providerStatus!=='completed')throw Error('PROVIDER_NOT_COMPLETED');
  if(!jobStore?.getOwnedJob||typeof ingest!=='function'||!pipeline?.complete)throw Error('COORDINATOR_UNAVAILABLE');
  const job=await jobStore.getOwnedJob(userId,jobId);
  if(!job||job.user_id!==userId||job.id!==jobId||job.provider_job_id!==providerJobId||!['queued','processing'].includes(job.status))throw Error('JOB_OWNERSHIP_OR_PROVIDER_MISMATCH');
  const {outputPath}=await ingest({userId,jobId,providerJobId,bytes,contentType});
  return pipeline.complete({userId,jobId,providerJobId,outcome:'completed',outputPath});
 };
}
