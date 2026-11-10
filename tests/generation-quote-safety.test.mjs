import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estimateK4KProviderCost} from '../lib/server/k4k-models.mjs';
const route=readFileSync(new URL('../app/api/generation/jobs/quote/route.js',import.meta.url),'utf8');
const context=readFileSync(new URL('../lib/server/generation-route-context.mjs',import.meta.url),'utf8');
test('draft quote requires authenticated user and owned job',()=>{
 assert.match(context,/auth\.getUser\(token\)/);
 assert.match(context,/\.eq\('user_id',user\.id\)/);
 assert.match(context,/verifyStudioMedia\(/);
});
test('quote uses non-generating provider estimate without reserving customer credits',()=>{
 assert.doesNotMatch(route,/provider\.submit\(|\.reserve\(|k4k_generation_reserve_draft|\.rpc\(/);
 assert.match(route,/\.estimate\(job\.model,input,/ );
 assert.match(route,/generationCredits\(usd\)/);
 assert.match(route,/quoteSigner/);
 assert.match(route,/creditsReserved:0/);
});
test('trusted Lite provider quote calculates without any paid call',()=>{
 assert.equal(estimateK4KProviderCost('lite',{sourceSeconds:5,resolution:'720p'}),0.5);
 assert.throws(()=>estimateK4KProviderCost('pro',{sourceSeconds:3,resolution:'720p'}));
});
