// Server-only assembly of the generation output path.
// All dependencies are injected; this module never starts billable generation,
// exposes provider secrets, or accepts customer-supplied media URLs.
import {createGenerationOutputReconciler} from './generation-output-reconciler.mjs';
import {createGenerationProviderMediaAdapter} from './generation-provider-media-adapter.mjs';
import {createTrustedProviderMp4Downloader} from './trusted-provider-mp4-downloader.mjs';
import {createGenerationOutputIngestor} from './generation-output-ingestion.mjs';
import {createGenerationOutputCoordinator} from './generation-output-coordinator.mjs';
export function createGenerationDeliveryService({getStatus,resolveTrustedUrl,allowedHosts,fetchImpl,storage,jobStore,pipeline,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 const authorizeJob=async({userId,jobId,providerJobId})=>{
  if(!jobStore?.getOwnedJob)return false;
  const job=await jobStore.getOwnedJob(userId,jobId);
  return !!job&&job.user_id===userId&&job.id===jobId&&job.provider_job_id===providerJobId&&['queued','processing'].includes(job.status);
 };
 const download=createTrustedProviderMp4Downloader({enabled,resolveTrustedUrl,allowedHosts,fetchImpl});
 const retrieve=createGenerationProviderMediaAdapter({enabled,download});
 const ingest=createGenerationOutputIngestor({enabled,storage});
 const completeWithBytes=createGenerationOutputCoordinator({enabled,jobStore,ingest,pipeline});
 return createGenerationOutputReconciler({enabled,authorizeJob,getStatus,retrieve,completeWithBytes});
}
