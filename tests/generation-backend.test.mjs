import test from 'node:test';
import assert from 'node:assert/strict';
import {mp4DurationSeconds} from '../lib/server/mp4-duration.mjs';
import {createGuardedGenerationLedger} from '../lib/server/guarded-generation-ledger.mjs';
function box(type,payload){const b=Buffer.alloc(payload.length+8);b.writeUInt32BE(b.length,0);b.write(type,4);payload.copy(b,8);return b;}
function sample(seconds){const h=Buffer.alloc(20);h.writeUInt32BE(1000,12);h.writeUInt32BE(seconds*1000,16);return Buffer.concat([box('ftyp',Buffer.from('isom0000')),box('moov',box('mvhd',h))]);}
test('reads movie duration from MP4 header',()=>assert.equal(mp4DurationSeconds(sample(12)),12));
test('rejects truncated MP4 and zero duration',()=>{assert.throws(()=>mp4DurationSeconds(Buffer.from('bad')));assert.throws(()=>mp4DurationSeconds(sample(0)));});
test('reservation and settlement are disabled by default',async()=>{
 let calls=0;const client={rpc:async()=>{calls++;return {data:{}}}};
 const store=createGuardedGenerationLedger(client);
 await assert.rejects(()=>store.reserve('u','j','k',10),/GENERATION_DISABLED/);
 await assert.rejects(()=>store.finish('u','j','failed'),/GENERATION_DISABLED/);
 assert.equal(calls,0);
});
test('enabled adapter calls atomic reserve and refund RPC with correct arguments',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{status:'ok'}}}};
 const store=createGuardedGenerationLedger(client,{enabled:true});
 await store.reserve('user','job','key',7);
 await store.finish('user','job','failed');
 assert.equal(calls[0].name,'k4k_generation_reserve_draft');
 assert.deepEqual(calls[0].args,{p_user:'user',p_job:'job',p_key:'key',p_credits:7,p_enabled:true});
 assert.equal(calls[1].name,'k4k_generation_finish');
 assert.equal(calls[1].args.p_outcome,'failed');
});
