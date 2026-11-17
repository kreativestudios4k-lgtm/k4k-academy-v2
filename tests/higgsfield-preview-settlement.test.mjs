import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiggsfieldPreviewSettlement} from '../lib/server/higgsfield-preview-settlement.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',rid='01a1e884-0fb7-70e0-bf45-b42cfd747410';
const row={id:jobId,user_id:userId,state:'submitted',provider_request_id:rid};
function fixture(status,outputReady=true){
 const seen=[];let settled=false;
 const adapter=createHiggsfieldPreviewSettlement({
  enabled:true,getOwnedJob:async()=>row,
  provider:{status:async id=>{seen.push(['status',id]);return {request_id:id,status};}},
  privateOutputReady:async v=>{seen.push(['output',v]);return outputReady;},
  ledger:{rpc:async(name,args)=>{seen.push(['rpc',name,args]);if(settled)return {data:{job_id:jobId,state:status==='completed'?'settled':'refunded',newly_finished:false},error:null};settled=true;return {data:{job_id:jobId,state:status==='completed'?'settled':'refunded',newly_finished:true},error:null};}}
 });return {adapter,seen};
}
test('completed status requires matching stored owner-scoped MP4 before settlement',async()=>{
 const {adapter,seen}=fixture('completed');
 assert.deepEqual(await adapter.reconcile({userId,jobId}),{state:'settled',changed:true});
 assert.equal(seen.length,3);
 assert.deepEqual(seen[1],['output',{userId,jobId,requestId:rid}]);
 assert.equal(seen[2][2].p_outcome,'completed');
});
test('failed, moderated and cancelled provider statuses refund once',async()=>{
 for(const status of ['failed','nsfw','canceled']){
  const {adapter,seen}=fixture(status);
  assert.equal((await adapter.reconcile({userId,jobId})).state,'refunded');
  assert.equal(seen.length,2);assert.equal(seen[1][2].p_outcome,'failed');
  assert.equal((await adapter.reconcile({userId,jobId})).changed,false);
 }
});
test('pending, unknown, provider mismatch and network failures never refund',async()=>{
 for(const status of ['queued','in_progress']){
  const {adapter,seen}=fixture(status);
  assert.equal((await adapter.reconcile({userId,jobId})).state,'pending');
  assert.equal(seen.length,1);
 }
 const bad=createHiggsfieldPreviewSettlement({enabled:true,getOwnedJob:async()=>row,
  provider:{status:async()=>({request_id:'wrong',status:'failed'})},
  ledger:{rpc:async()=>{throw Error('SHOULD_NOT_SETTLE')}},
  privateOutputReady:async()=>true});
 await assert.rejects(bad.reconcile({userId,jobId}),/PROVIDER_STATUS_UNVERIFIED/);
 const offline=createHiggsfieldPreviewSettlement({enabled:true,getOwnedJob:async()=>row,
  provider:{status:async()=>{throw Error('NETWORK_FAILURE')}},
  ledger:{rpc:async()=>{throw Error('SHOULD_NOT_SETTLE')}},
  privateOutputReady:async()=>true});
 await assert.rejects(offline.reconcile({userId,jobId}),/NETWORK_FAILURE/);
});
test('completion without verified private output leaves reservation intact',async()=>{
 const {adapter,seen}=fixture('completed',false);
 await assert.rejects(adapter.reconcile({userId,jobId}),/OUTPUT_NOT_SAFELY_STORED/);
 assert.equal(seen.length,2);
});
test('owner mismatch, missing provider id, disabled switch reject before paid state mutation',async()=>{
 const base={getOwnedJob:async()=>({...row,user_id:'44444444-4444-4444-8444-444444444444'}),
 provider:{status:async()=>{throw Error('SHOULD_NOT_CALL')}},
 ledger:{rpc:async()=>{throw Error('SHOULD_NOT_CALL')}},
 privateOutputReady:async()=>{throw Error('SHOULD_NOT_CALL')}};
 await assert.rejects(createHiggsfieldPreviewSettlement({...base,enabled:true}).reconcile({userId,jobId}),/JOB_NOT_FOUND/);
 await assert.rejects(createHiggsfieldPreviewSettlement({...base,enabled:false}).reconcile({userId,jobId}),/HIGGSFIELD_PREVIEW_SETTLEMENT_DISABLED/);
});
