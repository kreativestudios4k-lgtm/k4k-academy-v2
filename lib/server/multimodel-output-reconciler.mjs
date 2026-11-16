// Isolated, disabled-by-default completion coordinator for multi-model jobs.
// All provider status and bytes must originate from independently authenticated,
// server-side adapters. No browser-supplied URL or provider callback is trusted.
import {verifyGenerationOutputBytes} from './generation-output-ingestion.mjs';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9_-]{1,128}$/;
const MIME_KIND=Object.freeze({'video/mp4':'video','image/png':'image','image/jpeg':'image'});
export function createMultimodelOutputReconciler({getOwnedJob,getStatus,retrieveAuthenticatedBytes,ingest,ledger,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return async function reconcile({userId,jobId}={}){
  if(!enabled)throw Error('MULTIMODEL_RECONCILIATION_DISABLED');
  if(!UUID.test(userId??'')||!UUID.test(jobId??''))throw Error('INVALID_JOB');
  if(typeof getOwnedJob!=='function'||typeof getStatus!=='function'||typeof retrieveAuthenticatedBytes!=='function'||typeof ingest!=='function'||!ledger?.finish)
   throw Error('RECONCILIATION_UNAVAILABLE');
  const job=await getOwnedJob(userId,jobId);
  if(!job||job.user_id!==userId||job.id!==jobId)throw Error('JOB_NOT_FOUND');
  if(job.status==='completed')return Object.freeze({status:'already_completed'});
  if(job.status==='failed')return Object.freeze({status:'already_failed'});
  if(job.status!=='processing'||!REQUEST.test(job.provider_request_id??''))throw Error('PROVIDER_IDENTITY_UNVERIFIED');
  const requestId=job.provider_request_id;
  const status=await getStatus({providerRequestId:requestId,model:job.model});
  if(status?.providerRequestId!==requestId)throw Error('PROVIDER_REQUEST_MISMATCH');
  if(['queued','processing'].includes(status.status))return Object.freeze({status:'pending'});
  if(status.status==='failed')return Object.freeze({status:'provider_failed_review_required'});
  if(status.status!=='completed')throw Error('INVALID_PROVIDER_STATUS');
  const media=await retrieveAuthenticatedBytes({providerRequestId:requestId,model:job.model,expectedKind:job.media_kind});
  if(!media||!Object.hasOwn(MIME_KIND,media.contentType)||MIME_KIND[media.contentType]!==job.media_kind)throw Error('INVALID_PROVIDER_MEDIA_TYPE');
  verifyGenerationOutputBytes(media.bytes,media.contentType);
  // An object that already exists may represent a prior successful ingestion.
  // Never overwrite or refund blindly after storage or settlement ambiguity.
  let output;
  try{output=await ingest({userId,jobId,providerJobId:requestId,contentType:media.contentType,bytes:media.bytes});}
  catch{throw Error('OUTPUT_INGESTION_REQUIRES_RECONCILIATION');}
  if(output?.providerJobId!==requestId||typeof output.outputPath!=='string')throw Error('OUTPUT_IDENTITY_UNVERIFIED');
  const extension={'video/mp4':'mp4','image/png':'png','image/jpeg':'jpg'}[media.contentType];
  if(output.outputPath!==userId+'/'+jobId+'.'+extension)throw Error('OUTPUT_IDENTITY_UNVERIFIED');
  let settled;
  try{settled=await ledger.finish({userId,jobId,outcome:'completed',contentType:media.contentType,outputPath:output.outputPath});}
  catch{throw Error('OUTPUT_SETTLEMENT_REQUIRES_RECONCILIATION');}
  if(settled?.status!=='settled')throw Error('OUTPUT_SETTLEMENT_REQUIRES_RECONCILIATION');
  return Object.freeze({status:'completed',jobId,outputPath:output.outputPath});
 };
}
