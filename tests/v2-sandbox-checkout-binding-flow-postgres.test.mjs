import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createV2SandboxCheckoutBindingFlow} from '../lib/server/v2-sandbox-checkout-binding-flow.mjs';
import {V2_SANDBOX_PRICE_CONTRACTS as prices} from '../lib/server/v2-sandbox-catalog.mjs';

const owner='11111111-1111-4111-8111-111111111111';
const stranger='22222222-2222-4222-8222-222222222222';
const env={VERCEL_ENV:'preview',K4K_V2_SANDBOX_ADAPTER_ENABLED:'true',K4K_V2_SANDBOX_PROJECT_ISOLATED:'true'};
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 insert into auth.users(id) values('${owner}'),('${stranger}');
 grant usage on schema public to service_role;`);
 await db.exec(readFileSync(new URL('../db/proposals/k4k-v2-sandbox-checkout-bindings.sql',import.meta.url),'utf8'));
 await db.exec('set role service_role');
 const get=async sessionId=>{
  const r=await db.query('select user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id from public.k4k_v2_checkout_bindings where session_key=$1',[sessionId]);
  if(!r.rows.length)return null;
  const x=r.rows[0];
  return {sessionId:x.stripe_session_id,userId:x.user_id,kind:x.kind,status:x.status,priceId:x.price_id,customerId:x.stripe_customer_id,subscriptionId:x.stripe_subscription_id};
 };
 const gateway={
  async findSessionBinding(sessionId){return get(sessionId);},
  async insertPendingBinding({sessionId,userId,kind,status,priceId,customerId,subscriptionId}){
   await db.query(`insert into public.k4k_v2_checkout_bindings(session_key,user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id)
      values($1,$2,$3,$4,$5,$6,$7,$1)`,[sessionId,userId,kind,status,priceId,customerId,subscriptionId]);
   return get(sessionId);
  },
  async activatePendingBinding({sessionId,userId,kind,priceId,customerId,subscriptionId}){
   const r=await db.query(`update public.k4k_v2_checkout_bindings
     set status='active',stripe_subscription_id=$6
     where session_key=$1 and user_id=$2 and kind=$3 and price_id=$4
     and stripe_customer_id=$5 and status='pending' returning session_key`,[
     sessionId,userId,kind,priceId,customerId,subscriptionId]);
   return r.rows.length?get(sessionId):null;
  }
 };
 return {db,gateway};
}
const starter=()=>{
 const p=prices.starterGBP;
 return {id:'cs_test_starter_123456789',livemode:false,mode:'subscription',
  status:'open',payment_status:'unpaid',currency:'gbp',
  customer:'cus_test_1234567890',client_reference_id:owner,subscription:null,
  amount_subtotal:p.amountMinor,amount_total:p.amountMinor,
  metadata:{kind:'k4k_v2_subscription',credit_version:'v2',user_id:owner},
  line_items:{data:[{price:{id:p.priceId},quantity:1}]}
 };
};
const single=()=>{
 const p=prices.singleGBP;
 return {id:'cs_test_single_123456789',livemode:false,mode:'payment',
  status:'open',payment_status:'unpaid',currency:'gbp',
  customer:'cus_test_5555555555',client_reference_id:owner,subscription:null,
  amount_subtotal:p.amountMinor,amount_total:p.amountMinor,
  metadata:{kind:'k4k_v2_single_video',credit_version:'v2',user_id:owner,product_id:p.productId},
  line_items:{data:[{price:{id:p.priceId},quantity:1}]}
 };
};
test('pending subscription records before Stripe assigns a subscription; activates only after verified paid session',async()=>{
 const {db,gateway}=await fixture();try{
  let liveSession=starter();
  const flow=createV2SandboxCheckoutBindingFlow({gateway,env,stripe:{getSession:async()=>liveSession}});
  const pending=await flow.recordPendingSession({sessionId:liveSession.id,verifiedUserId:owner});
  assert.equal(pending.status,'pending');assert.equal(pending.subscriptionId,null);
  await assert.rejects(flow.activatePaidSession({sessionId:liveSession.id}),/V2_TEST_SESSION_NOT_PAID/);
  liveSession={...liveSession,status:'complete',payment_status:'paid',subscription:'sub_test_verified12345678'};
  const active=await flow.activatePaidSession({sessionId:liveSession.id});
  assert.equal(active.status,'active');assert.equal(active.subscriptionId,liveSession.subscription);
  const duplicate=await flow.activatePaidSession({sessionId:liveSession.id});
  assert.equal(duplicate.duplicate,true);
 }finally{await db.close()}
});
test('single video session becomes active only after actual paid status; no subscription created',async()=>{
 const {db,gateway}=await fixture();try{
  let liveSession=single();
  const flow=createV2SandboxCheckoutBindingFlow({gateway,env,stripe:{getSession:async()=>liveSession}});
  assert.equal((await flow.recordPendingSession({sessionId:liveSession.id,verifiedUserId:owner})).status,'pending');
  liveSession={...liveSession,status:'complete',payment_status:'paid'};
  const result=await flow.activatePaidSession({sessionId:liveSession.id});
  assert.equal(result.subscriptionId,null);assert.equal(result.kind,'single_video');
  assert.equal(result.status,'active');
 }finally{await db.close()}
});
test('cross-owner, wrong Stripe price and production environment are rejected',async()=>{
 const {db,gateway}=await fixture();try{
  const original=starter();
  const flow=createV2SandboxCheckoutBindingFlow({gateway,env,stripe:{getSession:async()=>original}});
  await assert.rejects(flow.recordPendingSession({sessionId:original.id,verifiedUserId:stranger}),/V2_TEST_CHECKOUT_OWNER_MISMATCH/);
  assert.equal((await db.query('select count(*)::int as n from public.k4k_v2_checkout_bindings')).rows[0].n,0);
  const wrong={...original,line_items:{data:[{price:{id:'price_not_whitelisted'},quantity:1}]}};
  const invalid=createV2SandboxCheckoutBindingFlow({gateway,env,stripe:{getSession:async()=>wrong}});
  await assert.rejects(invalid.recordPendingSession({sessionId:original.id,verifiedUserId:owner}),/V2_TEST_CHECKOUT_PRICE_INVALID/);
  assert.throws(()=>createV2SandboxCheckoutBindingFlow({gateway,env:{...env,VERCEL_ENV:'production'},stripe:{getSession:async()=>original}}),/V2_SANDBOX_ONLY/);
 }finally{await db.close()}
});
test('an active Stripe session cannot be relinked to a second user or subscription',async()=>{
 const {db,gateway}=await fixture();try{
  let session=starter();
  const flow=createV2SandboxCheckoutBindingFlow({gateway,env,stripe:{getSession:async()=>session}});
  await flow.recordPendingSession({sessionId:session.id,verifiedUserId:owner});
  session={...session,status:'complete',payment_status:'paid',subscription:'sub_test_verified12345678'};
  await flow.activatePaidSession({sessionId:session.id});
  session={...session,subscription:'sub_test_different12345678'};
  await assert.rejects(flow.activatePaidSession({sessionId:session.id}),/V2_TEST_BINDING_REPLAY_CONFLICT/);
  session={...session,client_reference_id:stranger};
  await assert.rejects(flow.activatePaidSession({sessionId:session.id}),/V2_TEST_CHECKOUT_BINDING_CONFLICT/);
 }finally{await db.close()}
});
test('non-service callers cannot write or inspect checkout binding ownership',async()=>{
 const {db}=await fixture();try{
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select user_id from public.k4k_v2_checkout_bindings'),/permission denied/);
  await assert.rejects(db.query(`insert into public.k4k_v2_checkout_bindings(session_key,user_id,kind,status,price_id,stripe_customer_id,stripe_session_id)
   values('cs_test_forbidden12345','${owner}','single_video','pending','price_fake1','cus_123456789','cs_test_forbidden12345')`),/permission denied/);
 }finally{await db.close()}
});
