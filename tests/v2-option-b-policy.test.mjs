import test from 'node:test';
import assert from 'node:assert/strict';
import {
 OPTION_B_USD_MICROS_PER_V2_CREDIT,OPTION_B_USD_PER_V2_CREDIT,
 v2CreditsFromProviderMicros,quoteOptionBStandardMotion,
 singleVideoOfferForCurrency,requireVerifiedV2GenerationQuote,SINGLE_VIDEO_ENTITLEMENT
} from '../lib/server/v2-option-b-policy.mjs';
import {V2_SINGLE_VIDEO,PRESERVED_LIVE_PLAN_PRICES} from '../lib/server/v2-live-price-policy.mjs';

test('Option B is $0.012 per newly-denominated credit, independent of legacy grants',()=>{
 assert.equal(OPTION_B_USD_MICROS_PER_V2_CREDIT,12000);
 assert.equal(OPTION_B_USD_PER_V2_CREDIT,.012);
 assert.equal(v2CreditsFromProviderMicros(2100000),175);
 assert.equal(v2CreditsFromProviderMicros(1680000),140);
 assert.equal(PRESERVED_LIVE_PLAN_PRICES.starter.GBP,'price_1UbQB0L7fmdMaK0kr3CRE9bd');
});
test('standard motion estimates at 10,15,24,30 seconds are conservative and whole-numbered',()=>{
 assert.deepEqual([10,15,24,30].map(seconds=>quoteOptionBStandardMotion({seconds}).credits),[59,88,140,175]);
 const q=quoteOptionBStandardMotion({seconds:30});
 assert.equal(q.providerCostMicros,2100000);
 assert.equal(q.estimateOnly,true);
 assert.equal(q.providerRateVerifiedAtCheckout,false);
});
test('reference model duration constraints are strict, and unknown orientations fail',()=>{
 assert.equal(quoteOptionBStandardMotion({seconds:10,orientation:'image'}).credits,59);
 for(const spec of [{seconds:11,orientation:'image'},{seconds:31,orientation:'video'},
   {seconds:2,orientation:'video'},{seconds:15,orientation:'unknown'},{seconds:1.5}]){
  assert.throws(()=>quoteOptionBStandardMotion(spec),/UNSUPPORTED_MOTION_DURATION|INVALID_MOTION_QUOTE/);
 }
});
test('one-time Single video uses the existing four immutable LIVE prices without guaranteeing 30 seconds',()=>{
 assert.equal(SINGLE_VIDEO_ENTITLEMENT.credits,140);
 for(const currency of ['GBP','EUR','USD','BRL']){
  const preview=singleVideoOfferForCurrency(currency,{requestedQuote:quoteOptionBStandardMotion({seconds:30})});
  assert.equal(preview.priceId,V2_SINGLE_VIDEO.prices[currency]);
  assert.equal(preview.billing,'one_time');
  assert.equal(preview.credits,140);
  assert.equal(preview.doesNotGuaranteeThirtySeconds,true);
  assert.equal(preview.canCoverSelectedQuote,false);
  assert.equal(preview.missingCredits,35);
  assert.match(preview.disclosure,/140 V2 credits/i);
 }
});
test('single purchase can cover 24 seconds only at this exact example model/rate',()=>{
 const q=quoteOptionBStandardMotion({seconds:24});
 const offer=singleVideoOfferForCurrency('BRL',{requestedQuote:q});
 assert.equal(offer.canCoverSelectedQuote,true);
 assert.equal(offer.missingCredits,0);
 const longer=singleVideoOfferForCurrency('BRL',{requestedQuote:quoteOptionBStandardMotion({seconds:30})});
 assert.equal(longer.missingCredits,35);
});
test('unknown currency, untrusted quote and unverified provider rates fail closed',()=>{
 assert.throws(()=>singleVideoOfferForCurrency('JPY'),/UNSUPPORTED_CURRENCY/);
 assert.throws(()=>singleVideoOfferForCurrency('GBP',{requestedQuote:{credits:140,creditVersion:'legacy',estimateOnly:true}}),/INVALID_V2_QUOTE/);
 assert.throws(()=>requireVerifiedV2GenerationQuote(quoteOptionBStandardMotion({seconds:30})),/V2_QUOTE_NOT_VERIFIED/);
 assert.throws(()=>requireVerifiedV2GenerationQuote({
  credits:175,creditVersion:'v2',costPolicy:'v2-option-b-2026-11-19',
  estimateOnly:false,providerRateVerifiedAtCheckout:false,
  ownerVerified:true,signedQuoteVerified:true
 }),/V2_QUOTE_NOT_VERIFIED/);
});
