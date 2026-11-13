import test from 'node:test';
import assert from 'node:assert/strict';
import {proposedGenerationCredits as estimate,CREDIT_PACKS,CREDIT_PROPOSAL} from '../lib/k4k-credit-proposal.mjs';
test('verified test job is 42 proposed credits, with ceiling rather than undercharging',()=>assert.deepEqual(estimate({model:'pro',resolution:'480p',seconds:12.867}),{providerUsd:4.134,credits:42}));
test('Lite includes source duration as well as rounded output seconds',()=>assert.deepEqual(estimate({model:'lite',resolution:'720p',seconds:5.2}),{providerUsd:1.12,credits:12}));
test('unsupported durations and prototype keys cannot produce a credit estimate',()=>{for(const input of [{seconds:NaN},{seconds:3},{seconds:16},{model:'pro',seconds:31},{model:'toString'},{resolution:'constructor'}])assert.throws(()=>estimate(input));});
test('commercial proposal cannot enable payments and packs are positive in all markets',()=>{assert.equal(CREDIT_PROPOSAL.paymentsEnabled,false);for(const pack of CREDIT_PACKS)for(const key of ['GBP','EUR','USD','BRL'])assert.ok(Number.isSafeInteger(pack[key])&&pack[key]>0);});

test('fal credit calculator follows the fixed resolution tiers and output billing',()=>{assert.deepEqual(estimate({provider:'fal',model:'lite',resolution:'720p',seconds:5}),{providerUsd:0.7,credits:7});assert.deepEqual(estimate({provider:'fal',model:'pro',resolution:'1080p',seconds:5}),{providerUsd:1.4,credits:14});assert.throws(()=>estimate({provider:'fal',model:'pro',resolution:'720p',seconds:5}));});
