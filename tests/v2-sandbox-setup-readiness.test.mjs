import test from 'node:test';
import assert from 'node:assert/strict';
import {assessV2SandboxSetup} from '../lib/server/v2-sandbox-setup-readiness.mjs';

const preview={
 VERCEL_ENV:'preview',
 K4K_V2_SANDBOX_PROJECT_REF:'yhbhrkyihiyyfzqogyri',
 NEXT_PUBLIC_SUPABASE_URL:'https://yhbhrkyihiyyfzqogyri.supabase.co',
 K4K_LIVE_PAYMENTS_ENABLED:'false',
 K4K_ENABLE_PRODUCTION_GENERATION:'false',
 K4K_V2_SANDBOX_PROJECT_ISOLATED:'true',
 K4K_V2_SANDBOX_ADAPTER_ENABLED:'false',
 K4K_V2_SANDBOX_WEBHOOK_ENABLED:'false'
};
const user='11111111-1111-4111-8111-111111111111';

test('currently protected Preview reports incomplete TEST wiring without leaking sensitive values',()=>{
 const result=assessV2SandboxSetup(preview);
 assert.equal(result.checks.preview_environment,true);
 assert.equal(result.checks.isolated_test_project_configured,true);
 assert.equal(result.checks.stripe_test_key_present,false);
 assert.equal(result.checks.stripe_test_webhook_secret_present,false);
 assert.equal(result.checks.test_service_key_present,false);
 assert.equal(result.checks.approved_test_identity_present,false);
 assert.equal(result.checks.test_adapter_flag_on,false);
 assert.equal(result.checks.test_webhook_flag_on,false);
 assert.equal(result.checks.live_checkout_off,true);
 assert.equal(result.checks.production_generation_off,true);
 assert.equal(result.configurationPresent,false);
 assert.equal(result.productionCheckoutReady,false);
 assert.equal(result.realTestPaymentVerified,false);
 assert.equal(result.protectedWebhookReachabilityVerified,false);
});
test('a filled TEST environment still cannot claim E2E payment validation or production launch readiness',()=>{
 const testEnv={
  ...preview,K4K_V2_SANDBOX_ADAPTER_ENABLED:'true',
  K4K_V2_SANDBOX_WEBHOOK_ENABLED:'true',
  STRIPE_V2_TEST_SECRET_KEY:'sk_test_fakefixture123456789',
  STRIPE_V2_TEST_WEBHOOK_SECRET:'whsec_fakefixture123456789',
  SUPABASE_SERVICE_ROLE_KEY:'sb_secret_fake_test_key_fixture',
  K4K_V2_SANDBOX_ALLOWED_TEST_USERS:user
 };
 const result=assessV2SandboxSetup(testEnv);
 assert.equal(result.configurationPresent,true);
 assert.deepEqual(result.missing,[]);
 assert.equal(result.productionCheckoutReady,false);
 assert.equal(result.realTestPaymentVerified,false);
 assert.equal(result.protectedWebhookReachabilityVerified,false);
 const encoded=JSON.stringify(result);
 for(const secret of [testEnv.STRIPE_V2_TEST_SECRET_KEY,testEnv.STRIPE_V2_TEST_WEBHOOK_SECRET,
  testEnv.SUPABASE_SERVICE_ROLE_KEY,user]){
  assert.equal(encoded.includes(secret),false,'secret or private account ID leaked');
 }
});
test('LIVE key, invalid tester, wrong project and production checkout flag fail setup readiness',()=>{
 const cases=[
  {STRIPE_V2_TEST_SECRET_KEY:'sk_live_incorrect12345'},
  {K4K_V2_SANDBOX_ALLOWED_TEST_USERS:'not-a-uuid'},
  {K4K_V2_SANDBOX_PROJECT_REF:'tqlvfqjvfqfigsauqjtl'},
  {K4K_LIVE_PAYMENTS_ENABLED:'true'},
  {VERCEL_ENV:'production'}
 ];
 const ready={
  ...preview,K4K_V2_SANDBOX_ADAPTER_ENABLED:'true',K4K_V2_SANDBOX_WEBHOOK_ENABLED:'true',
  STRIPE_V2_TEST_SECRET_KEY:'sk_test_good1234567',
  STRIPE_V2_TEST_WEBHOOK_SECRET:'whsec_good1234567',
  SUPABASE_SERVICE_ROLE_KEY:'sb_secret_long_nonprod_fixture',
  K4K_V2_SANDBOX_ALLOWED_TEST_USERS:user
 };
 for(const patch of cases){
  const result=assessV2SandboxSetup({...ready,...patch});
  assert.equal(result.configurationPresent,false);
  assert.ok(result.missing.length>0);
 }
});
