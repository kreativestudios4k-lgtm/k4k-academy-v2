// Production requires separate explicit switches. Preview never accepts live money.
export function billingMode(env=process.env){return env.VERCEL_ENV==='production'&&env.K4K_LIVE_PAYMENTS_ENABLED==='true'?'live':'test'}
export function assertBillingKey(secret,env=process.env){
 const mode=billingMode(env);
 // Closing production checkout must never fall back to a sandbox key.
 if(env.VERCEL_ENV==='production'&&mode!=='live')throw Error('LIVE_CHECKOUT_DISABLED');
 if(typeof secret!=='string'||!(mode==='live'?(secret.startsWith('sk_live_')||secret.startsWith('rk_live_')):secret.startsWith('sk_test_')))throw Error(mode==='live'?'LIVE_KEY_NOT_CONFIGURED':'LIVE_CHECKOUT_DISABLED');
 return mode;
}
export function assertTaxReady(env=process.env){if(env.K4K_STRIPE_TAX_READY!=='true')throw Error('TAX_SETUP_REQUIRED')}

// Live checkout may not run against the legacy Academy ledger or before the
// independently verified customer journey and generation budget are ready.
export function assertLiveLaunchReady(env=process.env){
 if(billingMode(env)!=='live')return;
 if(env.K4K_APP_MEMBERSHIP_SEPARATION_READY!=='true')throw Error('APP_MEMBERSHIP_SEPARATION_REQUIRED');
 if(env.K4K_STRIPE_WEBHOOK_SECRET_VERIFIED!=='true'||!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))throw Error('WEBHOOK_SETUP_REQUIRED');
 if(env.K4K_PAYMENT_E2E_VERIFIED!=='true')throw Error('PAYMENT_E2E_REQUIRED');
 if(env.K4K_ENABLE_PRODUCTION_GENERATION!=='true'||env.K4K_PROVIDER_USE_APPROVED!=='true'||env.K4K_FAL_WAN_ENABLED!=='true'||env.K4K_FAL_RATE_CARD_APPROVED!=='true'||env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED!=='true'||env.K4K_GENERATION_BUDGET_GUARD_ENABLED!=='true')throw Error('GENERATION_NOT_READY');
}
