const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function manualPixEnabled(env=process.env){return env.K4K_MANUAL_PIX_ENABLED==='true'&&env.K4K_MANUAL_PIX_SCHEMA_READY==='true';}
export function manualPixLiveTestOnly(env=process.env){return env.VERCEL_ENV==='production'&&env.K4K_MANUAL_PIX_LIVE_TEST_ONLY==='true';}
export function manualPixUserAllowed(userId,env=process.env){
 if(!manualPixEnabled(env))return false;
 if(!manualPixLiveTestOnly(env))return true;
 const approved=env.K4K_MANUAL_PIX_LIVE_TEST_USER_ID;
 return uuid.test(approved||'')&&uuid.test(userId||'')&&userId===approved;
}
