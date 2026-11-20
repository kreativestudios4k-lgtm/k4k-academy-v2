import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createV2SandboxPaymentAdapter,createV2SandboxSupabaseGateway}
 from '../lib/server/v2-sandbox-payment-adapter.mjs';
import {createStripeTestReader} from '../lib/server/v2-stripe-test-reader.mjs';
import {V2_SANDBOX_PRICE_CONTRACTS,assertV2SandboxRuntime,V2_SANDBOX_RPC_NAME}
 from '../lib/server/v2-sandbox-catalog.mjs';
const user='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const p=V2_SANDBOX_PRICE_CONTRACTS,sessionKey='cs_test_one_1234567';
const env={VERCEL_ENV:'preview',K4K_V2_SANDBOX_ADAPTER_ENABLED:'true',K4K_V2_SANDBOX_PROJECT_ISOLATED:'true'};
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
async function setup(){
 const pg=new PGlite();
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 insert into auth.users values('${user}'),('${other}');
 create table public.k4k_live_credit_accounts(user_id uuid primary key,balance int not null);
 insert into public.k4k_live_credit_accounts values('${user}',80);
 grant usage on schema public to service_role,authenticated;
 grant select on public.k4k_live_credit_accounts to service_role;`);
 await pg.exec(read('../db/proposals/k4k-v2-credit-wallet-schema-review.sql'));
 await pg.exec(read('../db/proposals/k4k-v2-credit-atomic-rpcs-review.sql'));
 await pg.exec(read('../db/proposals/k4k-v2-sandbox-checkout-bindings.sql'));
 await pg.exec(read('../db/proposals/k4k-v2-sandbox-paid-grant-rpc.sql'));
 await pg.exec(`insert into public.k4k_v2_checkout_bindings
 (session_key,user_id,kind,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id)
 values
 ('cs_test_starter_123456','${user}','subscription','${p.starterGBP.priceId}','cus_test_starter12345','sub_test_starter12345','cs_test_starter_123456'),
 ('cs_test_creator_123456','${user}','subscription','${p.creatorBRL.priceId}','cus_test_creator12345','sub_test_creator12345','cs_test_creator_123456'),
 ('${sessionKey}','${user}','single_video','${p.singleGBP.priceId}','cus_test_one1234567',null,'${sessionKey}')`);
 await pg.exec('set role service_role');
 const gateway={
  async findBinding(f){
   const params=[f.kind,f.priceId],extra=[];
   if(f.customerId){extra.push('stripe_customer_id=$'+(params.length+1));params.push(f.customerId)}
   if(f.subscriptionId){extra.push('stripe_subscription_id=$'+(params.length+1));params.push(f.subscriptionId)}
   if(f.sessionId){extra.push('stripe_session_id=$'+(params.length+1));params.push(f.sessionId)}
   const sql='select user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id from public.k4k_v2_checkout_bindings where kind=$1 and price_id=$2'
    +(extra.length?' and '+extra.join(' and '):'');
   const result=await pg.query(sql,params);
   if(result.rows.length!==1)return null;
   const x=result.rows[0];
   return {userId:x.user_id,kind:x.kind,status:x.status,priceId:x.price_id,
    customerId:x.stripe_customer_id,subscriptionId:x.stripe_subscription_id,sessionId:x.stripe_session_id};
  },
  async findReceipt(receiptId){
   const r=await pg.query('select receipt_key,user_id,source_kind,amount_minor,currency,status from public.k4k_v2_credit_receipts where receipt_key=$1',[receiptId]);
   const x=r.rows[0];
   return x?{receiptId:x.receipt_key,userId:x.user_id,sourceKind:x.source_kind,
    amountMinor:Number(x.amount_minor),currency:x.currency,status:x.status}:null;
  },
  async rpc(name,args){
   if(name===V2_SANDBOX_RPC_NAME){
    const result=await pg.query('select public.k4k_v2_grant_paid_test($1,$2,$3,$4,$5,$6,$7,$8) as result',[
     args.p_event,args.p_user,args.p_receipt,args.p_source_kind,args.p_stripe_price,
     args.p_amount_minor,args.p_currency,args.p_credits
    ]);
    return {data:result.rows[0].result,error:null};
   }
   if(name==='k4k_v2_refund_paid'){
    const r=await pg.query('select public.k4k_v2_refund_paid($1,$2,$3) as result',[
     args.p_event,args.p_user,args.p_receipt
    ]);
    return {data:r.rows[0].result,error:null};
   }
   throw Error('BAD_RPC_NAME');
  }
 };
 return {pg,gateway};
}
function mockInvoice(kind='starterGBP',overrides={}){
 const contract=p[kind],creator=kind==='creatorBRL';
 return {
  object:'invoice',id:creator?'in_test_creator12345':'in_test_starter12345',
  livemode:false,status:'paid',paid:true,currency:contract.currency.toLowerCase(),
  customer:creator?'cus_test_creator12345':'cus_test_starter12345',
  subscription:creator?'sub_test_creator12345':'sub_test_starter12345',
  total:contract.amountMinor,amount_paid:contract.amountMinor,
  amount_due:contract.amountMinor,amount_remaining:0,
  billing_reason:'subscription_create',total_discount_amounts:[],discounts:[],
  lines:{data:[{price:{id:contract.priceId},quantity:1}]},...overrides
 };
}
function mockSession(overrides={}){
 return {
  object:'checkout.session',id:sessionKey,livemode:false,mode:'payment',
  status:'complete',payment_status:'paid',currency:'gbp',customer:'cus_test_one1234567',
  amount_total:599,amount_subtotal:599,total_details:{amount_discount:0},
  automatic_tax:{enabled:true,status:'complete'},
  client_reference_id:user,metadata:{
   kind:'k4k_v2_single_video',credit_version:'v2',
   user_id:user,product_id:p.singleGBP.productId
  },
  line_items:{data:[{price:{id:p.singleGBP.priceId},quantity:1}]},
  payment_intent:{
   id:'pi_test_paid12345678',status:'succeeded',
   latest_charge:{id:'ch_test_paid12345678',payment_intent:'pi_test_paid12345678',
    refunded:false,disputed:false,amount_refunded:0}
  },...overrides
 };
}
async function balance(pg){
 return (await pg.query('select available,reserved,reversal_debt from public.k4k_v2_credit_accounts where user_id=$1',[user])).rows[0];
}
async function legacy(pg){
 return (await pg.query('select balance from public.k4k_live_credit_accounts where user_id=$1',[user])).rows[0].balance;
}
test('Stripe TEST Starter invoice grants 420 only once in isolated V2 wallet; legacy stays 80',async()=>{
 const {pg,gateway}=await setup();try{
  const stripe={getInvoice:async()=>mockInvoice(),getSession:async()=>mockSession()};
  const adapter=createV2SandboxPaymentAdapter({stripe,gateway,env});
  const a=await adapter.applyPaidInvoice({invoiceId:'in_test_starter12345',eventId:'evt_test_paid_starter12345'});
  const b=await adapter.applyPaidInvoice({invoiceId:'in_test_starter12345',eventId:'evt_test_retry_starter12345'});
  assert.equal(a.credited,true);assert.equal(b.credited,false);
  assert.equal((await balance(pg)).available,420);
  assert.equal(await legacy(pg),80);
 }finally{await pg.close()}
});
test('modern Stripe TEST paid invoice without legacy paid property credits once',async()=>{
 const {pg,gateway}=await setup();try{
  const {paid:discarded,...current}=mockInvoice('starterGBP');
  current.subscription=null;
  current.parent={subscription_details:{subscription:'sub_test_starter12345',
   metadata:{credit_version:'v2',kind:'k4k_v2_subscription',user_id:user}}};
  current.lines={data:[{pricing:{price_details:{price:p.starterGBP.priceId}},quantity:1}]};
  const adapter=createV2SandboxPaymentAdapter({gateway,env,stripe:{
   getInvoice:async()=>current,getSession:async()=>mockSession()
  }});
  const first=await adapter.applyPaidInvoice({
   invoiceId:current.id,eventId:'evt_test_modern_paid12345'
  });
  const retry=await adapter.applyPaidInvoice({
   invoiceId:current.id,eventId:'evt_test_modern_retry12345'
  });
  assert.equal(first.credited,true);
  assert.equal(retry.credited,false);
  assert.equal((await balance(pg)).available,420);
  assert.equal(await legacy(pg),80);
 }finally{await pg.close()}
});
test('TEST monthly renewal grants another 420 once, ignoring webhook replays and preserving legacy credits',async()=>{
 const {pg,gateway}=await setup();try{
  const initial=mockInvoice('starterGBP');
  const renewal=mockInvoice('starterGBP',{
   id:'in_test_starter_renewal123456',billing_reason:'subscription_cycle'
  });
  const stripe={getInvoice:async id=>{
   if(id===initial.id)return initial;
   if(id===renewal.id)return renewal;
   throw Error('UNEXPECTED_INVOICE');
  },getSession:async()=>mockSession()};
  const adapter=createV2SandboxPaymentAdapter({stripe,gateway,env});
  const first=await adapter.applyPaidInvoice({
   invoiceId:initial.id,eventId:'evt_test_initial_renewal12345'
  });
  const cycle=await adapter.applyPaidInvoice({
   invoiceId:renewal.id,eventId:'evt_test_monthly_cycle12345'
  });
  const replay=await adapter.applyPaidInvoice({
   invoiceId:renewal.id,eventId:'evt_test_monthly_cycle_replay12345'
  });
  assert.equal(first.credited,true);
  assert.equal(cycle.credited,true);
  assert.equal(replay.credited,false);
  assert.equal((await balance(pg)).available,840);
  assert.equal((await pg.query("select count(*)::int as n from public.k4k_v2_credit_receipts where source_kind='subscription_invoice'")).rows[0].n,2);
  assert.equal(await legacy(pg),80);
 }finally{await pg.close()}
});
test('failed TEST renewal invoice cannot add credits or invent a paid receipt',async()=>{
 const {pg,gateway}=await setup();try{
  const initial=mockInvoice('starterGBP');
  const failure=mockInvoice('starterGBP',{
   id:'in_test_starter_declined12345',status:'open',paid:false,
   amount_paid:0,amount_remaining:p.starterGBP.amountMinor,
   billing_reason:'subscription_cycle'
  });
  const adapter=createV2SandboxPaymentAdapter({gateway,env,stripe:{
   getInvoice:async id=>id===failure.id?failure:initial,
   getSession:async()=>mockSession()
  }});
  await adapter.applyPaidInvoice({
   invoiceId:initial.id,eventId:'evt_test_before_failed_cycle12345'
  });
  await assert.rejects(adapter.applyPaidInvoice({
   invoiceId:failure.id,eventId:'evt_test_failed_cycle12345'
  }),/V2_TEST_INVOICE_INVALID/);
  assert.equal((await balance(pg)).available,420);
  assert.equal((await pg.query("select count(*)::int as n from public.k4k_v2_credit_receipts where source_kind='subscription_invoice'")).rows[0].n,1);
  assert.equal(await legacy(pg),80);
 }finally{await pg.close()}
});
test('Creator BRL R$224.90 TEST invoice safely credits exactly 840 V2 credits',async()=>{
 const {pg,gateway}=await setup();try{
  const adapter=createV2SandboxPaymentAdapter({gateway,env,stripe:{
   getInvoice:async()=>mockInvoice('creatorBRL'),getSession:async()=>mockSession()
  }});
  const a=await adapter.applyPaidInvoice({invoiceId:'in_test_creator12345',eventId:'evt_test_paid_creator12345'});
  assert.equal(a.credited,true);assert.equal((await balance(pg)).available,840);
  assert.equal(await legacy(pg),80);
 }finally{await pg.close()}
});
test('Single video TEST £5.99 grants 140; cannot reserve 175 at Option B rate',async()=>{
 const {pg,gateway}=await setup();try{
  const adapter=createV2SandboxPaymentAdapter({gateway,env,stripe:{
   getInvoice:async()=>mockInvoice(),getSession:async()=>mockSession()
  }});
  const a=await adapter.applyPaidSingleVideo({sessionId:sessionKey,eventId:'evt_test_paid_one123456'});
  assert.equal(a.credited,true);assert.equal((await balance(pg)).available,140);
  await assert.rejects(pg.query(
   'select public.k4k_v2_reserve_generation($1,$2,$3,$4,$5,$6)',[
    'evt_test_reserve175',user,'33333333-3333-4333-8333-333333333333','a'.repeat(64),2100000,175
   ]),/INSUFFICIENT_V2_CREDITS/);
  assert.equal((await balance(pg)).available,140);
  assert.equal(await legacy(pg),80);
 }finally{await pg.close()}
});
test('re-fetched Stripe TEST invoice that is unpaid, discounted or wrong amount never grants',async()=>{
 const variants=[
  {paid:false},{status:'open'},{total:1},
  {amount_paid:1},{currency:'usd'},{discounts:['di_bad123456']},
  {lines:{data:[{price:{id:'price_wrong123456'},quantity:1}]}},
  {customer:'cus_another12345'}
 ];
 for(const variant of variants){
  const {pg,gateway}=await setup();try{
   const adapter=createV2SandboxPaymentAdapter({gateway,env,stripe:{
    getInvoice:async()=>mockInvoice('starterGBP',variant),getSession:async()=>mockSession()
   }});
   await assert.rejects(adapter.applyPaidInvoice({
    invoiceId:'in_test_starter12345',eventId:'evt_test_paid_invalid12345'
   }),/V2_TEST_/);
   assert.equal((await pg.query('select count(*)::int as n from public.k4k_v2_credit_receipts')).rows[0].n,0);
   assert.equal(await legacy(pg),80);
  }finally{await pg.close()}
 }
});
test('Single video incorrect owner, refunded charge or tampered amount cannot grant',async()=>{
 const variants=[
  {client_reference_id:other},
  {amount_total:1},
  {payment_status:'unpaid'},
  {payment_intent:{...mockSession().payment_intent,
   latest_charge:{...mockSession().payment_intent.latest_charge,amount_refunded:599}}},
  {metadata:{...mockSession().metadata,user_id:other}}
 ];
 for(const variant of variants){
  const {pg,gateway}=await setup();try{
   const adapter=createV2SandboxPaymentAdapter({gateway,env,stripe:{
    getInvoice:async()=>mockInvoice(),getSession:async()=>mockSession(variant)
   }});
   await assert.rejects(adapter.applyPaidSingleVideo({sessionId:sessionKey,eventId:'evt_test_bad_one12345'}),/V2_TEST_/);
   assert.equal((await pg.query('select count(*)::int as n from public.k4k_v2_credit_receipts')).rows[0].n,0);
  }finally{await pg.close()}
 }
});
test('production, unknown isolated project, client role and live Stripe key fail closed',async()=>{
 assert.throws(()=>assertV2SandboxRuntime({...env,VERCEL_ENV:'production'}),/V2_SANDBOX_ONLY/);
 assert.throws(()=>createV2SandboxPaymentAdapter({env:{...env,K4K_V2_SANDBOX_PROJECT_ISOLATED:'false'}}),/V2_SANDBOX_ONLY/);
 assert.throws(()=>createV2SandboxSupabaseGateway({}),/V2_TEST_DB_NOT_ISOLATED/);
 const dummyDb={from(){return this;},rpc(){return this;}};
 assert.throws(()=>createV2SandboxSupabaseGateway(dummyDb,{
  isolatedProjectConfirmed:true,projectRef:'tqlvfqjvfqfigsauqjtl'
 }),/V2_TEST_DB_NOT_ISOLATED/);
 assert.throws(()=>createV2SandboxSupabaseGateway(dummyDb,{
  isolatedProjectConfirmed:true,projectRef:'anothertestproject01'
 }),/V2_TEST_DB_NOT_ISOLATED/);
 assert.doesNotThrow(()=>createV2SandboxSupabaseGateway(dummyDb,{
  isolatedProjectConfirmed:true,projectRef:'yhbhrkyihiyyfzqogyri'
 }));
 assert.throws(()=>createStripeTestReader({secret:'sk_live_example123456'}),/STRIPE_TEST_SECRET_REQUIRED/);
 const {pg}=await setup();try{
  await pg.exec('set role authenticated');
  await assert.rejects(pg.query('select * from public.k4k_v2_checkout_bindings'),/permission denied/);
  await assert.rejects(pg.query("select public.k4k_v2_grant_paid_test('evt_unsafe123','11111111-1111-4111-8111-111111111111','in_bad123','subscription_invoice','price_test',1599,'GBP',420)"),/permission denied/);
 }finally{await pg.close()}
});
test('Stripe TEST reader fetches current server-side payment evidence and rejects LIVE responses',async()=>{
 const calls=[];
 const fetchImpl=async (url,init)=>{
  calls.push({url,method:init.method,header:init.headers.Authorization});
  return {ok:true,json:async()=>mockInvoice()};
 };
 const reader=createStripeTestReader({secret:'sk_test_mock123456789',fetchImpl});
 const invoice=await reader.getInvoice('in_test_starter12345');
 assert.equal(invoice.id,'in_test_starter12345');
 assert.equal(calls.length,1);
 assert.match(calls[0].url,/\/v1\/invoices\/in_test_starter12345/);
 assert.equal(calls[0].method,'GET');
 const wrong=createStripeTestReader({secret:'sk_test_mock123456789',fetchImpl:async()=>
  ({ok:true,json:async()=>({...mockInvoice(),livemode:true})})});
 await assert.rejects(wrong.getInvoice('in_test_starter12345'),/STRIPE_TEST_MODE_MISMATCH/);
});

test('verified TEST full refund after spent Single video credits creates debt but never touches legacy credits',async()=>{
 const {pg,gateway}=await setup();try{
  const payment='pi_test_paid12345678';
  const makeCharge=(amountRefunded=599)=>({
   id:'ch_test_refund123456',livemode:false,refunded:true,disputed:false,
   amount:599,amount_refunded:amountRefunded,currency:'gbp',payment_intent:payment
  });
  let charge=makeCharge();
  const stripe={getInvoice:async()=>mockInvoice(),getSession:async()=>mockSession(),
   getCharge:async()=>charge};
  const adapter=createV2SandboxPaymentAdapter({gateway,env,stripe});
  await adapter.applyPaidSingleVideo({sessionId:sessionKey,eventId:'evt_test_single_for_refund'});
  await pg.query('select public.k4k_v2_reserve_generation($1,$2,$3,$4,$5,$6)',[
   'evt_test_full_spend12345',user,'33333333-3333-4333-8333-333333333333','a'.repeat(64),1680000,140
  ]);
  await pg.query('select public.k4k_v2_finish_generation($1,$2,$3,$4)',[
   'evt_test_finish_spend12345',user,'33333333-3333-4333-8333-333333333333','settled'
  ]);
  charge=makeCharge(100);
  await assert.rejects(adapter.applyFullRefund({
   eventId:'evt_test_partial_refund',chargeId:charge.id,receiptId:payment
  }),/V2_TEST_FULL_REFUND_UNVERIFIED/);
  assert.equal((await balance(pg)).reversal_debt,0);
  charge=makeCharge();
  const first=await adapter.applyFullRefund({
   eventId:'evt_test_full_refund12345',chargeId:charge.id,receiptId:payment
  });
  const duplicate=await adapter.applyFullRefund({
   eventId:'evt_test_full_refund_retry12345',chargeId:charge.id,receiptId:payment
  });
  assert.equal(first.refunded,true);assert.equal(duplicate.refunded,false);
  assert.equal((await balance(pg)).reversal_debt,140);
  assert.equal((await balance(pg)).available,0);
  assert.equal(await legacy(pg),80);
 }finally{await pg.close()}
});
test('refunds cannot attach a TEST charge to a different invoice, wrong price, or owner',async()=>{
 const {pg,gateway}=await setup();try{
  const adapter=createV2SandboxPaymentAdapter({gateway,env,stripe:{
   getInvoice:async()=>mockInvoice(),getSession:async()=>mockSession(),
   getCharge:async()=>({id:'ch_test_refund123456',livemode:false,refunded:true,disputed:false,
    amount:599,amount_refunded:599,currency:'gbp',payment_intent:'pi_wrong123456'})
  }});
  await adapter.applyPaidSingleVideo({sessionId:sessionKey,eventId:'evt_test_single_refund2'});
  await assert.rejects(adapter.applyFullRefund({
   eventId:'evt_test_bad_refund1234',chargeId:'ch_test_refund123456',receiptId:'pi_test_paid12345678'
  }),/V2_TEST_FULL_REFUND_UNVERIFIED/);
  assert.equal((await balance(pg)).available,140);
 }finally{await pg.close()}
});
