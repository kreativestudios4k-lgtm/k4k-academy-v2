// New guarded transactional ledger. Existing legacy coordinator remains unchanged
// for compatibility, but must not be exposed to routes or used for paid requests.
export function createGuardedGenerationLedger(client,{enabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 // The database functions raise these exact codes. Surface them so a route can
 // answer the customer precisely; anything else stays a closed, generic failure.
 const KNOWN=['INSUFFICIENT_CREDITS','JOB_NOT_DRAFT','IDEMPOTENCY_CONFLICT','INVALID_JOB','INVALID_JOB_STATE','RESERVATION_NOT_FOUND','INVALID_OUTPUT','CREDIT_ACCOUNT_MISSING'];
 const call=async(name,args)=>{const {data,error}=await client.rpc(name,args);if(error){const code=KNOWN.find(k=>error.message===k);throw Error(code??'GENERATION_LEDGER_UNAVAILABLE');}if(!data)throw Error('GENERATION_LEDGER_UNAVAILABLE');return data;};
 return Object.freeze({
  reserve:async(userId,jobId,key,credits)=>{
   if(!enabled)throw Error('GENERATION_DISABLED');
   if(!Number.isSafeInteger(credits)||credits<1)throw Error('INVALID_CREDITS');
   const result=await call('k4k_generation_reserve_draft',{p_user:userId,p_job:jobId,p_key:key,p_credits:credits,p_enabled:true});
   if(typeof result.newly_reserved!=='boolean')throw Error('RESERVATION_CONTRACT_INVALID');
   return {...result,newlyReserved:result.newly_reserved};
  },
  finish:async(userId,jobId,outcome,outputPath=null)=>{
   if(!enabled)throw Error('GENERATION_DISABLED');
   if(!['completed','failed'].includes(outcome))throw Error('INVALID_OUTCOME');
   return call('k4k_generation_finish',{p_user:userId,p_job:jobId,p_outcome:outcome,p_output_path:outputPath});
  }
 });
}
