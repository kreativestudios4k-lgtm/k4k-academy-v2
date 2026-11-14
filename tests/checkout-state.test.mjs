import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCheckoutState} from '../lib/checkout-state.mjs';
const ready={mode:'live',checkoutReady:true,topupsReady:false,ownerPilot:false};
const user={id:'user-a'};
const session={access_token:'test-fixture-token',user};
const fetchReady=async(url,options)=>{assert.equal(url,'/api/billing/readiness');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>ready}};
test('expired session does not conceal public checkout availability',async()=>{
 const result=await loadCheckoutState({auth:{getSession:async()=>{throw Error('refresh_token_not_found')}},fetchImpl:async(url,options)=>{assert.deepEqual(options.headers,{});return fetchReady(url,options)}});
 assert.deepEqual(result,{signedIn:false,billing:ready,readinessError:false});
});
test('authenticated customer passes verified bearer token to readiness',async()=>{
 const result=await loadCheckoutState({auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user}})},fetchImpl:async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer test-fixture-token');return fetchReady(url,options)}});
 assert.equal(result.signedIn,true);assert.equal(result.billing.checkoutReady,true);
});
test('invalid user or mismatched session does not send a stale token',async()=>{
 for(const u of [null,{id:'other'},{...user,is_anonymous:true}]){
  const result=await loadCheckoutState({auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:u}})},fetchImpl:async(url,options)=>{assert.deepEqual(options.headers,{});return fetchReady(url,options)}});
  assert.equal(result.signedIn,false);assert.equal(result.billing.checkoutReady,true);
 }
});
test('readiness network failure and malformed JSON are distinguished from actual closed checkout',async()=>{
 for(const fetchImpl of [async()=>{throw Error('offline')},async()=>({ok:true,json:async()=>({})})]){
  const result=await loadCheckoutState({auth:{getSession:async()=>({data:{session:null}})},fetchImpl});
  assert.equal(result.billing,null);assert.equal(result.readinessError,true);
 }
 const closed={mode:'live',checkoutReady:false,reason:'OWNER_LIVE_PILOT_ONLY'};
 const result=await loadCheckoutState({auth:{getSession:async()=>({data:{session:null}})},fetchImpl:async()=>({ok:true,json:async()=>closed})});
 assert.equal(result.readinessError,false);assert.deepEqual(result.billing,closed);
});
