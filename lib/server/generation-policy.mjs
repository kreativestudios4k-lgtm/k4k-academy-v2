export function generationEnvironmentAllowed(env=process.env){return env.K4K_WAITLIST_ONLY!=='true'&&(env.VERCEL_ENV==='preview'||(env.VERCEL_ENV==='production'&&env.K4K_ENABLE_PRODUCTION_GENERATION==='true'&&env.K4K_PROVIDER_USE_APPROVED==='true'))}
export function generationProviderEnabled(env=process.env,provider='higgsfield'){return provider==='fal'?env.K4K_FAL_WAN_ENABLED==='true':provider==='higgsfield'&&env.HIGGSFIELD_GENJUTSU_ENABLED==='true'}
export function generationAccountBlocker({balance,billingHold,credits}={}){
 if(billingHold)return 'BILLING_REVIEW_REQUIRED';
 if(!Number.isSafeInteger(balance)||balance<0||!Number.isSafeInteger(credits)||credits<1||balance<credits)return 'INSUFFICIENT_CREDITS';
 return null;
}
export function generationUserAllowed(userId,env=process.env,provider='higgsfield'){
 if(!generationEnvironmentAllowed(env)||!generationProviderEnabled(env,provider))return false;
 if(env.VERCEL_ENV==='production')return env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED==='true';
 return env.K4K_ENABLE_TEST_GENERATION==='true'&&(env.K4K_GENERATION_TEST_USERS||'').split(',').map(x=>x.trim()).includes(userId);
}
