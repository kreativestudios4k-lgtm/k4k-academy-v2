import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareManualPixCardSwitch} from '../lib/server/manual-pix-card-switch.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const claim={id:'22222222-2222-4222-8222-222222222222',user_id:userId,state:'reserved',stripe_session_id:'cs_live_unused12345'};
const original={id:claim.stripe_session_id,livemode:true,mode:'subscription',client_reference_id:userId,metadata:{k4k_launch_claim:claim.id},status:'open',payment_status:'unpaid',customer:null,subscription:null,payment_intent:null,setup_intent:null};
test('explicit Pix switch expires an unused card checkout before releasing its claim',async()=>{
 const calls=[];
 await prepareManualPixCardSwitch({claim,userId,readSession:async()=>{calls.push('read');return original},expireSession:async()=>{calls.push('expire');return {...original,status:'expired'}},releaseClaim:async()=>calls.push('release')});
 assert.deepEqual(calls,['read','expire','release']);
});
test('Pix switching never interrupts customer-bound, funded, in-flight or foreign checkouts',async()=>{
 for(const patch of [{customer:'cus_started'},{customer_account:'acct_started'},{subscription:'sub_started'},{payment_intent:'pi_started'},{setup_intent:'seti_started'},{payment_status:'paid'},{status:'complete'},{client_reference_id:'other'},{livemode:false}]){
  let mutations=0;
  await assert.rejects(prepareManualPixCardSwitch({claim,userId,readSession:async()=>({...original,...patch}),expireSession:async()=>{mutations++},releaseClaim:async()=>{mutations++}}));
  assert.equal(mutations,0);
 }
});
test('only confirmed terminal Stripe expiry releases capacity, and failures preserve the claim',async()=>{
 for(const expireSession of [async()=>original,async()=>{throw Error('network')},async()=>({...original,status:'expired',payment_status:'paid'})]){
  let released=false;
  await assert.rejects(prepareManualPixCardSwitch({claim,userId,readSession:async()=>original,expireSession,releaseClaim:async()=>{released=true}}));
  assert.equal(released,false);
 }
 let released=false;
 await prepareManualPixCardSwitch({claim,userId,readSession:async()=>({...original,status:'expired',customer:'cus_old'}),expireSession:async()=>{throw Error('must not call')},releaseClaim:async()=>{released=true}});
 assert.equal(released,true);
});
