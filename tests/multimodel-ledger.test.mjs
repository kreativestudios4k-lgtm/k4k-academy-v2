import test from 'node:test';
import assert from 'node:assert/strict';
import {createMultimodelLedger} from '../lib/server/multimodel-ledger.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',requestKey='33333333-3333-4333-8333-333333333333';
const inputFingerprint='a'.repeat(64);
const args={userId,jobId,requestKey,inputFingerprint,quoteMicros:470000,credits:5,dailyBudgetMicros:100000000,totalBudgetMicros:200000000,maxActive:1};
test('disabled ledger cannot access RPC',async()=>{
 let calls=0;
 const ledger=createMultimodelLedger({client:{rpc:async()=>{calls++;return {data:{}};}}});
 await assert.rejects(ledger.reserve(args),/MULTIMODEL_LEDGER_DISABLED/);
 assert.equal(calls,0);
});
test('reservation passes only validated data to the atomic server RPC',async()=>{
 let name,params;
 const ledger=createMultimodelLedger({enabled:true,client:{rpc:async(n,p)=>{name=n;params=p;return {data:{job_id:jobId,status:'reserved',credits:5,newly_reserved:true}};}}});
 const result=await ledger.reserve(args);
 assert.equal(name,'k4k_multimodel_reserve_live');
 assert.equal(params.p_fingerprint,inputFingerprint);
 assert.equal(params.p_enabled,true);
 assert.deepEqual(result,{jobId,status:'reserved',newlyReserved:true,credits:5});
});
test('invalid or unsupported reserve does not invoke any RPC',async()=>{
 let calls=0;
 const ledger=createMultimodelLedger({enabled:true,client:{rpc:async()=>{calls++;return {data:{}};}}});
 await assert.rejects(ledger.reserve({...args,quoteMicros:NaN}),/INVALID_RESERVATION/);
 await assert.rejects(ledger.reserve({...args,requestKey:'bad'}),/INVALID_RESERVATION/);
 assert.equal(calls,0);
});
test('completion and refunds use exact RPC and reject corrupt responses',async()=>{
 const calls=[];
 const client={rpc:async(name,p)=>{calls.push({name,p});return {data:{job_id:jobId,status:'refunded',newly_finished:false}};}};
 const ledger=createMultimodelLedger({enabled:true,client});
 const result=await ledger.finish({userId,jobId,outcome:'failed'});
 assert.equal(result.status,'refunded');
 assert.equal(result.newlyFinished,false);
 assert.equal(calls[0].name,'k4k_multimodel_finish_live');
 await assert.rejects(ledger.finish({userId,jobId,outcome:'failed',contentType:'image/png'}),/INVALID_OUTPUT/);
 assert.equal(calls.length,1);
 const malformed=createMultimodelLedger({enabled:true,client:{rpc:async()=>({data:{job_id:jobId,status:'reserved',newly_finished:true}})}});
 await assert.rejects(malformed.finish({userId,jobId,outcome:'failed'}),/MULTIMODEL_LEDGER_RESPONSE_INVALID/);
});
