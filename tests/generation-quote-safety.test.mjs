import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estimateK4KProviderCost} from '../lib/server/k4k-models.mjs';
const route=readFileSync(new URL('../app/api/generation/jobs/quote/route.js',import.meta.url),'utf8');
test('draft quote requires authenticated user and owned job',()=>{
 assert.match(route,/auth\.getUser\(token\)/);
 assert.match(route,/\.eq\('user_id',user\.id\)/);
 assert.match(route,/verifyStudioMedia\(/);
});
test('quote never invokes provider or reserves customer credits',()=>{
 assert.doesNotMatch(route,/provider\.submit\(|\.reserve\(|k4k_generation_reserve_draft|\.rpc\(/);
 assert.match(route,/generationEnabled:false/);
 assert.match(route,/creditsReserved:0/);
});
test('trusted Lite provider quote calculates without any paid call',()=>{
 assert.equal(estimateK4KProviderCost('lite',{sourceSeconds:5,resolution:'720p'}),1);
 assert.throws(()=>estimateK4KProviderCost('pro',{sourceSeconds:3,resolution:'720p'}));
});
