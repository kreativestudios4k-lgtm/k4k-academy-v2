import test from 'node:test';
import assert from 'node:assert/strict';
import {createAcademyBonusStore} from '../lib/server/academy-bonus-store.mjs';
test('bonus adapter calls only approved service RPCs with owned job arguments',async()=>{
 const calls=[];
 const store=createAcademyBonusStore({rpc:async(name,args)=>{calls.push({name,args});return {data:name==='k4k_bonus_reserve'?true:'released',error:null}}});
 assert.equal(await store.reserve('user-1','job-1'),true);
 assert.equal(await store.settle('user-1','job-1'),'released');
 assert.deepEqual(calls,[{name:'k4k_bonus_reserve',args:{p_user:'user-1',p_job:'job-1'}},{name:'k4k_bonus_settle',args:{p_user:'user-1',p_job:'job-1'}}]);
});
test('bonus adapter fails closed on errors or missing identifiers',async()=>{
 const store=createAcademyBonusStore({rpc:async()=>({data:null,error:{message:'fail'}})});
 await assert.rejects(store.reserve('','job'));
 await assert.rejects(store.reserve('user','job'),/unavailable/);
});
