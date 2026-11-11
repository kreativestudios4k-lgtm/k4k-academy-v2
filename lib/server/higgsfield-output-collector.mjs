import {createGenerationOutputVerifier} from './generation-output-verifier.mjs';
import {createGenerationOutputIngestor} from './generation-output-ingestion.mjs';
import {createTrustedProviderMp4Downloader} from './trusted-provider-mp4-downloader.mjs';
// Caller obtains status from authenticated Higgsfield REST, never from browser JSON.
export function createHiggsfieldOutputCollector({storage,jobStore,ledger,fetchImpl=fetch,enabled=false,allowedHosts=['d3u0tzju9qaucj.cloudfront.net','d2ol7oe51mr4n9.cloudfront.net']}={}){
 const verify=createGenerationOutputVerifier({storage,enabled});
 const ingest=createGenerationOutputIngestor({storage,enabled});
 return async function collect({userId,jobId,providerJobId,status}={}){
  if(!enabled)throw Error('OUTPUT_COLLECTION_DISABLED');
  const job=await jobStore.getOwnedJob(userId,jobId);
  if(!job||job.user_id!==userId||job.id!==jobId||job.provider_job_id!==providerJobId)throw Error('JOB_OWNERSHIP_OR_PROVIDER_MISMATCH');
  if(status?.request_id!==providerJobId||status.status!=='completed')throw Error('PROVIDER_NOT_COMPLETED');
  const outputPath=userId+'/'+jobId+'.mp4';
  if(job.status==='completed'){
   if(job.output_path!==outputPath)throw Error('INVALID_OUTPUT_PATH');
   await verify({userId,jobId,outputPath});return {status:'completed'};
  }
  if(!['queued','processing'].includes(job.status))throw Error('INVALID_JOB_STATE');
  let exists=false;try{exists=await verify({userId,jobId,outputPath})}catch{}
  if(!exists){
   const download=createTrustedProviderMp4Downloader({enabled,fetchImpl,resolveTrustedUrl:async()=>status.video?.url,allowedHosts});
   const media=await download({providerJobId});
   try{await ingest({userId,jobId,providerJobId,...media})}catch(error){
    // A simultaneous collector may have created the same immutable private object.
    // Only a verified object at the exact owner/job path permits reconciliation.
    if(error.message!=='OUTPUT_UPLOAD_FAILED')throw error;
    await verify({userId,jobId,outputPath});
   }
  }
  await verify({userId,jobId,outputPath});
  await ledger.finish(userId,jobId,'completed',outputPath);
  return {status:'completed'};
 };
}
