import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createV2SandboxCheckoutBindingFlow} from '../lib/server/v2-sandbox-checkout-binding-flow.mjs';
import {V2_SANDBOX_PRICE_CONTRACTS as prices} from '../lib/server/v2-sandbox-catalog.mjs';

const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const env={VERCEL_ENV:'preview',K4K_V2_SANDBOX_ADAPTER_ENABLED:'true',
 K4K_V2_SANDBOX_PROJECT_ISOLATED:'true'};
const getSQL=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const session=(kind='subscription')=>{
 const p=kind==='subscription'?prices.starterGBP:prices.singleGBP;
 return {id:kind==='subscription'?'cs_test_pending_sub_123456789':'cs_test_pending_single_123456789',
  livemode:false,mode:kind==='subscription'?'subscription':'payment',
  status:'open',payment_status:'unpaid',currency:p.currency.toLowerCase(),
  customer:'cus_test_expiry123456789',client_reference_id:owner,subscription:null,
  amount_subtotal:p.amountMinor,amount_total:p.amountMinor,
  metadata:{credit_version:'v2',user_id:owner,
    kind:kind==='subscription'?'k4k_v2_subscription':'k4k_v2_single_video',
    ...(kind==='subscription'?{}:{product_id:p.productId})},
  line_items:{data:[{price:{id:p.priceId},quantity:1}]}
 };
};
async function setup(){
 const pg=new PGlite();
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 insert into auth.users(id) values ('${owner}'),('${other}');
 grant usage on schema public to service_role;`);
 await pg.exec(getSQL('../db/proposals/k4k-v2-sandbox-checkout-bindings.sql'));
 await pg.exec(getSQL('../db/proposals/k4k-v2-sandbox-checkout-expiry.sql'));
 await pg.exec('set role service_role');
 let writes=0;
 async function get(sessionId){
  const x=(await pg.query('select * from public.k4k_v2_checkout_bindings where session_key=$1',[sessionId])).rows[0];
  return x?{sessionId:x.stripe_session_id,userId:x.user_id,kind:x.kind,status:x.status,
   priceId:x.price_id,customerId:x.stripe_customer_id,subscriptionId:x.stripe_subscription_id}:null;
 }
 const gateway={
  findSessionBinding:get,
  async insertPendingBinding(x){
   await pg.query(`insert into public.k4k_v2_checkout_bindings
   (session_key,stripe_session_id,user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id)
   values ($1,$1,$2,$3,'pending',$4,$5,null)`,[
    x.sessionId,x.userId,x.kind,x.priceId,x.customerId
   ]);
   return get(x.sessionId);
  },
  async activatePendingBinding(x){
   const r=await pg.query(`update public.k4k_v2_checkout_bindings
   set status='active',stripe_subscription_id=$3
   where session_key=$1 and status='pending' and user_id=$2 returning session_key`,[
    x.sessionId,x.userId,x.subscriptionId
   ]);
   return r.rows.length?get(x.sessionId):null;
  },
  async expirePendingBinding(x){
   const r=await pg.query(`update public.k4k_v2_checkout_bindings
   set status='expired'
   where session_key=$1 and user_id=$2 and kind=$3 and price_id=$4
    and stripe_customer_id=$5 and status='pending'
    and stripe_subscription_id is null returning session_key`,[
    x.sessionId,x.userId,x.kind,x.priceId,x.customerId
   ]);
   if(!r.rows.length)throw Error('V2_TEST_EXPIRED_BINDING_UPDATE_FAILED');
   writes++;
   return get(x.sessionId);
  }
 };
 return {pg,gateway,get,writes:()=>writes};
}
test('expired unpaid subscription closes only pending TEST binding once with no subscription ID',async()=>{
 const {pg,gateway,get,writes}=await setup();try{
  let current=session('subscription');
  const flow=createV2SandboxCheckoutBindingFlow({gateway,env,stripe:{getSession:async()=>current}});
  await flow.recordPendingSession({sessionId:current.id,verifiedUserId:owner});
  current={...current,status:'expired'};
  const first=await flow.expireUnpaidSession({sessionId:current.id});
  const second=await flow.expireUnpaidSession({sessionId:current.id});
  assert.equal(first.handled,true);assert.equal(first.duplicate,false);
  assert.equal(second.duplicate,true);assert.equal(first.credits,0);
  assert.equal((await get(current.id)).status,'expired');
  assert.equal((await get(current.id)).subscriptionId,null);
  assert.equal(writes(),1);
  await assert.rejects(flow.activatePaidSession({sessionId:current.id}),/V2_TEST_SESSION_NOT_PAID/);
 }finally{await pg.close()}
});
test('expired one-time Checkout is reconciled without a credit grant',async()=>{
 const {pg,gateway,get}=await setup();try{
  let current=session('single_video');
  const flow=createV2SandboxCheckoutBindingFlow({gateway,env,stripe:{getSession:async()=>current}});
  await flow.recordPendingSession({sessionId:current.id,verifiedUserId:owner});
  current={...current,status:'expired'};
  const x=await flow.expireUnpaidSession({sessionId:current.id});
  assert.equal(x.credits,0);assert.equal((await get(current.id)).status,'expired');
 }finally{await pg.close()}
});
test('not expired, paid, wrong user, wrong price and invalid mode never expire a binding',async()=>{
 const {pg,gateway,get,writes}=await setup();try{
  let current=session('subscription');
  const flow=createV2SandboxCheckoutBindingFlow({gateway,env,stripe:{getSession:async()=>current}});
  await flow.recordPendingSession({sessionId:current.id,verifiedUserId:owner});
  const invalid=[
   {...current,status:'open'},
   {...current,status:'expired',payment_status:'paid'},
   {...current,status:'expired',client_reference_id:other,metadata:{...current.metadata,user_id:other}},
   {...current,status:'expired',line_items:{data:[{price:{id:'price_external_invalid'},quantity:1}]}},
   {...current,status:'expired',subscription:'sub_test_forged12345678'}
  ];
  for(const value of invalid){
   current=value;
   await assert.rejects(flow.expireUnpaidSession({sessionId:current.id}),/V2_TEST_/);
  }
  assert.equal((await get(current.id)).status,'pending');assert.equal(writes(),0);
 }finally{await pg.close()}
});
test('expired TEST checkout table stays inaccessible to authenticated role',async()=>{
 const {pg}=await setup();try{
  await pg.exec('set role authenticated');
  await assert.rejects(pg.query('select status from public.k4k_v2_checkout_bindings'),/permission denied/);
 }finally{await pg.close()}
});
