import test from 'node:test';
import assert from 'node:assert/strict';
import {
 EUR_USD_99_REVIEW_ONLY,EUR_USD_99_NEW_PRICE_IDS_APPROVED_AND_VERIFIED,
 EUR_USD_99_PROPOSED_MINOR,PROTECTED_GBP_BRL_MINOR,ECB_REFERENCE_20261119,
 eurUsd99ReviewLine,eurUsd99ReviewMatrix,ensureNoUnverifiedEurUsdPriceCutover
} from '../lib/server/v2-eur-usd-99-review.mjs';
import {
 V2_LIVE_PLAN_MINOR,V2_LIVE_PLAN_PRICES,V2_MONTHLY_CREDITS,
 V2_SINGLE_VIDEO,PRESERVED_LIVE_PLAN_PRICES
} from '../lib/server/v2-live-price-policy.mjs';

test('all ten proposed EUR/USD prices end .99 and remain unapproved, with no fabricated Price IDs',()=>{
 const lines=eurUsd99ReviewMatrix();
 assert.equal(lines.length,10);
 assert.equal(EUR_USD_99_REVIEW_ONLY,true);
 assert.equal(EUR_USD_99_NEW_PRICE_IDS_APPROVED_AND_VERIFIED,false);
 for(const line of lines){
  assert.equal(line.proposedMinor%100,99,line.plan+line.currency);
  assert.equal(line.replacementPriceId,null);
  assert.equal(line.checkoutReady,false);
  assert.match(line.currentLivePriceId,/^price_[A-Za-z0-9]+$/);
  assert.equal(line.changeMinor,line.proposedMinor-line.currentLiveMinor);
 }
 assert.throws(()=>ensureNoUnverifiedEurUsdPriceCutover(),/EUR_USD_99_CUTOVER_NOT_APPROVED/);
});

test('all existing GBP and Brazilian prices and credit allowances are unchanged',()=>{
 for(const [plan,fixed] of Object.entries(PROTECTED_GBP_BRL_MINOR)){
  if(plan==='single_video'){
   assert.equal(fixed.GBP,V2_SINGLE_VIDEO.minor.GBP);
   assert.equal(fixed.BRL,V2_SINGLE_VIDEO.minor.BRL);
   assert.equal(V2_SINGLE_VIDEO.credits,140);
  }else{
   assert.equal(fixed.GBP,V2_LIVE_PLAN_MINOR[plan].GBP);
   assert.equal(fixed.BRL,V2_LIVE_PLAN_MINOR[plan].BRL);
   assert.equal(eurUsd99ReviewLine(plan,'EUR').credits,V2_MONTHLY_CREDITS[plan]);
  }
 }
 assert.equal(V2_LIVE_PLAN_PRICES.creator.BRL,'price_1UdaNDL7fmdMaK0kGnfYnT0n');
 assert.equal(V2_LIVE_PLAN_PRICES.starter.GBP,'price_1UdblmL7fmdMaK0kyknLHpoV');
 assert.equal(PRESERVED_LIVE_PLAN_PRICES.starter.GBP,'price_1UbQB0L7fmdMaK0kr3CRE9bd');
});

test('reference FX conversions are reproducible and psychological rounding stays close to market',()=>{
 assert.equal(ECB_REFERENCE_20261119.rateDate,'2026-11-19');
 assert.ok(Math.abs(ECB_REFERENCE_20261119.EUR_PER_GBP-1.196444)<.00001);
 assert.ok(Math.abs(ECB_REFERENCE_20261119.USD_PER_GBP-1.315131)<.00001);
 for(const line of eurUsd99ReviewMatrix()){
  assert.equal(line.convertedMinor,Math.round(line.gbpMinor*line.referenceRate));
  // Market-reference comparisons are INFORMATIONAL; not tax/Stripe settlement
  // prices. The €6.99 one-time proposal is ~2.51% below its €7.17 conversion.
  // Keep a visible <=3% review boundary rather than hiding this choice.
  const deviation=Math.abs(line.proposedMinor-line.convertedMinor)/line.convertedMinor;
  assert.ok(deviation<.03,`${line.plan} ${line.currency} deviation ${(deviation*100).toFixed(2)}%`);
 }
});

test('all monthly tiers keep Starter < Creator < Pro < Studio ordering, Single remains one-time',()=>{
 for(const currency of ['EUR','USD']){
  const vals=['starter','creator','pro','studio'].map(plan=>eurUsd99ReviewLine(plan,currency).proposedMinor);
  for(let i=1;i<vals.length;i++)assert.ok(vals[i]>vals[i-1]);
  assert.equal(eurUsd99ReviewLine('single_video',currency).purchaseKind,'one_time');
  assert.equal(eurUsd99ReviewLine('creator',currency).purchaseKind,'monthly');
 }
});

test('legacy Starter EUR €18.99 and USD $20.99 cannot be reused for new 420-credit sales',()=>{
 for(const currency of ['EUR','USD']){
  const proposed=eurUsd99ReviewLine('starter',currency);
  assert.equal(proposed.historicalEntitlementCollision,true);
  assert.equal(proposed.credits,420);
  assert.notEqual(proposed.currentLivePriceId,PRESERVED_LIVE_PLAN_PRICES.starter[currency]);
  assert.equal(proposed.replacementPriceId,null);
 }
 assert.equal(PRESERVED_LIVE_PLAN_PRICES.starter.EUR,'price_1UbQBCL7fmdMaK0kAmHSt8oc');
 assert.equal(PRESERVED_LIVE_PLAN_PRICES.starter.USD,'price_1UbQBAL7fmdMaK0k2PtIGUDU');
});

test('unknown plan/currency is rejected rather than rounding and choosing a Stripe Price',()=>{
 assert.throws(()=>eurUsd99ReviewLine('starter','GBP'),/EUR_USD_ONLY/);
 assert.throws(()=>eurUsd99ReviewLine('starter','BRL'),/EUR_USD_ONLY/);
 assert.throws(()=>eurUsd99ReviewLine('secret','EUR'),/UNKNOWN_PLAN/);
 assert.equal(EUR_USD_99_PROPOSED_MINOR.single_video.EUR,699);
 assert.equal(EUR_USD_99_PROPOSED_MINOR.single_video.USD,799);
});
