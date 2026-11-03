import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteGeneration,DISABLED_MODEL_CATALOG} from '../lib/server/generation-quote.mjs';
const good={genjutsu:{verified:true,enabled:true,currency:'GBP',durations:[5,10],resolutions:['720p'],maxAllInCostPence:{'720p':{'5':50,'10':100}},quoteVersion:'test-only-v1'}};
const input={modelId:'genjutsu',durationSeconds:5,resolution:'720p'};
test('fails closed when no verified provider price is configured',()=>{
 assert.throws(()=>quoteGeneration(input,DISABLED_MODEL_CATALOG),/unavailable/);
});
test('rounds conservative all-in cost upward and includes quote version',()=>{
 assert.deepEqual(quoteGeneration(input,good),{...input,credits:36,currency:'GBP',estimatedProviderCostPence:50,quoteVersion:'test-only-v1'});
});
test('rejects unknown, disabled, unverified and non-GBP providers',()=>{
 for(const changes of [{verified:false},{enabled:false},{currency:'USD'},{maxAllInCostPence:{}}]){
  assert.throws(()=>quoteGeneration(input,{genjutsu:{...good.genjutsu,...changes}}));
 }
 assert.throws(()=>quoteGeneration({...input,modelId:'other'},good));
});
test('rejects unsupported options, unsafe input and cost ceilings',()=>{
 for(const changes of [{durationSeconds:4},{durationSeconds:1.5},{durationSeconds:100},{resolution:'4k'},{modelId:'../hack'}]){
  assert.throws(()=>quoteGeneration({...input,...changes},good));
 }
 assert.throws(()=>quoteGeneration(input,good,{pencePerCredit:2}));
 assert.throws(()=>quoteGeneration(input,{genjutsu:{...good.genjutsu,maxAllInCostPence:{'720p':{'5':-1}}}}));
});
