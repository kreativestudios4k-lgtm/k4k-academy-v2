import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {K4K_V2_PLANS} from '../lib/k4k-plan-v2.mjs';
const source=readFileSync(new URL('../app/api/plans-v2/checkout/route.js',import.meta.url),'utf8');
const qa=readFileSync(new URL('../app/k4k-app/plans-preview/qa/page.js',import.meta.url),'utf8');
test('isolated v2 checkout only accepts owner, preview and TEST key',()=>{
 assert.match(source,/K4K_PLAN_V2_OWNER_TEST_CHECKOUT/);
 assert.match(source,/v2PreviewAllowed\(env\)/); // gate imported from v2 preview helper
 assert.match(source,/user\.id!==process\.env\.K4K_PLAN_V2_OWNER_ID/);
 assert.match(source,/assertTestModeKey\(secret\)/);
 assert.match(source,/\.from\('memberships'\)/);
 assert.match(source,/EXISTING_TEST_SUBSCRIPTION/);
 assert.doesNotMatch(source,/livePrices|sk_live_/);
});
test('checkout binds the exact server catalogue price, trusted return and idempotency key',()=>{
 assert.match(source,/K4K_V2_PLANS\[body\.plan\]/);
 assert.match(source,/buildCheckoutForm\(\{priceId:plan\.priceId/);
 assert.match(source,/Idempotency-Key/);
 assert.match(source,/session\.livemode!==false/);
 assert.match(source,/\^cs_test_/);
 assert.match(source,/k4k-app\/plans-preview\/qa\?checkout=success/);
 assert.match(source,/stripe\.com/);
});
test('public plans remain unavailable for checkout and owner QA is separate',()=>{
 const page=readFileSync(new URL('../app/k4k-app/plans-preview/page.js',import.meta.url),'utf8');
 assert.match(page,/CHECKOUT DISABLED/);
 assert.doesNotMatch(page,/OwnerPlanQATool/);
 assert.match(qa,/K4K_PLAN_V2_OWNER_TEST_CHECKOUT/);
});
test('all four plan keys have distinct test price IDs',()=>{
 const ids=Object.values(K4K_V2_PLANS).map(p=>p.priceId);
 assert.equal(ids.length,4);assert.equal(new Set(ids).size,4);
 ids.forEach(id=>assert.match(id,/^price_/));
});

test('unauthenticated owner QA shows same-origin preview login and verifies auth',()=>{
 const client=readFileSync(new URL('../app/k4k-app/plans-preview/OwnerPlanQATool.js',import.meta.url),'utf8');
 const routes=readFileSync(new URL('../lib/customer-routes.mjs',import.meta.url),'utf8');
 assert.match(client,/LOGIN='\/login\?next=%2Fk4k-app%2Fplans-preview%2Fqa'/);
 assert.match(client,/supabase\.auth\.getUser\(\)/);
 assert.match(client,/QA-AUTH-V2/);
 assert.match(client,/Sign in to K4K to continue/);
 assert.match(routes,/requested==='\/k4k-app\/plans-preview\/qa'/);
 assert.doesNotMatch(client,/Sign in with the authorised owner account first/);
});
