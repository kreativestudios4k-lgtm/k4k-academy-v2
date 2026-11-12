import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../app/api/generation/jobs/readiness/route.js',import.meta.url),'utf8');
test('readiness authenticates and scopes all database reads to the user',()=>{
 assert.match(route,/auth\.auth\.getUser\(token\)/);
 assert.match(route,/\.eq\('id',body\.jobId\)\.eq\('user_id',user\.id\)/);
 assert.match(route,/studio_credit_accounts'\)\.select\('balance'\)\.eq\('user_id',user\.id\)/);
 assert.match(route,/verifyStudioMedia/);
});
test('readiness never reserves, refunds, submits or mutates',()=>{
 assert.doesNotMatch(route,/\.rpc\(|\.insert\(|\.update\(|\.delete\(|api\.higgsfield\.ai|createK4KModelProvider/);
 assert.match(route,/reservationReady:false,generationEnabled:false/);
 assert.match(route,/customerCreditPrice:null/);
});
test('readiness bearer header regex is valid',()=>{
 assert.match(route,/match\(\/\^Bearer \(\\S\+\)\$\/i\)/);
});
