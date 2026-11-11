export function generationEnvironmentAllowed(env=process.env){return env.K4K_WAITLIST_ONLY!=='true'&&(env.VERCEL_ENV==='preview'||(env.VERCEL_ENV==='production'&&env.K4K_ENABLE_PRODUCTION_GENERATION==='true'&&env.K4K_PROVIDER_USE_APPROVED==='true'))}
export function generationUserAllowed(userId,env=process.env){
 if(!generationEnvironmentAllowed(env)||env.HIGGSFIELD_GENJUTSU_ENABLED!=='true')return false;
 if(env.VERCEL_ENV==='production')return env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED==='true';
 return env.K4K_ENABLE_TEST_GENERATION==='true'&&(env.K4K_GENERATION_TEST_USERS||'').split(',').map(x=>x.trim()).includes(userId);
}
