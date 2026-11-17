import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {K4K_V2_PLANS,v2PreviewAllowed,v2PriceEntitlement,v2InvoiceCredits,safeV2GenerationQuote,stressV2Plan} from '../lib/k4k-plan-v2.mjs';
import {planForPrice,PLAN_CREDITS} from '../lib/server/stripe-membership.mjs';
import {handleStripeEvent} from '../lib/server/stripe-webhook-handler.mjs';
import {PLAN_PRICES} from '../lib/k4k-plan-prices.mjs';
const preview={VERCEL_ENV:'preview',K4K_PLAN_V2_PREVIEW:'true'};
test('new catalog matches four immutable Stripe test GBP prices and Pro is featured',()=>{
 const expected={starter:[1599,400],creator:[3499,1100],pro:[6999,2700],studio:[13999,6200]};
 assert.deepEqual(Object.keys(K4K_V2_PLANS),Object.keys(expected));
 for(const [key,[gbpMinor,credits]] of Object.entries(expected)){
  const p=K4K_V2_PLANS[key];assert.equal(p.gbpMinor,gbpMinor);assert.equal(p.credits,credits);
  assert.match(p.priceId,/^price_/);assert.equal(v2InvoiceCredits(p.priceId,{env:preview}),credits);
  assert.equal(planForPrice(p.priceId,{liveMode:false,env:preview}).plan,key);
  assert.equal(v2PriceEntitlement(p.priceId,{liveMode:true,env:preview}),null);
 }
 assert.equal(K4K_V2_PLANS.pro.featured,true);
 assert.equal(Object.values(K4K_V2_PLANS).filter(p=>p.featured).length,1);
});
test('existing Stripe prices and credit allowances stay grandfathered across all environments',()=>{
 assert.deepEqual(PLAN_CREDITS,{starter:80,creator:160,pro:340,studio:700});
 for(const [key,p] of Object.entries(PLAN_PRICES)){
  assert.equal(planForPrice(p.stripePriceIds.GBP,{liveMode:false,env:preview}).plan,key);
  assert.equal(v2InvoiceCredits(p.stripePriceIds.GBP,{env:preview}),null);
 }
});
test('new price IDs fail closed outside explicit preview and never appear in live catalogue',()=>{
 assert.equal(v2PreviewAllowed({VERCEL_ENV:'production',K4K_PLAN_V2_PREVIEW:'true'}),false);
 for(const p of Object.values(K4K_V2_PLANS)){
  assert.equal(v2InvoiceCredits(p.priceId,{liveMode:true,env:preview}),null);
  assert.throws(()=>planForPrice(p.priceId,{liveMode:false,env:{VERCEL_ENV:'preview'}}),/UNKNOWN_PRICE/);
 }
});
test('generation quote needs verified provider USD, rounds up, blocks >5 USD and insufficient wallet',()=>{
 assert.throws(()=>safeV2GenerationQuote({verifiedProviderUsd:3.97}),/PROVIDER_QUOTE_REQUIRED/);
 assert.equal(safeV2GenerationQuote({verifiedProviderUsd:3.97,verifiedProviderQuote:true}).credits,249);
 assert.equal(safeV2GenerationQuote({verifiedProviderUsd:5,verifiedProviderQuote:true}).credits,313);
 assert.throws(()=>safeV2GenerationQuote({verifiedProviderUsd:8.51,verifiedProviderQuote:true}),/PROVIDER_BUDGET_BLOCKED/);
 assert.throws(()=>safeV2GenerationQuote({verifiedProviderUsd:3.97,verifiedProviderQuote:true,customerCredits:10}),/INSUFFICIENT_CREDITS/);
 assert.throws(()=>safeV2GenerationQuote({verifiedProviderUsd:0,verifiedProviderQuote:true}),/PROVIDER_QUOTE_REQUIRED/);
});
test('stress test flags discount + affiliate + full-credit burn for Studio before launch',()=>{
 const s=stressV2Plan('studio',{gbpPerUsd:0.80,creditUse:1,discountRate:0.10,affiliateRate:0.10});
 assert.equal(s.launchMarginPass,false);
 assert.ok(s.providerGbp>70);
 const light=stressV2Plan('starter',{gbpPerUsd:0.80,creditUse:0.5});
 assert.ok(light.contributionMargin>0);
});
test('preview pricing page cannot start a Checkout or disclose credentials',()=>{
 const src=readFileSync(new URL('../app/k4k-app/plans-preview/page.js',import.meta.url),'utf8');
 assert.match(src,/v2PreviewAllowed\(\)/);
 assert.match(src,/CHECKOUT DISABLED/);
 assert.match(src,/COMING SOON/);
 assert.doesNotMatch(src,/stripe\.com|\/api\/billing\/checkout|STRIPE_SECRET_KEY/);
});
function invoice(priceId,id){return {id:'evt_'+id,type:'invoice.paid',livemode:false,created:1794875000,data:{object:{id:'in_'+id,customer:'cus_test',subscription:'sub_test',billing_reason:'subscription_cycle',lines:{data:[{price:{id:priceId},period:{end:1795000000}}]}}}}}
function store(){let seen=new Set(),grants=[];return {grants,async hasProcessedEvent(id){return seen.has(id)},async userIdForCustomer(){return 'user-test'},async applyInvoiceEvent(x){grants.push(x.credits);seen.add(x.eventId);return {handled:true}},async markProcessed({eventId}){seen.add(eventId)}}}
test('paid v2 test invoice grants exactly once, legacy test invoice grants old amount',async()=>{
 const v2=store();const event=invoice(K4K_V2_PLANS.pro.priceId,'v2');
 await handleStripeEvent(event,v2,{liveMode:false,env:preview});
 await handleStripeEvent(event,v2,{liveMode:false,env:preview});
 assert.deepEqual(v2.grants,[2700]);
 const legacy=store();await handleStripeEvent(invoice(PLAN_PRICES.pro.stripePriceIds.GBP,'legacy'),legacy,{liveMode:false,env:preview});
 assert.deepEqual(legacy.grants,[340]);
});
test('unknown v2 invoice in disabled preview rejects before financial mutation',async()=>{
 const s=store();
 await assert.rejects(()=>handleStripeEvent(invoice(K4K_V2_PLANS.creator.priceId,'disabled'),s,{liveMode:false,env:{VERCEL_ENV:'preview'}}),/UNKNOWN_PRICE/);
 assert.deepEqual(s.grants,[]);
});
