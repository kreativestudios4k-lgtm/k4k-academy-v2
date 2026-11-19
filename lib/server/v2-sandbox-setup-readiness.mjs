// READ-ONLY TEST preflight, not a credential verifier and not a release gate.
// A true "present" value never proves ownership or correct Stripe permissions.
// Never serialize, log, or return actual secret values, tester UUIDs or URLs.
export function assessV2SandboxSetup(env={}){
 const preview=env.VERCEL_ENV==='preview';
 const testProject=env.K4K_V2_SANDBOX_PROJECT_REF==='yhbhrkyihiyyfzqogyri'&&
  env.NEXT_PUBLIC_SUPABASE_URL==='https://yhbhrkyihiyyfzqogyri.supabase.co';
 const testSecret=typeof env.STRIPE_V2_TEST_SECRET_KEY==='string'&&
  /^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_V2_TEST_SECRET_KEY);
 const webhookSecret=typeof env.STRIPE_V2_TEST_WEBHOOK_SECRET==='string'&&
  /^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_V2_TEST_WEBHOOK_SECRET);
 const hasServiceRole=typeof env.SUPABASE_SERVICE_ROLE_KEY==='string'&&
  env.SUPABASE_SERVICE_ROLE_KEY.length>=20;
 const hasTestUsers=typeof env.K4K_V2_SANDBOX_ALLOWED_TEST_USERS==='string'&&
  env.K4K_V2_SANDBOX_ALLOWED_TEST_USERS.split(',').map(s=>s.trim())
   .some(s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s));
 const testAdapter=env.K4K_V2_SANDBOX_ADAPTER_ENABLED==='true'&&
  env.K4K_V2_SANDBOX_PROJECT_ISOLATED==='true';
 const webhookRouting=env.K4K_V2_SANDBOX_WEBHOOK_ENABLED==='true';
 // Captures the missing configuration, not assertions about endpoint
 // health, webhook delivery, auth, setup ownership, or payment success.
 const checks=Object.freeze({
  preview_environment:preview,
  isolated_test_project_configured:testProject,
  stripe_test_key_present:testSecret,
  stripe_test_webhook_secret_present:webhookSecret,
  test_service_key_present:hasServiceRole,
  approved_test_identity_present:hasTestUsers,
  test_adapter_flag_on:testAdapter,
  test_webhook_flag_on:webhookRouting,
  live_checkout_off:env.K4K_LIVE_PAYMENTS_ENABLED!=='true',
  production_generation_off:env.K4K_ENABLE_PRODUCTION_GENERATION!=='true'
 });
 const missing=Object.freeze(Object.entries(checks).filter(([,ok])=>!ok).map(([key])=>key));
 return Object.freeze({
  kind:'k4k_v2_stripe_test_preflight',
  checks,missing,
  configurationPresent:missing.length===0,
  // Even if every key is present, we have NOT proved a single real card
  // payment, signed webhook, renewal/refund or wallet credit grant.
  realTestPaymentVerified:false,
  protectedWebhookReachabilityVerified:false,
  productionCheckoutReady:false,
  note:'Only an environment-presence check; never proof of TEST payment or production readiness.'
 });
}
