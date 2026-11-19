import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyV2PaidSubscriptionInvoice,verifyV2PaidSingleVideoEvidence}
 from '../lib/server/v2-stripe-paid-evidence.mjs';
import {V2_LIVE_PLAN_PRICES,V2_LIVE_PLAN_MINOR,V2_SINGLE_VIDEO,PRESERVED_LIVE_PLAN_PRICES}
 from '../lib/server/v2-live-price-policy.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const customer='cus_01234567890',subscription='sub_01234567890';
const options={requestingUserId:owner,verifiedOwnerUserId:owner,verifiedCustomerId:customer,verifiedSubscriptionId:subscription};
function invoice(plan='creator',currency='BRL'){
 const amount=V2_LIVE_PLAN_MINOR[plan][currency];
 return {
  livemode:true,id:'in_0123456789',customer,subscription,status:'paid',paid:true,
  currency:currency.toLowerCase(),billing_reason:'subscription_cycle',
  amount_due:amount,amount_paid:amount,amount_remaining:0,total:amount,
  lines:{data:[{price:{id:V2_LIVE_PLAN_PRICES[plan][currency]},quantity:1}]},
  total_discount_amounts:[],discounts:[]
 };
}
test('every approved V2 subscription price produces a validated paid receipt, never a legacy entitlement',()=>{
 for(const [plan,prices] of Object.entries(V2_LIVE_PLAN_PRICES))
  for(const currency of Object.keys(prices)){
   const evidence=verifyV2PaidSubscriptionInvoice(invoice(plan,currency),options);
   assert.equal(evidence.sourceKind,'subscription_invoice');
   assert.equal(evidence.verifiedUserId,owner);
   assert.equal(evidence.priceId,prices[currency]);
   assert.equal(evidence.creditVersion,'v2');
  }
});
test('unpaid, discounted, cross-customer or wrong currency invoice fails before ledger grant',()=>{
 const base=invoice();
 const rejected=[
  {...base,paid:false},{...base,status:'open'},
  {...base,currency:'usd'}, {...base,customer:'cus_other_123456'},
  {...base,amount_paid:1},{...base,total:1}, {...base,amount_due:0},
  {...base,total_discount_amounts:[{amount:20}]},
  {...base,discounts:['di_12345678']},
  {...base,lines:{data:[]}},
  {...base,lines:{data:[base.lines.data[0],base.lines.data[0]]}},
  {...base,lines:{data:[{price:{id:PRESERVED_LIVE_PLAN_PRICES.creator.BRL},quantity:1}]}},
  {...base,billing_reason:'subscription_update'}
 ];
 for(const item of rejected)
  assert.throws(()=>verifyV2PaidSubscriptionInvoice(item,options),/V2_INVOICE_PRICE_INVALID|V2_INVOICE_PAYMENT_UNVERIFIED/);
 assert.throws(()=>verifyV2PaidSubscriptionInvoice(base,{...options,requestingUserId:'22222222-2222-4222-8222-222222222222'}),/OWNERSHIP_UNVERIFIED/);
});
function session(currency){
 const cur=currency.toUpperCase(),amount=V2_SINGLE_VIDEO.minor[cur];
 return {
  livemode:true,mode:'payment',status:'complete',payment_status:'paid',
  client_reference_id:owner,
  metadata:{kind:'k4k_v2_single_video',user_id:owner,credit_version:'v2',product_id:V2_SINGLE_VIDEO.productId},
  currency:currency.toLowerCase(),
  amount_subtotal:amount,amount_total:amount,total_details:{amount_discount:0},
  automatic_tax:{enabled:true,status:'complete'},
  line_items:{data:[{price:{id:V2_SINGLE_VIDEO.prices[cur]},quantity:1}]},
  payment_intent:{id:'pi_paid_123456789',status:'succeeded',latest_charge:{refunded:false,disputed:false,amount_refunded:0}}
 };
}
test('verified one-time payment yields 140 V2 credits across GBP EUR USD BRL, not a subscription',()=>{
 for(const currency of ['GBP','EUR','USD','BRL']){
  const evidence=verifyV2PaidSingleVideoEvidence(session(currency),{requestingUserId:owner,verifiedOwnerUserId:owner});
  assert.equal(evidence.sourceKind,'single_video_payment');
  assert.equal(evidence.credits,140);
  assert.equal(evidence.currency,currency);
  assert.equal(evidence.receiptId,'pi_paid_123456789');
  assert.equal(evidence.creditVersion,'v2');
 }
});
test('unpaid, cross-owner and discounted Single video payments cannot grant anything',()=>{
 const sample=session('BRL');
 assert.throws(()=>verifyV2PaidSingleVideoEvidence(sample,{
  requestingUserId:owner,verifiedOwnerUserId:'22222222-2222-4222-8222-222222222222'
 }),/OWNERSHIP_UNVERIFIED/);
 assert.throws(()=>verifyV2PaidSingleVideoEvidence({...sample,payment_status:'unpaid'},{
  requestingUserId:owner,verifiedOwnerUserId:owner}),/SINGLE_VIDEO_/);
 assert.throws(()=>verifyV2PaidSingleVideoEvidence({...sample,amount_total:100},{
  requestingUserId:owner,verifiedOwnerUserId:owner}),/SINGLE_VIDEO_/);
});
