// Protected Preview diagnostic only; never exposes secret values, bearer
// tokens, Stripe customer IDs, Supabase users or actual account balances.
import {NextResponse} from 'next/server';
import {assessV2SandboxSetup} from '../../../../../lib/server/v2-sandbox-setup-readiness.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export function GET(){
 const env=process.env;
 if(env.VERCEL_ENV!=='preview'||
   env.K4K_V2_SANDBOX_PROJECT_REF!=='yhbhrkyihiyyfzqogyri')
  return NextResponse.json({error:'NOT_FOUND'},{
   status:404,headers:{'Cache-Control':'no-store'}
  });
 const health=assessV2SandboxSetup(env);
 return NextResponse.json(health,{
  status:health.configurationPresent?200:503,
  headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}
 });
}
