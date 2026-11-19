import {test} from 'node:test';
import assert from 'node:assert/strict';
import {V2_CREDIT_ECONOMICS_SCENARIOS,V2_APPROVED_PROVIDER_USD_PER_CREDIT,quotedCreditsForProviderCost,assessV2Contribution,forecastPlanProviderCap} from '../lib/server/v2-credit-economics-preview.mjs';

const margin=(grossAmountLocal,credits,localUnitsPerUsd,providerUsdPerCredit)=>
 assessV2Contribution({grossAmountLocal,localUnitsPerUsd,credits,providerUsdPerCredit,
  includedTaxRate:0.20,processingPercent:0.035,processingFixedUsd:0.30,
  affiliatePercent:0.10,retryAndOverheadPercent:0.10,minimumNetContributionMargin:0.25});

test('fal public Kling 2.6 standard example: 30s at $0.07/sec needs 140 or 175 credits depending on policy',()=>{
 const providerUsd=30*.07;
 assert.equal(quotedCreditsForProviderCost(providerUsd,0.015),140);
 assert.equal(quotedCreditsForProviderCost(providerUsd,0.012),175);
 assert.equal(quotedCreditsForProviderCost(10*.07,0.015),47);
 assert.equal(quotedCreditsForProviderCost(30*.112,0.015),224);
});
test('V2 target allowance caps are far lower under proposed economics than legacy $0.10 per credit',()=>{
 assert.equal(forecastPlanProviderCap('starter',0.1),42);
 assert.equal(forecastPlanProviderCap('studio',0.1),336);
 assert.equal(forecastPlanProviderCap('starter',0.015),6.30);
 assert.equal(forecastPlanProviderCap('creator',0.015),12.60);
 assert.equal(forecastPlanProviderCap('pro',0.015),25.20);
 assert.equal(forecastPlanProviderCap('studio',0.015),50.40);
});
test('Brazil BF margin stress at assumed BRL/USD 6 and 20% included tax flags $0.015 as unsafe',()=>{
 const scenarios=[['starter',79.9,420],['creator',159.9,840],['pro',299.9,1680],['studio',599.9,3360]];
 for(const [plan,gross,credits] of scenarios){
  assert.equal(margin(gross,credits,6,0.015).passesReviewThreshold,false,plan);
  assert.equal(margin(gross,credits,6,0.012).passesReviewThreshold,true,plan);
 }
});
test('approved Creator regular R$224.90 improves margin vs unapproved BF introductory R$159.90',()=>{
 const intro=margin(159.9,840,5.3,0.015);
 const regular=margin(224.9,840,5.3,0.015);
 assert.ok(regular.marginOnNet>intro.marginOnNet);
});
test('input validation fails closed, including nonexistent plan and negative fees',()=>{
 assert.throws(()=>quotedCreditsForProviderCost(0,0.015),/INVALID_ECONOMICS_INPUT/);
 assert.throws(()=>forecastPlanProviderCap('invalid',0.015),/INVALID_PLAN/);
 assert.throws(()=>assessV2Contribution({grossAmountLocal:10,credits:100,providerUsdPerCredit:0.015,affiliatePercent:-1}),/INVALID_ECONOMICS_INPUT/);
});

test('Option B is approved for new credits only; historical option A remains comparison-only',()=>{
 assert.equal(V2_APPROVED_PROVIDER_USD_PER_CREDIT,0.012);
 assert.equal(V2_CREDIT_ECONOMICS_SCENARIOS.approvedOptionB,0.012);
 assert.notEqual(V2_CREDIT_ECONOMICS_SCENARIOS.previouslyConsideredOptionA,V2_APPROVED_PROVIDER_USD_PER_CREDIT);
});
