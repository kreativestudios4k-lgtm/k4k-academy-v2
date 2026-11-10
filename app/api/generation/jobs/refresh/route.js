import {generationContext,generationError} from '../../../../../lib/server/generation-route-context.mjs';
import {createHiggsfieldRest} from '../../../../../lib/server/higgsfield-rest.mjs';
import {createGenerationCompletion} from '../../../../../lib/server/generation-completion.mjs';
import {createGuardedGenerationLedger} from '../../../../../lib/server/guarded-generation-ledger.mjs';
import {createGenerationJobStore} from '../../../../../lib/server/generation-job-store.mjs';
import {createHiggsfieldOutputCollector} from '../../../../../lib/server/higgsfield-output-collector.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request){
 try{
  const {user,job,database}=await generationContext(request);
  if(process.env.VERCEL_ENV!=='preview')throw Error('GENERATION_DISABLED');
  if(!['queued','processing'].includes(job.status)||!job.provider_job_id)return Response.json({jobId:job.id,status:job.status},{headers:{'Cache-Control':'no-store'}});
  const status=await createHiggsfieldRest({credentials:process.env.HF_CREDENTIALS}).status(job.provider_job_id);
  if(['failed','nsfw','canceled'].includes(status.status)){
   const completion=createGenerationCompletion({ledger:createGuardedGenerationLedger(database,{enabled:true}),jobStore:createGenerationJobStore({client:database,enabled:true}),enabled:true,verifyOutput:async()=>false});
   await completion.settle({userId:user.id,jobId:job.id,providerJobId:job.provider_job_id,outcome:'failed'});
   return Response.json({jobId:job.id,status:'failed',creditsRefunded:true},{headers:{'Cache-Control':'no-store'}});
  }
  if(status.status==='completed'){
   const collect=createHiggsfieldOutputCollector({storage:database.storage,jobStore:createGenerationJobStore({client:database,enabled:true}),ledger:createGuardedGenerationLedger(database,{enabled:true}),enabled:true});
   await collect({userId:user.id,jobId:job.id,providerJobId:job.provider_job_id,status});
   return Response.json({jobId:job.id,status:'completed',outputReady:true},{headers:{'Cache-Control':'no-store'}});
  }
  return Response.json({jobId:job.id,status:status.status==='in_progress'?'processing':'queued',creditsRefunded:false},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return generationError(error)}
}
