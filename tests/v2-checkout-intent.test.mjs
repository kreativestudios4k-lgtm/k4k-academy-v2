import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareV2CheckoutIntent,createV2CheckoutSession,V2_CHECKOUT_WIRED_AND_VERIFIED}
  from '../lib/server/v2-checkout-intent.mjs';
import {V2_LIVE_PLAN_PRICES,V2_MONTHLY_CREDITS,V2_SINGLE_VIDEO,PRESERVED_LIVE_PLAN_PRICES}
 from '../lib/server/v2-live-price-policy.mjs';
const user='11111111-1111-4111-8111-111111111111';
const options={verifiedUserId:user,kind:'subscription',trustedCountry:'GB',plan:'starter'};
test('all four V2 subscription plans resolve exact server-selected Stripe IDs for four geographic regions',()=>{
 const countries={GB:'GBP',DE:'EUR',US:'USD',BR:'BRL'};
 for(const [plan,expectedCredits] of Object.entries(V2_MONTHLY_CREDITS))
  for(const [country,currency] of Object.entries(countries)){
   const p=prepareV2CheckoutIntent({...options,plan,trustedCountry:country});
   assert.equal(p.currency,currency);assert.equal(p.priceId,V2_LIVE_PLAN_PRICES[plan][currency]);
   assert.equal(p.credits,expectedCredits);assert.equal(p.stripeMode,'subscription');
   assert.equal(p.checkoutReady,false);assert.equal(p.creditUsdMicros,12000);
  }
});
test('one-time 140-credit purchase never creates a subscription or guarantees a thirty-second generation',()=>{
 for(const [country,currency] of Object.entries({GB:'GBP',DE:'EUR',US:'USD',BR:'BRL'})){
  const intent=prepareV2CheckoutIntent({
   verifiedUserId:user,kind:'single_video',trustedCountry:country,hasActiveSubscription:true
  });
  assert.equal(intent.stripeMode,'payment');assert.equal(intent.plan,null);
  assert.equal(intent.credits,140);assert.equal(intent.priceId,V2_SINGLE_VIDEO.prices[currency]);
  assert.match(intent.customerDisclosure,/not a claim|30 seconds may need more credits/i);
  assert.equal(intent.checkoutReady,false);
 }
});
test('old Stripe IDs cannot be chosen by browser or moved into V2 checkout',()=>{
 assert.throws(()=>prepareV2CheckoutIntent({...options,browserPriceId:PRESERVED_LIVE_PLAN_PRICES.starter.GBP}),/CLIENT_PRICE_ID_MISMATCH/);
 assert.equal(prepareV2CheckoutIntent({...options}).priceId,'price_1UdblmL7fmdMaK0kyknLHpoV');
});
test('currency spoofing, unverified identity and promotions fail closed',()=>{
 assert.throws(()=>prepareV2CheckoutIntent({...options,verifiedUserId:'someone_else'}),/AUTH_REQUIRED/);
 assert.throws(()=>prepareV2CheckoutIntent({...options,trustedCountry:'br'}),/TRUSTED_REGION_REQUIRED/);
 assert.throws(()=>prepareV2CheckoutIntent({...options,trustedCountry:'DE',browserPriceId:V2_LIVE_PLAN_PRICES.starter.GBP}),/CLIENT_PRICE_ID_MISMATCH/);
 assert.throws(()=>prepareV2CheckoutIntent({...options,discountCode:'K4KBF26CREATOR3M_TEST'}),/DISCOUNT_QA_NOT_APPROVED/);
 assert.throws(()=>prepareV2CheckoutIntent({...options,hasActiveSubscription:true}),/EXISTING_SUBSCRIPTION/);
 assert.throws(()=>prepareV2CheckoutIntent({...options,kind:'single_video',plan:'starter'}),/SINGLE_VIDEO_NOT_SUBSCRIPTION/);
});
test('checkout always remains hard disabled even if an injected stripe adapter exists',async()=>{
 assert.equal(V2_CHECKOUT_WIRED_AND_VERIFIED,false);
 let called=0;
 await assert.rejects(createV2CheckoutSession({stripe:{checkout:{sessions:{create(){called++;}}}}}),/V2_CHECKOUT_DISABLED/);
 assert.equal(called,0);
});
