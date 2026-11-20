import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {reconcileFailedTestInvoice,reconcilePaidTestInvoice}
 from '../lib/server/v2-sandbox-billing-reconciliation.mjs';
import {V2_SANDBOX_PRICE_CONTRACTS} from '../lib/server/v2-sandbox-catalog.mjs';

const user='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const price=V2_SANDBOX_PRICE_CONTRACTS.starterGBP.priceId;
const invoiceId='in_test_failed_cycle12345678';
const subscriptionId='sub_test_failed_cycle12345678';
const customerId='cus_test_failed_cycle12345678';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

const unpaid=()=>({
 object:'invoice',id:invoiceId,livemode:false,status:'open',
 currency:'gbp',customer:customerId,
 total:1599,amount_due:1599,amount_paid:0,amount_remaining:1599,
 billing_reason:'subscription_cycle',discounts:[],total_discount_amounts:[],
 attempted:true,attempt_count:1,
 parent:{subscription_details:{subscription:subscriptionId}},
 lines:{data:[{pricing:{price_details:{price}},quantity:1}]}
});
const pastDue=()=>({
 id:subscriptionId,livemode:false,status:'past_due',customer:customerId,
 latest_invoice:invoiceId,
 metadata:{kind:'k4k_v2_subscription',credit_version:'v2',user_id:user},
 items:{data:[{price:{id:price},quantity:1}]}
});
async function fixture(){
 const pg=new PGlite();
 await pg.exec(`create role anon;create role authenticated;
 create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 insert into auth.users(id) values ('${user}'),('${other}');
 grant usage on schema public to service_role;`);
 await pg.exec(read('../db/proposals/k4k-v2-sandbox-checkout-bindings.sql'));
 await pg.exec(read('../db/proposals/k4k-v2-sandbox-billing-state.sql'));
 await pg.exec(`create table public.test_existing_paid_wallet
   (user_id uuid primary key,available integer not null);
 insert into public.test_existing_paid_wallet values ('${user}',840);
 grant select on public.test_existing_paid_wallet to service_role;`);
 await pg.exec('set role service_role');
 await pg.query(`insert into public.k4k_v2_checkout_bindings
  (session_key,user_id,kind,status,price_id,stripe_customer_id,
   stripe_subscription_id,stripe_session_id)
  values ($1,$2,'subscription','active',$3,$4,$5,$1)`,[
  'cs_test_failed_cycle12345678',user,price,customerId,subscriptionId
 ]);
 let writes=0;
 const state=async()=>(
  await pg.query('select billing_state,billing_invoice_id from public.k4k_v2_checkout_bindings')
 ).rows[0];
 const gateway={
  async findBinding({kind,customerId:customer,subscriptionId:sub,priceId}){
   const x=(await pg.query(
    'select * from public.k4k_v2_checkout_bindings where kind=$1 and stripe_customer_id=$2 and stripe_subscription_id=$3 and price_id=$4',
    [kind,customer,sub,priceId])).rows[0];
   return x?{userId:x.user_id,kind:x.kind,status:x.status,
    priceId:x.price_id,customerId:x.stripe_customer_id,
    subscriptionId:x.stripe_subscription_id,billingState:x.billing_state}:null;
  },
  async setSubscriptionBillingState({binding,state:next,invoiceId:id}){
   assert.equal(binding.userId,user);
   const prior=await state();
   if(prior.billing_state===next&&prior.billing_invoice_id===id)
    return {state:next,invoiceId:id,duplicate:true};
   writes++;
   const update=await pg.query(`update public.k4k_v2_checkout_bindings
     set billing_state=$1,billing_invoice_id=$2,billing_updated_at=now()
     where user_id=$3 and stripe_subscription_id=$4 and status='active'
     returning billing_state,billing_invoice_id`,[
    next,id,user,subscriptionId
   ]);
   assert.equal(update.rows.length,1);
   return {state:next,invoiceId:id,duplicate:false};
  }
 };
 return {pg,gateway,state,getWrites:()=>writes};
}

test('failed TEST renewal sets isolated overdue status once, preserving 840 paid credits',async()=>{
 const {pg,gateway,state,getWrites}=await fixture();
 try{
  const stripe={getInvoice:async()=>unpaid(),getSubscription:async()=>pastDue()};
  const a=await reconcileFailedTestInvoice({invoiceId,stripe,gateway});
  const b=await reconcileFailedTestInvoice({invoiceId,stripe,gateway});
  assert.equal(a.handled,true);
  assert.equal(a.kind,'subscription_payment_failed');
  assert.equal(a.credits,0);
  assert.equal(b.duplicate,true);
  assert.equal(getWrites(),1);
  assert.deepEqual(await state(),{billing_state:'past_due',billing_invoice_id:invoiceId});
  assert.equal((await pg.query('select available from public.test_existing_paid_wallet')).rows[0].available,840);
 }finally{await pg.close()}
});
test('recovery from a genuinely paid TEST renewal resets overdue state; late failures cannot regress',async()=>{
 const {pg,gateway,state,getWrites}=await fixture();
 try{
  let invoice=unpaid(),sub=pastDue();
  const stripe={getInvoice:async()=>invoice,getSubscription:async()=>sub};
  await reconcileFailedTestInvoice({invoiceId,stripe,gateway});
  invoice={...invoice,status:'paid',amount_paid:1599,amount_remaining:0,attempt_count:2};
  sub={...sub,status:'active'};
  const recovery=await reconcilePaidTestInvoice({invoiceId,stripe,gateway});
  const duplicate=await reconcilePaidTestInvoice({invoiceId,stripe,gateway});
  const stale=await reconcileFailedTestInvoice({invoiceId,stripe,gateway});
  assert.equal(recovery.kind,'subscription_payment_current');
  assert.equal(duplicate.duplicate,true);
  assert.equal(stale.kind,'subscription_payment_failure_stale');
  assert.equal(getWrites(),2);
  assert.deepEqual(await state(),{billing_state:'current',billing_invoice_id:invoiceId});
  assert.equal((await pg.query('select available from public.test_existing_paid_wallet')).rows[0].available,840);
 }finally{await pg.close()}
});
test('wrong owner, wrong price, and unattempted failed invoice cannot affect billing state',async()=>{
 const {pg,gateway,state}=await fixture();
 try{
  const trials=[
   {getInvoice:async()=>unpaid(),getSubscription:async()=>({...pastDue(),metadata:{...pastDue().metadata,user_id:other}})},
   {getInvoice:async()=>({...unpaid(),lines:{data:[{pricing:{price_details:{price:'price_external123'}},quantity:1}]}}),
    getSubscription:async()=>pastDue()},
   {getInvoice:async()=>({...unpaid(),attempted:false,attempt_count:0}),getSubscription:async()=>pastDue()},
   {getInvoice:async()=>({...unpaid(),livemode:true}),getSubscription:async()=>pastDue()}
  ];
  for(const stripe of trials)
   await assert.rejects(reconcileFailedTestInvoice({invoiceId,stripe,gateway}),/V2_TEST_/);
  assert.deepEqual(await state(),{billing_state:'current',billing_invoice_id:null});
 }finally{await pg.close()}
});
test('billing-state columns keep existing service-role-only access',async()=>{
 const {pg}=await fixture();
 try{
  await pg.exec('set role authenticated');
  await assert.rejects(pg.query(
   'select billing_state from public.k4k_v2_checkout_bindings'),/permission denied/);
 }finally{await pg.close()}
});
