import test from 'node:test';
import assert from 'node:assert/strict';
import {createMultimodelOutputReconciler} from '../lib/server/multimodel-output-reconciler.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
const providerRequestId='request_abc';
const bytes=new Uint8Array(2048);
bytes.set([137,80,78,71,13,10,26,10],0);
bytes.set([73,72,68,82],12);
const job={id:jobId,user_id:userId,model:'flux3-t2i',status:'processing',media_kind:'image',provider_request_id:providerRequestId};
function harness({overrideJob={},providerStatus='completed',media={bytes,contentType:'image/png'},onIngest,onFinish}={}){
 const calls=[];
 const reconcile=createMultimodelOutputReconciler({
  enabled:true,
  getOwnedJob:async()=>({...job,...overrideJob}),
  getStatus:async()=>{calls.push('status');return {providerRequestId,status:providerStatus};},
  retrieveAuthenticatedBytes:async()=>{calls.push('retrieve');return media;},
  ingest:async()=>{calls.push('ingest');return onIngest?onIngest():{providerJobId:providerRequestId,outputPath:userId+'/'+jobId+'.png'};},
  ledger:{finish:async args=>{calls.push('settle');return onFinish?onFinish(args):{status:'settled'};}}
 });
 return {reconcile,calls};
}
test('completed authenticated PNG is ingested then settled exactly once',async()=>{
 const h=harness();
 const result=await h.reconcile({userId,jobId});
 assert.deepEqual(result,{status:'completed',jobId,outputPath:userId+'/'+jobId+'.png'});
 assert.deepEqual(h.calls,['status','retrieve','ingest','settle']);
});
test('pending and confirmed provider failure do not settle or refund automatically',async()=>{
 for(const status of ['queued','processing','failed']){
  const h=harness({providerStatus:status});
  const result=await h.reconcile({userId,jobId});
  assert.equal(result.status,status==='failed'?'provider_failed_review_required':'pending');
  assert.deepEqual(h.calls,['status']);
 }
});
test('job ownership, provider identity and terminal local state never use provider network',async()=>{
 for(const changes of [{user_id:'33333333-3333-4333-8333-333333333333'},{provider_request_id:null},{status:'queued'}]){
  const h=harness({overrideJob:changes});
  await assert.rejects(h.reconcile({userId,jobId}));
  assert.equal(h.calls.length,0);
 }
});
test('mismatched media or corrupt signature cannot upload or settle',async()=>{
 for(const media of [{contentType:'video/mp4',bytes},{contentType:'image/png',bytes:new Uint8Array(2048)}]){
  const h=harness({media});
  await assert.rejects(h.reconcile({userId,jobId}));
  assert.deepEqual(h.calls,['status','retrieve']);
 }
});
test('ingestion/settlement errors remain uncertain without automatic refund',async()=>{
 const badStore=harness({onIngest:()=>{throw Error('storage network timeout');}});
 await assert.rejects(badStore.reconcile({userId,jobId}),/OUTPUT_INGESTION_REQUIRES_RECONCILIATION/);
 assert.deepEqual(badStore.calls,['status','retrieve','ingest']);
 const badSettle=harness({onFinish:()=>{throw Error('database timeout');}});
 await assert.rejects(badSettle.reconcile({userId,jobId}),/OUTPUT_SETTLEMENT_REQUIRES_RECONCILIATION/);
 assert.deepEqual(badSettle.calls,['status','retrieve','ingest','settle']);
});
test('disabled reconciler never makes external calls',async()=>{
 let calls=0;
 const reconcile=createMultimodelOutputReconciler({getOwnedJob:async()=>{calls++;},enabled:false});
 await assert.rejects(reconcile({userId,jobId}),/MULTIMODEL_RECONCILIATION_DISABLED/);
 assert.equal(calls,0);
});
