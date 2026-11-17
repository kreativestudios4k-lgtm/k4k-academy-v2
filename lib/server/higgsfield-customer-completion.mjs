// Preview-only bridge for a recorded Higgsfield job: authenticated provider
// completion -> fixed CDN MP4 validation -> private storage -> atomic settlement.
// All monetary changes occur in the existing service-role-only multimodel ledger.
import {createMultimodelOutputReconciler} from './multimodel-output-reconciler.mjs';
import {createGenerationOutputIngestor} from './generation-output-ingestion.mjs';
import {createHiggsfieldVerifiedOutputRetriever} from './higgsfield-verified-output.mjs';
const ID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function createHiggsfieldCustomerCompletion({getOwnedJob,provider,storage,ledger,fetchImpl=fetch,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 const retriever=createHiggsfieldVerifiedOutputRetriever({provider,fetchImpl,enabled});
 const ingest=createGenerationOutputIngestor({storage,enabled,bucket:'studio-generations'});
 const reconcile=createMultimodelOutputReconciler({
  enabled,
  getOwnedJob:async(userId,jobId)=>{
   const job=await getOwnedJob(userId,jobId);
   if(!job||job.provider!=='higgsfield'||job.model!=='genjutsu-motion'||job.media_kind!=='video')
    throw Error('HIGGSFIELD_JOB_NOT_FOUND');
   return job;
  },
  getStatus:async({providerRequestId,model})=>{
   if(model!=='genjutsu-motion')throw Error('INVALID_PROVIDER_MODEL');
   const result=await provider.status(providerRequestId);
   if(result?.request_id!==providerRequestId)throw Error('PROVIDER_STATUS_ID_MISMATCH');
   const state=result.status;
   if(!['queued','in_progress','completed','failed','nsfw','canceled'].includes(state))
    throw Error('PROVIDER_STATUS_UNVERIFIED');
   // Terminal failures require the separate authenticated failure-refund
   // coordinator. Never refund or mark failure from this completion adapter.
   return {providerRequestId,status:state==='queued'||state==='in_progress'?'processing':state==='completed'?'completed':'failed'};
  },
  retrieveAuthenticatedBytes:async({providerRequestId,model,expectedKind})=>{
   if(model!=='genjutsu-motion'||expectedKind!=='video')throw Error('INVALID_PROVIDER_MODEL');
   return await retriever.retrieve({providerRequestId,expectedKind});
  },
  ingest,ledger
 });
 return Object.freeze({
  async reconcile({userId,jobId}={}){
   if(!enabled)throw Error('HIGGSFIELD_COMPLETION_DISABLED');
   if(!ID.test(userId??'')||!ID.test(jobId??'')||!provider?.status||!ledger?.finish
     ||typeof getOwnedJob!=='function'||!storage?.from)
    throw Error('RECONCILIATION_UNAVAILABLE');
   return await reconcile({userId,jobId});
  }
 });
}
