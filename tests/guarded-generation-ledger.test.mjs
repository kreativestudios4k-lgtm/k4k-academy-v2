import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardedGenerationLedger} from '../lib/server/guarded-generation-ledger.mjs';
const user='11111111-1111-4111-8111-111111111111';
const job='22222222-2222-4222-8222-222222222222';
const key='33333333-3333-4333-8333-333333333333';
test('reservation and completion are disabled by default without any RPC',async()=>{
 const calls=[];const ledger=createGuardedGenerationLedger({rpc:async(...args)=>{calls.push(args);return {data:{ok:true,newly_reserved:true},error:null}}});
 await assert.rejects(ledger.reserve(user,job,key,10),/GENERATION_DISABLED/);
 await assert.rejects(ledger.finish(user,job,'failed'),/GENERATION_DISABLED/);
 assert.equal(calls.length,0);
});
test('enabled adapter calls only the guarded transactional RPC with idempotency key',async()=>{
 const calls=[];const ledger=createGuardedGenerationLedger({rpc:async(name,args)=>{calls.push({name,args});return {data:{ok:true},error:null}}},{enabled:true});
 await ledger.reserve(user,job,key,12);
 await ledger.finish(user,job,'failed');
 assert.deepEqual(calls,[{name:'k4k_generation_reserve_draft',args:{p_user:user,p_job:job,p_key:key,p_credits:12,p_enabled:true}},{name:'k4k_generation_finish',args:{p_user:user,p_job:job,p_outcome:'failed',p_output_path:null}}]);
});
test('invalid credits and outcomes fail before RPC',async()=>{
 let calls=0;const ledger=createGuardedGenerationLedger({rpc:async()=>{calls++;return {data:{},error:null}}},{enabled:true});
 for(const value of [0,-1,1.5,NaN,Infinity])await assert.rejects(ledger.reserve(user,job,key,value),/INVALID_CREDITS/);
 await assert.rejects(ledger.finish(user,job,'pending'),/INVALID_OUTCOME/);
 assert.equal(calls,0);
});
test('database errors fail closed',async()=>{
 const ledger=createGuardedGenerationLedger({rpc:async()=>({data:null,error:{message:'failure'}})},{enabled:true});
 await assert.rejects(ledger.reserve(user,job,key,1),/GENERATION_LEDGER_UNAVAILABLE/);
});

test('new reservation flag maps to lifecycle contract and retry stays false',async()=>{
 let newReservation=true;
 const ledger=createGuardedGenerationLedger({rpc:async()=>({data:{newly_reserved:newReservation,status:'reserved'},error:null})},{enabled:true});
 assert.equal((await ledger.reserve(user,job,key,2)).newlyReserved,true);
 newReservation=false;
 assert.equal((await ledger.reserve(user,job,key,2)).newlyReserved,false);
});
test('missing reservation idempotency contract fails closed',async()=>{
 const ledger=createGuardedGenerationLedger({rpc:async()=>({data:{status:'reserved'},error:null})},{enabled:true});
 await assert.rejects(ledger.reserve(user,job,key,2),/RESERVATION_CONTRACT_INVALID/);
});
