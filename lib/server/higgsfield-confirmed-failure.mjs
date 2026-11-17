// Preview-only adapter: refund live wallet credits ONLY for authenticated
// terminal provider statuses linked to the exact originally recorded job.
// Never accept a customer-supplied failure status, request ID or evidence.
import {createHash} from 'node:crypto';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const REQUEST=/^[a-zA-Z0-9_-]{1,128}$/;
const TERMINAL=new Set(['failed','nsfw','canceled']);
export function createHiggsfieldConfirmedFailureReconciler({getOwnedJob,provider,ledger,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return Object.freeze({
  async reconcile({userId,jobId}={}){
   if(!enabled)throw Error('HIGGSFIELD_FAILURE_RECONCILIATION_DISABLED');
   if(!UUID.test(userId??'')||!UUID.test(jobId??''))throw Error('INVALID_JOB');
   if(typeof getOwnedJob!=='function'||typeof provider?.status!=='function'||typeof ledger?.rpc!=='function')
    throw Error('RECONCILIATION_UNAVAILABLE');
   const job=await getOwnedJob(userId,jobId);
   if(!job||job.id!==jobId||job.user_id!==userId||job.provider!=='higgsfield'||job.model!=='genjutsu-motion')
    throw Error('JOB_NOT_FOUND');
   if(job.status==='failed')return Object.freeze({status:'already_failed',refunded:false});
   if(job.status==='completed')return Object.freeze({status:'already_completed',refunded:false});
   if(job.status!=='processing'||!REQUEST.test(job.provider_request_id??''))
    throw Error('PROVIDER_DISPATCH_REQUIRES_REVIEW');
   // This must be an authenticated server-to-Higgsfield status request,
   // never a client-submitted or webhook-derived outcome.
   const state=await provider.status(job.provider_request_id);
   if(state?.request_id!==job.provider_request_id)throw Error('PROVIDER_STATUS_ID_MISMATCH');
   if(['queued','in_progress'].includes(state.status))return Object.freeze({status:'pending',refunded:false});
   if(state.status==='completed')return Object.freeze({status:'output_pending',refunded:false});
   if(!TERMINAL.has(state.status))throw Error('PROVIDER_STATUS_UNVERIFIED');
   const digest=createHash('sha256').update(JSON.stringify([
    'higgsfield-confirmed-terminal-v1',job.provider_request_id,state.status
   ])).digest('hex');
   const {data,error}=await ledger.rpc('k4k_multimodel_refund_confirmed_provider_failure',{
    p_user:userId,p_job:jobId,p_provider_request:job.provider_request_id,
    p_terminal_status:state.status,p_evidence_digest:digest
   });
   if(error||!data||data.job_id!==jobId||data.status!=='refunded'||typeof data.newly_finished!=='boolean')
    throw Error('TERMINAL_REFUND_REQUIRES_REVIEW');
   return Object.freeze({status:'refunded',refunded:data.newly_finished});
  }
 });
}
