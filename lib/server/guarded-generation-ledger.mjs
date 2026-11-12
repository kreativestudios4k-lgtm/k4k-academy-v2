// New guarded transactional ledger. Existing legacy coordinator remains unchanged
// for compatibility, but must not be exposed to routes or used for paid requests.
export function createGuardedGenerationLedger(client,{enabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 const call=async(name,args)=>{const {data,error}=await client.rpc(name,args);if(error||!data){const safe=['BILLING_REVIEW_REQUIRED','INSUFFICIENT_CREDITS','IDEMPOTENCY_CONFLICT','JOB_NOT_DRAFT','ACTIVE_JOB_LIMIT','PROVIDER_DAILY_BUDGET_BLOCKED','PROVIDER_BUDGET_BLOCKED'];throw Error(safe.includes(error?.message)?error.message:'GENERATION_LEDGER_UNAVAILABLE');}return data;};
 return Object.freeze({
  reserve:async(userId,jobId,key,credits,budget=null)=>{
   if(!enabled)throw Error('GENERATION_DISABLED');
   if(!Number.isSafeInteger(credits)||credits<1)throw Error('INVALID_CREDITS');
   const args={p_user:userId,p_job:jobId,p_key:key,p_credits:credits,p_enabled:true};
   const result=budget?await call('k4k_generation_reserve_budgeted',{...args,p_provider:budget.provider,p_quote_micros:budget.quoteMicros,p_daily_budget_micros:budget.dailyBudgetMicros,p_max_active:budget.maxActive}):await call('k4k_generation_reserve_checked',args);
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
