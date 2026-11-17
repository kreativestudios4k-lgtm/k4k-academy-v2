// Server-only RPC adapter for the isolated multimodel ledger.
// Deliberately not connected to customer routes or provider dispatch.
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const fingerprint=/^[0-9a-f]{64}$/;
const allowedErrors=new Set(['GENERATION_DISABLED','QUOTE_CHANGED','IDEMPOTENCY_CONFLICT','INVALID_RESERVATION','ACTIVE_JOB_LIMIT','PROVIDER_DAILY_BUDGET_BLOCKED','PROVIDER_TOTAL_BUDGET_BLOCKED','PROVIDER_BUDGET_BLOCKED','BILLING_REVIEW_REQUIRED','INSUFFICIENT_CREDITS','INVALID_JOB_STATE','INVALID_OUTPUT','PROVIDER_NOT_RECORDED','RESERVATION_NOT_FOUND']);
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function checkEnabled(enabled){if(!enabled)throw Error('MULTIMODEL_LEDGER_DISABLED');}
async function rpc(client,name,args){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 if(!client?.rpc)throw Error('MULTIMODEL_LEDGER_UNAVAILABLE');
 const {data,error}=await client.rpc(name,args);
 if(error)throw Error(allowedErrors.has(error.message)?error.message:'MULTIMODEL_LEDGER_UNAVAILABLE');
 if(!data||data.job_id!==args.p_job||typeof data.status!=='string')throw Error('MULTIMODEL_LEDGER_RESPONSE_INVALID');
 return data;
}
export function createMultimodelLedger({client,enabled=false}={}){
 return Object.freeze({
  async reserve({userId,jobId,requestKey,inputFingerprint,quoteMicros,credits,dailyBudgetMicros,totalBudgetMicros,maxActive}={}){
   checkEnabled(enabled);
   if(!uuid.test(userId??'')||!uuid.test(jobId??'')||!uuid.test(requestKey??'')||!fingerprint.test(inputFingerprint??'')
    ||!integer(quoteMicros,1,5000000)||!integer(credits,1,10000)
    ||!integer(dailyBudgetMicros,1,100000000000)||!integer(totalBudgetMicros,1,100000000000)
    ||!integer(maxActive,1,10))throw Error('INVALID_RESERVATION');
   const result=await rpc(client,'k4k_multimodel_reserve_live',{
    p_user:userId,p_job:jobId,p_key:requestKey,p_fingerprint:inputFingerprint,
    p_quote_micros:quoteMicros,p_credits:credits,p_enabled:true,
    p_daily_budget_micros:dailyBudgetMicros,p_total_budget_micros:totalBudgetMicros,p_max_active:maxActive
   });
   if(typeof result.newly_reserved!=='boolean'||!integer(result.credits,1,10000))
    throw Error('MULTIMODEL_LEDGER_RESPONSE_INVALID');
   return Object.freeze({jobId,status:result.status,newlyReserved:result.newly_reserved,credits:result.credits});
  },
  async finish({userId,jobId,outcome,contentType=null,outputPath=null}={}){
   checkEnabled(enabled);
   if(!uuid.test(userId??'')||!uuid.test(jobId??'')||!['completed','failed'].includes(outcome))
    throw Error('INVALID_OUTCOME');
   if(outcome==='failed'&&(contentType!==null||outputPath!==null))throw Error('INVALID_OUTPUT');
   if(outcome==='completed'&&(!['video/mp4','image/png','image/jpeg'].includes(contentType)||typeof outputPath!=='string'))
    throw Error('INVALID_OUTPUT');
   const result=await rpc(client,'k4k_multimodel_finish_live',{
    p_user:userId,p_job:jobId,p_outcome:outcome,p_output_mime:contentType,p_output_path:outputPath
   });
   if(typeof result.newly_finished!=='boolean'||!['settled','refunded'].includes(result.status))
    throw Error('MULTIMODEL_LEDGER_RESPONSE_INVALID');
   return Object.freeze({jobId,status:result.status,newlyFinished:result.newly_finished});
  }
 });
}
