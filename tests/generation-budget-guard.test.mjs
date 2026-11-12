import test from 'node:test';
import assert from 'node:assert/strict';
import {generationBudgetPolicy} from '../lib/server/generation-submit-service.mjs';
import {createGuardedGenerationLedger} from '../lib/server/guarded-generation-ledger.mjs';
import {reconcileGenerationJob} from '../lib/server/generation-reconcile-service.mjs';

test('production submissions fail closed without the budget guard',()=>{
 assert.throws(()=>generationBudgetPolicy({VERCEL_ENV:'production'},'fal',0.25),/GENERATION_BUDGET_GUARD_REQUIRED/);
 assert.equal(generationBudgetPolicy({VERCEL_ENV:'preview'},'fal',0.25),null);
});
test('budget policy requires valid limits and converts USD to integer micros',()=>{
 const env={VERCEL_ENV:'preview',K4K_GENERATION_BUDGET_GUARD_ENABLED:'true',K4K_PROVIDER_DAILY_BUDGET_USD:'15',K4K_MAX_ACTIVE_JOBS_PER_USER:'2'};
 assert.deepEqual(generationBudgetPolicy(env,'fal',0.25),{provider:'fal',quoteMicros:250000,dailyBudgetMicros:15000000,maxActive:2});
 assert.throws(()=>generationBudgetPolicy({...env,K4K_MAX_ACTIVE_JOBS_PER_USER:'0'},'fal',0.25),/PROVIDER_BUDGET_BLOCKED/);
 assert.throws(()=>generationBudgetPolicy(env,'fal',16),/PROVIDER_BUDGET_BLOCKED/);
});
test('budget-enabled ledger uses only the transactional budgeted RPC',async()=>{
 const calls=[];
 const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{newly_reserved:false,status:'reserved'}}}};
 const ledger=createGuardedGenerationLedger(client,{enabled:true});
 const budget={provider:'fal',quoteMicros:250000,dailyBudgetMicros:15000000,maxActive:2};
 const result=await ledger.reserve('u','j','k',5,budget);
 assert.equal(result.newlyReserved,false);
 assert.equal(calls.length,1);
 assert.equal(calls[0].name,'k4k_generation_reserve_budgeted');
 assert.equal(calls[0].args.p_quote_micros,250000);
 assert.equal(calls[0].args.p_max_active,2);
});
test('unknown provider request is flagged without contacting a provider',async()=>{
 const result=await reconcileGenerationJob({job:{id:'j',user_id:'u',status:'queued',provider_job_id:null},provider:{status:async()=>{throw Error('must not call')}}});
 assert.equal(result.reconciliationRequired,true);
 assert.equal(result.reason,'PROVIDER_REQUEST_ID_MISSING');
});
test('provider ID mismatch cannot settle or refund',async()=>{
 await assert.rejects(reconcileGenerationJob({job:{id:'j',user_id:'u',status:'processing',provider_job_id:'p'},provider:{status:async()=>({request_id:'other',status:'failed'})},ledger:{finish:async()=>{throw Error('must not settle')}}}),/PROVIDER_RESPONSE_INVALID/);
});
