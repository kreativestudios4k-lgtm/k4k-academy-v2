import test from 'node:test';
import assert from 'node:assert/strict';
import {K4K_MONTHLY_PLAN,K4K_GENJUTSU_720P,quoteGenjutsu720p} from '../lib/server/generation-pricing.mjs';

const quote = (durationSeconds, extra = {}) => quoteGenjutsu720p({
  model:K4K_GENJUTSU_720P,durationSeconds,...extra,
});

test('£9.99 plan defines 100 credits without minting them',()=>{
 assert.deepEqual(K4K_MONTHLY_PLAN,{priceGbpPence:999,credits:100});
});
test('billable duration rounds up: four and ten seconds',()=>{
 assert.deepEqual({seconds:quote(4).billableSeconds,credits:quote(4).credits,mills:quote(4).providerMaxUsdMills},{seconds:4,credits:40,mills:2724});
 assert.deepEqual({seconds:quote(9.01).billableSeconds,credits:quote(9.01).credits,mills:quote(9.01).providerMaxUsdMills},{seconds:10,credits:100,mills:6810});
});
test('provider monetary ceiling rejects eleven seconds',()=>{
 assert.throws(()=>quote(10.01),/cost cap/);
});
test('rejects unsupported models and lower resolution rather than undercharging',()=>{
 assert.throws(()=>quote(5,{model:'other/model'}),/not approved/);
 assert.throws(()=>quote(5,{resolution:'480p'}),/not approved/);
});
test('rejects missing, spoofed, invalid and out-of-range durations',()=>{
 for(const duration of [undefined,null,'5',NaN,Infinity,-1,3.9,30.1]) {
  assert.throws(()=>quote(duration),/Video must/);
 }
});
test('quote results are immutable and have explicit revision',()=>{
 const result=quote(5);
 assert.equal(result.credits,50);
 assert.equal(result.providerMaxUsdMills,3405);
 assert.equal(result.pricingRevision,'preview-2026-11-02');
 assert.ok(Object.isFrozen(result));
});
