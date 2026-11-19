import test from 'node:test';
import assert from 'node:assert/strict';
import {
 V2_LIVE_PLAN_PRICES,V2_MONTHLY_CREDITS,V2_SINGLE_VIDEO,
 PRESERVED_LIVE_PLAN_PRICES,V2_CHECKOUT_RELEASE_GATES,
 v2PriceMatch,preservedPriceMatch,v2HasSharedLegacyPrice,v2ManifestMatches
} from '../lib/server/v2-live-price-policy.mjs';
import {livePrices,NEW_GBP_PRICES} from '../lib/server/live-price-config.mjs';
import {planForPrice,invoiceCreditsForPrice,PLAN_CREDITS} from '../lib/server/stripe-membership.mjs';
import {isK4KLiveEvent} from '../lib/server/live-webhook-scope.mjs';
import {handleStripeEvent} from '../lib/server/stripe-webhook-handler.mjs';

const env={VERCEL_ENV:'production',K4K_LIVE_PAYMENTS_ENABLED:'true',
 K4K_LIVE_PLAN_PRICES_JSON:JSON.stringify(PRESERVED_LIVE_PLAN_PRICES)};
const approved=Object.fromEntries(V2_CHECKOUT_RELEASE_GATES.map(key=>[key,'true']));
const v2Env={...env,...approved,K4K_LIVE_PLAN_PRICES_JSON:JSON.stringify(V2_LIVE_PLAN_PRICES)};

test('all 16 V2 prices map to a currency and plan; all historic prices are distinct from V2 including Starter GBP',()=>{
 let count=0;
 for(const [plan,prices] of Object.entries(V2_LIVE_PLAN_PRICES))
  for(const [currency,id] of Object.entries(prices)){
   assert.deepEqual(v2PriceMatch(id),{plan,currency});
   assert.deepEqual(planForPrice(id,{liveMode:true,env}),{plan,currency});
   count++;
  }
 assert.equal(count,16);
 assert.equal(v2ManifestMatches(V2_LIVE_PLAN_PRICES),true);
 assert.equal(v2HasSharedLegacyPrice(V2_LIVE_PLAN_PRICES),false);
});

test('all 16 original LIVE prices are still attributable with the V2 active map',()=>{
 for(const [plan,prices] of Object.entries(PRESERVED_LIVE_PLAN_PRICES))
  for(const [currency,id] of Object.entries(prices)){
   assert.deepEqual(preservedPriceMatch(id),{plan,currency});
   assert.deepEqual(planForPrice(id,{liveMode:true,env:v2Env}),{plan,currency});
   assert.equal(invoiceCreditsForPrice(id,{liveMode:true,env:v2Env}),PLAN_CREDITS[plan]);
  }
});

test('new distinct prices have higher entitlements, legacy starter remains 80',()=>{
 for(const [plan,prices] of Object.entries(V2_LIVE_PLAN_PRICES))
  for(const [currency,id] of Object.entries(prices)){
   const expected=preservedPriceMatch(id)?PLAN_CREDITS[plan]:V2_MONTHLY_CREDITS[plan];
   assert.equal(invoiceCreditsForPrice(id,{liveMode:true,env}),expected);
  }
 assert.equal(invoiceCreditsForPrice(V2_LIVE_PLAN_PRICES.starter.GBP,{liveMode:true,env}),420);
 assert.equal(invoiceCreditsForPrice(PRESERVED_LIVE_PLAN_PRICES.starter.GBP,{liveMode:true,env}),80);
 assert.equal(invoiceCreditsForPrice(NEW_GBP_PRICES.starter,{liveMode:true,env}),100);
});

test('new V2 catalogue still cannot open Checkout until transactional credit ledger is actually integrated',()=>{
 assert.deepEqual(livePrices('plans',env),PRESERVED_LIVE_PLAN_PRICES);
 assert.throws(()=>livePrices('plans',{...env,K4K_LIVE_PLAN_PRICES_JSON:JSON.stringify(V2_LIVE_PLAN_PRICES)}),/V2_CUTOVER_QA_REQUIRED/);
 assert.throws(()=>livePrices('plans',v2Env),/V2_CUTOVER_QA_REQUIRED/);
 assert.throws(()=>livePrices('plans',{...v2Env,K4K_LIVE_PLAN_PRICES_JSON:JSON.stringify({...V2_LIVE_PLAN_PRICES,creator:{...V2_LIVE_PLAN_PRICES.creator,BRL:'price_incorrect'}})}),/V2_CUTOVER_QA_REQUIRED/);
});

test('live webhook identifies grandfathered BRL and future distinct V2 prices even after map switch',()=>{
 const invoice=id=>({livemode:true,type:'invoice.paid',data:{object:{lines:{data:[{price:{id}}]}}}});
 assert.equal(isK4KLiveEvent(invoice(PRESERVED_LIVE_PLAN_PRICES.creator.BRL),v2Env),true);
 assert.equal(isK4KLiveEvent(invoice(V2_LIVE_PLAN_PRICES.creator.BRL),env),true);
 assert.equal(isK4KLiveEvent(invoice('price_not_ours'),v2Env),false);
});

test('webhook routes paid V2 Creator invoice exclusively to versioned credit adapter',async()=>{
 let actual=null;const store={
  async hasProcessedEvent(){return false;},
  async userIdForCustomer(){return 'user_1';},
  async applyInvoiceEvent(){throw Error('LEGACY_CREDIT_ROUTE_CALLED');},
  async applyV2InvoiceEvent(receipt){actual=receipt;return {handled:true,credits:receipt.credits};}
 };
 const event={livemode:true,id:'evt_V2_creator',type:'invoice.paid',created:1800000000,data:{object:{
  id:'in_V2_creator',customer:'cus_1',subscription:'sub_1',billing_reason:'subscription_cycle',
  lines:{data:[{price:{id:V2_LIVE_PLAN_PRICES.creator.BRL},period:{end:1802000000}}]}
 }}};
 const result=await handleStripeEvent(event,store,{liveMode:true,env});
 assert.equal(result.credits,840);assert.equal(actual.credits,840);
});

test('one-time video credits remain catalogued but are not falsely processed as subscription invoices',()=>{
 assert.equal(V2_SINGLE_VIDEO.credits,140);
 for(const id of Object.values(V2_SINGLE_VIDEO.prices)){
  assert.equal(v2PriceMatch(id),null);assert.equal(preservedPriceMatch(id),null);
  assert.throws(()=>planForPrice(id,{liveMode:true,env}),/UNKNOWN_PRICE/);
 }
});

test('without a V2 adapter, LIVE paid invoices fail without crediting the legacy wallet',async()=>{
 const priceId=V2_LIVE_PLAN_PRICES.starter.GBP;
 const event={livemode:true,id:'evt_unsafe_v2',type:'invoice.paid',created:1800000001,data:{object:{
  id:'in_unsafe_v2',customer:'cus_2',subscription:'sub_2',billing_reason:'subscription_cycle',
  lines:{data:[{price:{id:priceId},period:{end:1802000000}}]}
 }}};
 const store={hasProcessedEvent:async()=>false,userIdForCustomer:async()=> 'user_2',
  applyInvoiceEvent:async()=>{throw Error('LEGACY_WALLET_MUST_NOT_BE_WRITTEN');}};
 await assert.rejects(handleStripeEvent(event,store,{liveMode:true,env}),/V2_CREDIT_LEDGER_UNAVAILABLE/);
});
