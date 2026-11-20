// Synthetic E2E contract: V2 checkout intent → verified paid Stripe evidence
// → atomic PGlite credit grant → cost-locked generation and refund.
// No real payments, no Supabase production data, no external API calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {prepareV2CheckoutIntent} from '../lib/server/v2-checkout-intent.mjs';
import {verifyV2PaidSubscriptionInvoice,verifyV2PaidSingleVideoEvidence} from '../lib/server/v2-stripe-paid-evidence.mjs';
import {quoteOptionBStandardMotion} from '../lib/server/v2-option-b-policy.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const customer='cus_mock_123456789',subscription='sub_mock_123456789';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
async function setup(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
  create schema auth;create table auth.users(id uuid primary key);
  insert into auth.users values('${owner}');
  create table public.k4k_live_credit_accounts(user_id uuid primary key,balance int not null);
  insert into public.k4k_live_credit_accounts values('${owner}',80);
  grant usage on schema public to service_role;
  grant select on public.k4k_live_credit_accounts to service_role;`);
 await db.exec(read('../db/proposals/k4k-v2-credit-wallet-schema-review.sql'));
 await db.exec(read('../db/proposals/k4k-v2-credit-atomic-rpcs-review.sql'));
 await db.exec('set role service_role');
 return db;
}
async function grant(db,e,eventId){
 return (await db.query(
 'select public.k4k_v2_grant_paid($1,$2,$3,$4,$5,$6,$7,$8) as result',
 [eventId,e.verifiedUserId,e.receiptId,e.sourceKind,e.priceId,e.amountMinor,e.currency,e.credits]
 )).rows[0].result;
}
async function wallet(db){
 return (await db.query('select available,reserved,reversal_debt,billing_hold from public.k4k_v2_credit_accounts where user_id=$1',[owner])).rows[0];
}
async function legacy(db){
 return (await db.query('select balance from public.k4k_live_credit_accounts where user_id=$1',[owner])).rows[0].balance;
}
test('Creator Brazil: server price → signed paid evidence → exactly-once 840-credit V2 grant',async()=>{
 const db=await setup();try{
  const intent=prepareV2CheckoutIntent({verifiedUserId:owner,kind:'subscription',plan:'creator',trustedCountry:'BR'});
  assert.equal(intent.currency,'BRL');assert.equal(intent.amountMinor,22490);
  assert.equal(intent.checkoutReady,false);
  const invoice={
   id:'in_creator_123456789',customer,subscription,status:'paid',paid:true,
   livemode:true,currency:'brl',billing_reason:'subscription_cycle',
   amount_paid:22490,amount_due:22490,total:22490,amount_remaining:0,
   discounts:[],total_discount_amounts:[],
   lines:{data:[{price:{id:intent.priceId},quantity:1}]}
  };
  const e=verifyV2PaidSubscriptionInvoice(invoice,{
   verifiedCustomerId:customer,verifiedSubscriptionId:subscription,
   verifiedOwnerUserId:owner,requestingUserId:owner
  });
  assert.equal(e.credits,840);
  const a=await grant(db,e,'evt_creator_payment');
  const b=await grant(db,e,'evt_creator_payment_retry');
  assert.equal(a.credited,true);assert.equal(b.credited,false);
  assert.equal((await wallet(db)).available,840);assert.equal(await legacy(db),80);
  const quote=quoteOptionBStandardMotion({seconds:30});
  assert.equal(quote.credits,175);
  const job='33333333-3333-4333-8333-333333333333',hash='a'.repeat(64);
  const reservation=(await db.query('select public.k4k_v2_reserve_generation($1,$2,$3,$4,$5,$6) as v',
   ['evt_motion_reserve',owner,job,hash,quote.providerCostMicros,quote.credits])).rows[0].v;
  assert.equal(reservation.reserved,true);
  assert.equal((await wallet(db)).available,665);
  await db.query('select public.k4k_v2_finish_generation($1,$2,$3,$4)',['evt_motion_settle',owner,job,'settled']);
  assert.equal((await wallet(db)).reserved,0);
  assert.equal(await legacy(db),80);
 }finally{await db.close();}
});
test('Single video £5.99: one-time paid evidence grants 140, 30s is blocked, 24s can use 140',async()=>{
 const db=await setup();try{
  const intent=prepareV2CheckoutIntent({verifiedUserId:owner,trustedCountry:'GB',kind:'single_video'});
  assert.equal(intent.stripeMode,'payment');assert.equal(intent.credits,140);
  const session={
   id:'cs_one_time_mock_123',livemode:true,mode:'payment',status:'complete',payment_status:'paid',
   client_reference_id:owner,metadata:{kind:'k4k_v2_single_video',user_id:owner,credit_version:'v2',product_id:'prod_VeuCjnhyUlZL59'},
   currency:'gbp',amount_subtotal:599,amount_total:599,total_details:{amount_discount:0},
   automatic_tax:{enabled:true,status:'complete'},
   line_items:{data:[{price:{id:intent.priceId},quantity:1}]},
   payment_intent:{id:'pi_one_time_123456789',status:'succeeded',
    latest_charge:{amount_refunded:0,refunded:false,disputed:false}}
  };
  const e=verifyV2PaidSingleVideoEvidence(session,{verifiedOwnerUserId:owner,requestingUserId:owner});
  assert.equal(e.credits,140);
  assert.equal((await grant(db,e,'evt_single_video_payment')).credited,true);
  const thirty=quoteOptionBStandardMotion({seconds:30});
  await assert.rejects(
   db.query('select public.k4k_v2_reserve_generation($1,$2,$3,$4,$5,$6)',
    ['evt_insufficient_30s',owner,'33333333-3333-4333-8333-333333333334','b'.repeat(64),thirty.providerCostMicros,thirty.credits]),
   /INSUFFICIENT_V2_CREDITS/
  );
  assert.equal((await wallet(db)).available,140);
  const twentyFour=quoteOptionBStandardMotion({seconds:24});
  assert.equal(twentyFour.credits,140);
  const reserve=(await db.query('select public.k4k_v2_reserve_generation($1,$2,$3,$4,$5,$6) as v',
   ['evt_24s_reservation',owner,'33333333-3333-4333-8333-333333333335','c'.repeat(64),twentyFour.providerCostMicros,140])).rows[0].v;
  assert.equal(reserve.reserved,true);
  assert.equal((await wallet(db)).available,0);
  assert.equal(await legacy(db),80);
 }finally{await db.close();}
});
