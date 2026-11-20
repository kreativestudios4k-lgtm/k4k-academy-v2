// Synthetic Stripe evidence regression for verified .99 prices and preserved
// prior-V2 receipts. Never invokes Stripe LIVE, Supabase production or Checkout.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 V2_LIVE_PLAN_PRICES,V2_LIVE_PLAN_MINOR,V2_PRIOR_EUR_USD_PLAN_PRICES,
 V2_PRIOR_EUR_USD_PLAN_MINOR,V2_MONTHLY_CREDITS,V2_SINGLE_VIDEO,
 V2_PRIOR_EUR_USD_SINGLE_VIDEO,PRESERVED_LIVE_PLAN_PRICES,
 v2PriceMatch,preservedPriceMatch,v2SubscriptionPriceTerms,v2SingleVideoPriceTerms
} from '../lib/server/v2-live-price-policy.mjs';
import {invoiceCreditsForPrice} from '../lib/server/stripe-membership.mjs';
import {verifyV2PaidSubscriptionInvoice,verifyV2PaidSingleVideoEvidence}
 from '../lib/server/v2-stripe-paid-evidence.mjs';
import {prepareV2CheckoutIntent,createV2CheckoutSession,V2_CHECKOUT_WIRED_AND_VERIFIED}
 from '../lib/server/v2-checkout-intent.mjs';
const user='11111111-1111-4111-8111-111111111111';
const customer='cus_01234567890',subscription='sub_01234567890';
const env={VERCEL_ENV:'production',K4K_LIVE_PAYMENTS_ENABLED:'true',
 K4K_LIVE_PLAN_PRICES_JSON:JSON.stringify(PRESERVED_LIVE_PLAN_PRICES)};
const credentials={
 verifiedOwnerUserId:user,requestingUserId:user,verifiedCustomerId:customer,
 verifiedSubscriptionId:subscription
};
function paidInvoice(priceId,currency,minor){
 return {
  id:'in_01234567890',livemode:true,customer,subscription,
  status:'paid',paid:true,currency:currency.toLowerCase(),
  billing_reason:'subscription_cycle',
  amount_due:minor,amount_paid:minor,total:minor,amount_remaining:0,
  discounts:[],total_discount_amounts:[],
  lines:{data:[{price:{id:priceId},quantity:1}]}
 };
}
function paidSingle(priceId,currency,minor){
 return {
  livemode:true,mode:'payment',status:'complete',payment_status:'paid',
  client_reference_id:user,
  metadata:{kind:'k4k_v2_single_video',user_id:user,credit_version:'v2',
   product_id:V2_SINGLE_VIDEO.productId},
  currency:currency.toLowerCase(),amount_subtotal:minor,amount_total:minor,
  total_details:{amount_discount:0},automatic_tax:{enabled:true,status:'complete'},
  line_items:{data:[{price:{id:priceId},quantity:1}]},
  payment_intent:{id:'pi_01234567890',status:'succeeded',latest_charge:{
   refunded:false,disputed:false,amount_refunded:0
  }}
 };
}
test('new and previous V2 paid invoices grant same plan credits against their own immutable amounts',()=>{
 let count=0;
 for(const [priceMap,minorMap,historical] of [
  [V2_LIVE_PLAN_PRICES,V2_LIVE_PLAN_MINOR,false],
  [V2_PRIOR_EUR_USD_PLAN_PRICES,V2_PRIOR_EUR_USD_PLAN_MINOR,true]
 ]){
  for(const [plan,prices] of Object.entries(priceMap))
   for(const [currency,priceId] of Object.entries(prices)){
    const amountMinor=minorMap[plan][currency];
    const match=v2SubscriptionPriceTerms(priceId);
    assert.deepEqual(v2PriceMatch(priceId),{plan,currency});
    assert.equal(match.historical,historical);
    assert.equal(match.amountMinor,amountMinor);
    assert.equal(match.credits,V2_MONTHLY_CREDITS[plan]);
    assert.equal(invoiceCreditsForPrice(priceId,{liveMode:true,env}),V2_MONTHLY_CREDITS[plan]);
    const evidence=verifyV2PaidSubscriptionInvoice(
     paidInvoice(priceId,currency,amountMinor),credentials);
    assert.equal(evidence.priceId,priceId);
    assert.equal(evidence.amountMinor,amountMinor);
    assert.equal(evidence.credits,V2_MONTHLY_CREDITS[plan]);
    count++;
   }
 }
 assert.equal(count,24);
});
test('mismatched historical amount never grants; historic invoices cannot be repriced as .99',()=>{
 for(const [plan,prices] of Object.entries(V2_PRIOR_EUR_USD_PLAN_PRICES))
  for(const [currency,priceId] of Object.entries(prices)){
   const newPrice=V2_LIVE_PLAN_MINOR[plan][currency];
   const oldPrice=V2_PRIOR_EUR_USD_PLAN_MINOR[plan][currency];
   assert.notEqual(newPrice,oldPrice);
   assert.throws(()=>verifyV2PaidSubscriptionInvoice(
    paidInvoice(priceId,currency,newPrice),credentials),/V2_INVOICE_PAYMENT_UNVERIFIED/);
  }
});
test('historical legacy Starter €18.99/$20.99 IDs stay on 80-credit wallet, never V2',()=>{
 for(const currency of ['EUR','USD']){
  const priceId=PRESERVED_LIVE_PLAN_PRICES.starter[currency];
  assert.equal(v2PriceMatch(priceId),null);
  assert.deepEqual(preservedPriceMatch(priceId),{plan:'starter',currency});
  assert.equal(invoiceCreditsForPrice(priceId,{liveMode:true,env}),80);
  assert.equal(v2SubscriptionPriceTerms(priceId),null);
  assert.throws(()=>verifyV2PaidSubscriptionInvoice(
   paidInvoice(priceId,currency,V2_LIVE_PLAN_MINOR.starter[currency]),credentials),
   /V2_INVOICE_PRICE_INVALID/);
 }
});
test('current and old V2 one-time Price IDs each require the correct amount for 140 credits',()=>{
 let tested=0;
 for(const [catalog,historical] of [
  [V2_SINGLE_VIDEO,false],[V2_PRIOR_EUR_USD_SINGLE_VIDEO,true]
 ]){
  for(const [currency,priceId] of Object.entries(catalog.prices)){
   const amount=catalog.minor[currency];
   const terms=v2SingleVideoPriceTerms(priceId);
   assert.equal(terms.historical,historical);
   assert.equal(terms.amountMinor,amount);
   assert.equal(terms.credits,140);
   const evidence=verifyV2PaidSingleVideoEvidence(paidSingle(priceId,currency,amount),{
    verifiedOwnerUserId:user,requestingUserId:user
   });
   assert.equal(evidence.priceId,priceId);
   assert.equal(evidence.amountMinor,amount);
   assert.equal(evidence.credits,140);
   tested++;
   assert.throws(()=>verifyV2PaidSingleVideoEvidence(
    paidSingle(priceId,currency,amount+1),{
     verifiedOwnerUserId:user,requestingUserId:user
    }),/SINGLE_VIDEO_AMOUNT_MISMATCH/);
  }
 }
 assert.equal(tested,6);
});
test('draft checkout selects only latest V2 IDs, preserves 140-credit offer and stays hard-disabled',async()=>{
 for(const [country,currency] of Object.entries({GB:'GBP',DE:'EUR',US:'USD',BR:'BRL'})){
  for(const plan of Object.keys(V2_MONTHLY_CREDITS)){
   const a=prepareV2CheckoutIntent({
    verifiedUserId:user,trustedCountry:country,kind:'subscription',plan
   });
   assert.equal(a.priceId,V2_LIVE_PLAN_PRICES[plan][currency]);
   assert.equal(a.amountMinor,V2_LIVE_PLAN_MINOR[plan][currency]);
   assert.equal(a.credits,V2_MONTHLY_CREDITS[plan]);
   assert.equal(a.checkoutReady,false);
   if(['EUR','USD'].includes(currency))
    assert.notEqual(a.priceId,V2_PRIOR_EUR_USD_PLAN_PRICES[plan][currency]);
  }
  const one=prepareV2CheckoutIntent({verifiedUserId:user,trustedCountry:country,kind:'single_video'});
  assert.equal(one.priceId,V2_SINGLE_VIDEO.prices[currency]);
  assert.equal(one.credits,140);
  assert.equal(one.checkoutReady,false);
 }
 assert.equal(V2_CHECKOUT_WIRED_AND_VERIFIED,false);
 await assert.rejects(createV2CheckoutSession(),/V2_CHECKOUT_DISABLED/);
});
