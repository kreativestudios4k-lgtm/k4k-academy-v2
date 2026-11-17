import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/api/plans-v2/advance-test-clock/route.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../app/k4k-app/plans-preview/OwnerPlanQATool.js',import.meta.url),'utf8');
test('clock advance is preview-only, owner-authenticated and hardcoded to a single test clock',()=>{
 for(const str of ['v2PreviewAllowed(env)','K4K_PLAN_V2_OWNER_TEST_CHECKOUT','sk_test_','auth.getUser(token)','user.id!==env.K4K_PLAN_V2_OWNER_ID','clock_1UcbK6L7fmdMaK0kkmocUbFl','sub_1UcbMbL7fmdMaK0ks4E7jNBR','cus_Vdt6TAJm7yrkwE','price_1UcaJsL7fmdMaK0kLOS4WqvG'])
  assert.ok(source.includes(str),str);
 assert.doesNotMatch(source,/sk_live_|createMembershipStore|studio_credit_accounts|k4k_apply_invoice_event/);
});
test('clock refuses arbitrary future time or clock id from the browser',()=>{
 assert.match(source,/body\.confirmation!=='ADVANCE_TEST_CLOCK_ONCE'/);
 assert.match(source,/Object\.keys\(body\)\.length!==1/);
 assert.match(source,/clock\.frozen_time!==INITIAL_FROZEN/);
 assert.match(source,/clock\.frozen_time>=RENEW_AT/);
 assert.match(source,/sub\.test_clock!==CLOCK/);
});
test('owner UI requires explicit consent and uses bearer auth',()=>{
 assert.match(client,/window\.confirm\(/);
 assert.match(client,/advance-test-clock/);
 assert.match(client,/Authorization:'Bearer '/);
 assert.match(client,/Advance Starter test clock once/);
});
