// Server-only provider lifecycle. No customer route or scheduled polling.
import {validatedMultimodelRequest} from './fal-multimodel-contracts.mjs';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const req=/^[a-zA-Z0-9_-]{1,128}$/;
async function rpc(db,name,args){
 if(!db?.rpc)throw Error('MULTIMODEL_STORE_UNAVAILABLE');
 const {data,error}=await db.rpc(name,args);
 if(error||!data||data.job_id!==args.p_job)throw Error('MULTIMODEL_STORE_UNAVAILABLE');
 return data;
}
export function createMultimodelProviderLifecycle({database,submitAuthenticated,lookupAuthenticated,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return Object.freeze({
  async dispatch({userId,job}={}){
   if(!enabled)throw Error('MULTIMODEL_DISPATCH_DISABLED');
   if(!uuid.test(userId??'')||!job||!uuid.test(job.id??'')||job.user_id!==userId)throw Error('INVALID_JOB');
   // Validate before consuming the irreversible one-shot database claim.
   const request=validatedMultimodelRequest(job.model,job.input);
   if(typeof submitAuthenticated!=='function')throw Error('PROVIDER_SUBMIT_UNAVAILABLE');
   const claim=await rpc(database,'k4k_multimodel_claim_dispatch',{p_user:userId,p_job:job.id});
   if(typeof claim.claimed!=='boolean')throw Error('MULTIMODEL_STORE_UNAVAILABLE');
   if(!claim.claimed)return Object.freeze({status:claim.state,dispatched:false});
   // From this point every failure is UNCERTAIN. Do not retry this provider
   // submission automatically, even when a fetch times out or returns 5xx.
   let submitted;
   try{submitted=await submitAuthenticated({endpoint:request.endpoint,input:request.input,jobId:job.id});}
   catch{throw Error('PROVIDER_SUBMISSION_UNCERTAIN');}
   if(!req.test(submitted?.request_id??''))throw Error('PROVIDER_SUBMISSION_UNCERTAIN');
   try{
    const recorded=await rpc(database,'k4k_multimodel_record_provider_request',{
     p_user:userId,p_job:job.id,p_provider_request:submitted.request_id
    });
    if(recorded.status!=='processing')throw Error('MULTIMODEL_STORE_UNAVAILABLE');
   }catch{throw Error('PROVIDER_RECORDING_REQUIRES_RECONCILIATION');}
   return Object.freeze({status:'processing',dispatched:true,providerRequestId:submitted.request_id});
  },
  async status({providerRequestId,model}={}){
   if(!enabled)throw Error('MULTIMODEL_DISPATCH_DISABLED');
   if(!req.test(providerRequestId??'')||!['kling-flash-t2v','seedance-25-t2v','flux3-t2i','nano-banana-21-t2i'].includes(model))throw Error('INVALID_PROVIDER_JOB_ID');
   if(typeof lookupAuthenticated!=='function')throw Error('PROVIDER_LOOKUP_UNAVAILABLE');
   const result=await lookupAuthenticated({providerRequestId,model});
   if(result?.request_id!==providerRequestId)throw Error('PROVIDER_REQUEST_MISMATCH');
   if(!['queued','processing','completed','failed'].includes(result.status))throw Error('INVALID_PROVIDER_STATUS');
   // Never expose provider URLs or trust an unverified status to settle credits.
   return Object.freeze({status:result.status,providerRequestId});
  }
 });
}
