import test from 'node:test';
import assert from 'node:assert/strict';
import {K4K_PLANS,K4K_PACKS,getPlan,providerBudgetPence,maximumProviderPencePerCredit,minimumCreditsForCost} from '../lib/k4k-app-pricing.mjs';
test('all four GBP tiers have unique increasing prices and credits',()=>{
 assert.deepEqual(K4K_PLANS.map(x=>x.gbpPence),[799,1499,2999,5999]);
 assert.deepEqual(K4K_PLANS.map(x=>x.monthlyCredits),[100,250,600,1400]);
 assert.equal(new Set(K4K_PLANS.map(x=>x.id)).size,4);
 assert.equal(getPlan('missing'),null);
});
test('top-up packs are one-time proposals without Stripe price IDs',()=>{
 assert.deepEqual(K4K_PACKS.map(x=>x.gbpPence),[699,1799,3999]);
 assert.deepEqual(K4K_PACKS.map(x=>x.credits),[100,300,750]);
 assert.ok(K4K_PLANS.every(x=>!('stripePriceId' in x)));
});
test('provider budgets leave room for fees and operating margin',()=>{
 const budgets=K4K_PLANS.map(p=>providerBudgetPence(p));
 assert.deepEqual(budgets,[264,501,1011,2029]);
 assert.ok(K4K_PLANS.every(p=>maximumProviderPencePerCredit(p)>1.4));
});
test('billable model units round up; invalid provider prices are rejected',()=>{
 assert.equal(minimumCreditsForCost(50,1.4),36);
 assert.equal(minimumCreditsForCost(0,1.4),1);
 assert.throws(()=>minimumCreditsForCost(-1,1.4));
 assert.throws(()=>minimumCreditsForCost(10,0));
 assert.throws(()=>providerBudgetPence(K4K_PLANS[0],{budgetFraction:2}));
});
