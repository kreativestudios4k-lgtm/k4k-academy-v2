// Separate production opt-in; preview flags never authorize public generation.
export const HIGGSFIELD_PREVIEW_OWNER='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
export function higgsfieldPublicEnabled(env=process.env){return env.VERCEL_ENV==='production'&&env.K4K_HIGGSFIELD_CUSTOMERS_ENABLED==='true'&&env.K4K_WAITLIST_ONLY!=='true'&&env.K4K_ENABLE_PRODUCTION_GENERATION==='true'&&env.K4K_PROVIDER_USE_APPROVED==='true'&&env.K4K_LIVE_CREDIT_ISOLATION_READY==='true';}
export function higgsfieldFlowEnabled(env=process.env){return higgsfieldPublicEnabled(env)||(env.VERCEL_ENV==='preview'&&env.K4K_HIGGSFIELD_CUSTOMER_FLOW_PREVIEW==='true');}
export function higgsfieldQuoteEnabled(env=process.env){return higgsfieldPublicEnabled(env)||(env.VERCEL_ENV==='preview'&&env.K4K_HIGGSFIELD_CUSTOMER_QUOTE_PREVIEW==='true');}
export function higgsfieldDispatchEnabled(env=process.env){return higgsfieldPublicEnabled(env)?env.K4K_HIGGSFIELD_DISPATCH_ENABLED==='true':env.VERCEL_ENV==='preview'&&env.K4K_HIGGSFIELD_CUSTOMER_DISPATCH_PREVIEW==='true'&&env.K4K_HIGGSFIELD_GENERATION_PILOT_ENABLED==='true';}
export function higgsfieldUserAllowed(user,env=process.env){return !!user&&!user.is_anonymous&&(higgsfieldPublicEnabled(env)||(env.VERCEL_ENV==='preview'&&user.id===HIGGSFIELD_PREVIEW_OWNER));}
export function higgsfieldCustomerEnv(env=process.env){return env.VERCEL_ENV==='production'?{...env,K4K_GENERATION_QUOTE_SECRET:env.K4K_HIGGSFIELD_QUOTE_SECRET}:env;}
