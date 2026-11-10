// Production requires separate explicit switches. Preview never accepts live money.
export function billingMode(env=process.env){return env.VERCEL_ENV==='production'&&env.K4K_LIVE_PAYMENTS_ENABLED==='true'?'live':'test'}
export function assertBillingKey(secret,env=process.env){
 const mode=billingMode(env);
 if(typeof secret!=='string'||!secret.startsWith(mode==='live'?'sk_live_':'sk_test_'))throw Error(mode==='live'?'LIVE_KEY_NOT_CONFIGURED':'LIVE_CHECKOUT_DISABLED');
 return mode;
}
export function assertTaxReady(env=process.env){if(env.K4K_STRIPE_TAX_READY!=='true')throw Error('TAX_SETUP_REQUIRED')}
