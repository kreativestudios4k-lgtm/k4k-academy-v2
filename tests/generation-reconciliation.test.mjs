import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationReconciliation} from '../lib/server/generation-reconciliation.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222';
function make(job,providerStatus){
 let queried=0;const reconciler=createGenerationReconciliation({enabled:true,jobStore:{getOwnedJob:async()=>job},providerStatus:async id=>{queried++;return providerStatus?.(id)}});
 return {reconciler,get queried(){return queried}};
}
test('reconciliation disabled by default',async()=>{
 await assert.rejects(createGenerationReconciliation().inspect({userId,jobId}),/RECONCILIATION_DISABLED/);
});
test('ambiguous queued job requires manual review without provider call',async()=>{
 const s=make({status:'queued',provider_job_id:null});
 assert.deepEqual(await s.reconciler.inspect({userId,jobId}),{action:'manual_review',reason:'PROVIDER_SUBMISSION_AMBIGUOUS'});assert.equal(s.queried,0);
});
test('processing provider state waits rather than retrying',async()=>{
 const s=make({status:'processing',provider_job_id:'mock-1'},()=>({status:'processing'}));
 assert.deepEqual(await s.reconciler.inspect({userId,jobId}),{action:'wait',providerJobId:'mock-1'});assert.equal(s.queried,1);
});
test('completed provider state requests verification, never direct settlement',async()=>{
 const s=make({status:'processing',provider_job_id:'mock-1'},()=>({status:'completed'}));
 assert.equal((await s.reconciler.inspect({userId,jobId})).action,'verify_and_settle');
});
test('failed provider state requires verified failure before refund',async()=>{
 const s=make({status:'processing',provider_job_id:'mock-1'},()=>({status:'failed'}));
 assert.equal((await s.reconciler.inspect({userId,jobId})).action,'verify_failure_then_refund');
});
test('terminal job never queries provider',async()=>{
 const s=make({status:'completed',provider_job_id:'mock-1'});
 assert.deepEqual(await s.reconciler.inspect({userId,jobId}),{action:'terminal',status:'completed'});assert.equal(s.queried,0);
});
test('unknown provider result is held for manual review',async()=>{
 const s=make({status:'processing',provider_job_id:'mock-1'},()=>({status:'unexpected'}));
 assert.equal((await s.reconciler.inspect({userId,jobId})).action,'manual_review');
});
