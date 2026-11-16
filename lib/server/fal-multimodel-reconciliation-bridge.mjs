// Bridge authenticated fal queue results to bounded private media retrieval.
// No public route, auto-retry, customer URL, credit settlement or scheduled worker.
import {createMultimodelOutputReconciler} from './multimodel-output-reconciler.mjs';
export function createFalMultimodelReconciliationBridge({
 transport,retrieveMedia,getOwnedJob,ingest,ledger,enabled=false
}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 const getStatus=async({providerRequestId,model})=>{
  if(!transport?.lookupAuthenticated)throw Error('PROVIDER_TRANSPORT_UNAVAILABLE');
  const result=await transport.lookupAuthenticated({providerRequestId,model});
  if(result?.request_id!==providerRequestId)throw Error('PROVIDER_REQUEST_MISMATCH');
  return {providerRequestId,status:result.status};
 };
 const retrieveAuthenticatedBytes=async({providerRequestId,model,expectedKind})=>{
  if(typeof transport?.resultAuthenticated!=='function'||typeof retrieveMedia!=='function')
   throw Error('PROVIDER_MEDIA_UNAVAILABLE');
  const authenticatedResult=await transport.resultAuthenticated({providerRequestId,model});
  // Only the authenticated result object crosses into the media retriever.
  // The URL itself is validated against approved hosts there, never passed
  // directly from a browser or from the generation job.
  const media=await retrieveMedia({model,authenticatedResult});
  const valid=expectedKind==='video'?media?.contentType==='video/mp4':
   expectedKind==='image'&&['image/png','image/jpeg'].includes(media?.contentType);
  if(!valid)throw Error('INVALID_PROVIDER_MEDIA_TYPE');
  return media;
 };
 return createMultimodelOutputReconciler({
  getOwnedJob,getStatus,retrieveAuthenticatedBytes,ingest,ledger,enabled
 });
}
