import {createGenerationProvider} from './generation-provider.mjs';
import {createGenerationCompletion} from './generation-completion.mjs';
import {createGuardedGenerationLedger} from './guarded-generation-ledger.mjs';
import {createGenerationJobStore} from './generation-job-store.mjs';
import {createHiggsfieldOutputCollector} from './higgsfield-output-collector.mjs';

// Only an authenticated server-side caller can supply an owned database job.
// The provider's actual response, not an operator or browser-provided outcome,
// determines whether to settle or refund. No generation is submitted here.
export async function reconcileGenerationJob({database,job,provider,ledger,jobStore,collector}){
 const {id:jobId,user_id:userId,provider_job_id:providerJobId}=job;
 if(!['queued','processing'].includes(job.status))return {jobId,status:job.status};
 if(job.provider==='higgsfield')return {jobId,status:job.status,reconciliationRequired:true,reason:'LEGACY_PROVIDER_RETIRED'};
 if(!providerJobId)return {jobId,status:job.status,reconciliationRequired:true,reason:'PROVIDER_REQUEST_ID_MISSING'};
 const providerClient=provider||createGenerationProvider(job);
 const verified=await providerClient.status(providerJobId);
 if(verified?.request_id!==providerJobId)throw Error('PROVIDER_RESPONSE_INVALID');
 const creditLedger=ledger||createGuardedGenerationLedger(database,{enabled:true});
 const store=jobStore||createGenerationJobStore({client:database,enabled:true});
 if(['failed','nsfw','canceled'].includes(verified.status)){
  const completion=createGenerationCompletion({ledger:creditLedger,jobStore:store,enabled:true,verifyOutput:async()=>false});
  let settled;
  try{settled=await completion.settle({userId,jobId,providerJobId,outcome:'failed'})}
  catch(error){
   // A second status check may arrive after the first one settled the job.
   const latest=await store.getOwnedJob(userId,jobId);
   if(latest?.provider_job_id===providerJobId&&['failed','completed','cancelled'].includes(latest.status))return {jobId,status:latest.status,replayed:true};
   throw error;
  }
  if(settled?.status!=='refunded')throw Error('PROVIDER_RECORDING_REQUIRES_RECONCILIATION');
  return {jobId,status:'failed',creditsRefunded:true};
 }
 if(verified.status==='completed'){
  const collect=collector||createHiggsfieldOutputCollector({storage:database.storage,jobStore:store,ledger:creditLedger,enabled:true,allowedHosts:['v3b.fal.media','v3.fal.media','fal.media']});
  await collect({userId,jobId,providerJobId,status:verified});
  return {jobId,status:'completed',outputReady:true};
 }
 if(!['queued','in_progress'].includes(verified.status))throw Error('PROVIDER_RESPONSE_INVALID');
 return {jobId,status:verified.status==='in_progress'?'processing':'queued',creditsRefunded:false};
}
