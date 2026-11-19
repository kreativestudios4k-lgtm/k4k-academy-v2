import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createV2Ledger,applyV2LedgerEvent,verifySingleVideoSession,V2_CREDIT_VERSION} from '../lib/server/v2-credit-ledger-contract.mjs';
import {V2_SINGLE_VIDEO} from '../lib/server/v2-live-price-policy.mjs';
import {quotedCreditsForProviderCost} from '../lib/server/v2-credit-economics-preview.mjs';

const user='abcd1234-ab12-4abc-9def-123456789abc';
const ledger=()=>createV2Ledger({userId:user,legacySnapshot:80});
const event=(type,credits,eventId,other={})=>({type,credits,eventId,userId:user,creditVersion:'v2',...other});
const paid=(credits=140,eventId='stripe_evt_one',paymentId='pi_1234567890')=>
 event('grant_paid',credits,eventId,{paymentId,verifiedPaid:true});
const apply=(x,e)=>applyV2LedgerEvent(x,e).ledger;

test('duplicate paid events and different webhook IDs for the same payment grant exactly once',()=>{
 const first=apply(ledger(),paid());
 assert.equal(first.available,140);assert.equal(first.legacySnapshot,80);
 const same=applyV2LedgerEvent(first,paid());assert.equal(same.duplicate,true);
 const repeated=applyV2LedgerEvent(first,paid(140,'stripe_evt_other','pi_1234567890'));
 assert.equal(repeated.duplicate,true);assert.equal(repeated.ledger.available,140);
 assert.throws(()=>apply(first,paid(420,'stripe_evt_conflict','pi_1234567890')),/PAYMENT_RECEIPT_CONFLICT/);
 assert.throws(()=>apply(first,paid(150,'stripe_evt_one','pi_other')),/IDEMPOTENCY_CONFLICT/);
});
test('untrusted payment, cross-owner and legacy credit version cannot touch V2',()=>{
 assert.throws(()=>apply(ledger(),{...paid(),verifiedPaid:false}),/UNVERIFIED_PAYMENT/);
 assert.throws(()=>apply(ledger(),{...paid(),userId:'other_user_12345'}),/V2_LEDGER_INPUT_INVALID/);
 assert.throws(()=>apply(ledger(),{...paid(),creditVersion:'legacy'}),/V2_LEDGER_INPUT_INVALID/);
 assert.throws(()=>apply(ledger(),paid(0)),/V2_LEDGER_INPUT_INVALID/);
});
test('reserve then settle consumes only V2 credits and never changes legacy snapshot',()=>{
 let s=apply(ledger(),paid());
 s=apply(s,event('reserve_generation',47,'job_evt_reserve',{jobId:'job_123456789'}));
 assert.equal(s.available,93);assert.equal(s.reserved,47);assert.equal(s.legacySnapshot,80);
 const dupe=applyV2LedgerEvent(s,event('reserve_generation',47,'job_evt_reserve',{jobId:'job_123456789'}));
 assert.equal(dupe.duplicate,true);
 s=apply(s,event('settle_generation',47,'job_evt_settle',{jobId:'job_123456789'}));
 assert.equal(s.available,93);assert.equal(s.reserved,0);
 assert.throws(()=>apply(s,event('settle_generation',47,'job_evt_settle_again',{jobId:'job_123456789'})),/GENERATION_STATE_CONFLICT/);
});
test('a failed job releases reserved credits only once',()=>{
 let s=apply(ledger(),paid());
 s=apply(s,event('reserve_generation',100,'job_evt_reserve',{jobId:'job_987654321'}));
 s=apply(s,event('release_generation',100,'job_evt_release',{jobId:'job_987654321'}));
 assert.equal(s.available,140);assert.equal(s.reserved,0);
 assert.throws(()=>apply(s,event('release_generation',100,'job_evt_release_again',{jobId:'job_987654321'})),/GENERATION_STATE_CONFLICT/);
});
test('overdrafts, release before reserve and job amount mismatches fail closed',()=>{
 const s=apply(ledger(),paid());
 assert.throws(()=>apply(s,event('reserve_generation',150,'job_evt_big',{jobId:'job_111111111'})),/INSUFFICIENT_V2_CREDITS/);
 assert.throws(()=>apply(s,event('settle_generation',20,'job_evt_bad',{jobId:'job_111111111'})),/GENERATION_STATE_CONFLICT/);
 let reserved=apply(s,event('reserve_generation',100,'job_evt_ok',{jobId:'job_111111111'}));
 assert.throws(()=>apply(reserved,event('release_generation',99,'job_evt_mismatch',{jobId:'job_111111111'})),/GENERATION_STATE_CONFLICT/);
});
test('full refund after spending results in debt and billing hold, no legacy clawback',()=>{
 let s=apply(ledger(),paid());
 s=apply(s,event('reserve_generation',100,'job_evt_r',{jobId:'job_a12345'}));
 s=apply(s,event('settle_generation',100,'job_evt_s',{jobId:'job_a12345'}));
 s=apply(s,event('refund_payment',140,'stripe_evt_refund',{paymentId:'pi_1234567890',fullRefund:true}));
 assert.equal(s.available,0);assert.equal(s.debt,100);assert.equal(s.billingHold,true);assert.equal(s.legacySnapshot,80);
 assert.throws(()=>apply(s,event('reserve_generation',1,'job_evt_new',{jobId:'job_b12345'})),/BILLING_REVIEW_REQUIRED/);
 assert.throws(()=>apply(s,event('refund_payment',140,'stripe_evt_refund_2',{paymentId:'pi_1234567890',fullRefund:true})),/REFUND_RECEIPT_CONFLICT/);
});
test('future valid V2 invoice pays reversal debt first; cannot self-clear billing hold',()=>{
 let s=apply(ledger(),paid());
 s=apply(s,event('reserve_generation',140,'job_evt_1',{jobId:'job_aaa12345'}));
 s=apply(s,event('settle_generation',140,'job_evt_2',{jobId:'job_aaa12345'}));
 s=apply(s,event('refund_payment',140,'stripe_evt_refund',{paymentId:'pi_1234567890',fullRefund:true}));
 s=apply(s,paid(420,'stripe_evt_invoice','in_987654321'));
 assert.equal(s.debt,0);assert.equal(s.available,280);assert.equal(s.billingHold,true);
});
test('partial refunds are blocked for separately reviewed prorating strategy',()=>{
 const s=apply(ledger(),paid());
 assert.throws(()=>apply(s,event('refund_payment',140,'stripe_evt_part',{paymentId:'pi_1234567890',fullRefund:false})),/PARTIAL_REFUND_REVIEW_REQUIRED/);
});
function session({currency='brl',price,amount,userId=user}={}){
 const cur=currency.toUpperCase();
 return {livemode:true,mode:'payment',status:'complete',payment_status:'paid',
  client_reference_id:userId,metadata:{kind:'k4k_v2_single_video',user_id:userId,credit_version:'v2',product_id:V2_SINGLE_VIDEO.productId},
  currency,amount_subtotal:amount??V2_SINGLE_VIDEO.minor[cur],amount_total:amount??V2_SINGLE_VIDEO.minor[cur],
  total_details:{amount_discount:0},automatic_tax:{enabled:true,status:'complete'},
  line_items:{data:[{price:{id:price??V2_SINGLE_VIDEO.prices[cur]},quantity:1}]},
  payment_intent:{id:'pi_payment_123456',status:'succeeded',latest_charge:{amount_refunded:0,refunded:false,disputed:false}}
 };
}
test('all four one-time LIVE prices verify exact 140-credit grants, without checkout writes',()=>{
 for(const currency of ['gbp','eur','usd','brl']){
  const p=verifySingleVideoSession(session({currency}),{userId:user});
  assert.equal(p.credits,140);assert.equal(p.currency,currency.toUpperCase());
  assert.equal(p.paymentId,'pi_payment_123456');assert.equal(p.creditVersion,V2_CREDIT_VERSION);
 }
});
test('single video verifies owner, product, price, tax and payment before any grant',()=>{
 const base=session();
 const cases=[
  {...base,client_reference_id:'other_user'},
  {...base,metadata:{...base.metadata,kind:'legacy_topup'}},
  {...base,line_items:{data:[{price:{id:'price_wrong'},quantity:1}]}},
  {...base,amount_total:4400},
  {...base,automatic_tax:{enabled:false,status:'complete'}},
  {...base,payment_intent:{...base.payment_intent,status:'requires_payment_method'}},
  {...base,payment_intent:{...base.payment_intent,latest_charge:{refunded:true}}},
  {...base,livemode:false},
 ];
 for(const bad of cases)assert.throws(()=>verifySingleVideoSession(bad,{userId:user}),/SINGLE_VIDEO_/);
});
test('the 140-credit single-video product cannot claim to cover 30s Standard under conservative scenario',()=>{
 assert.equal(quotedCreditsForProviderCost(2.10,0.015),140);
 assert.equal(quotedCreditsForProviderCost(2.10,0.012),175);
 assert.ok(quotedCreditsForProviderCost(2.10,0.012)>V2_SINGLE_VIDEO.credits);
});
