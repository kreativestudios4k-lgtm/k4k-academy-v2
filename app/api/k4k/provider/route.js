import {NextResponse} from 'next/server';
import {createClient} from '../../../../lib/supabase/server';
import {PROVIDER_MODELS} from '../../../../lib/server/k4k-provider-router.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user) return NextResponse.json({error:'Authentication required'},{status:401,headers:{'Cache-Control':'no-store'}});
 // We intentionally do not authenticate to Higgsfield or spend API Units here.
 const configured=Boolean(process.env.HF_CREDENTIALS);
 return NextResponse.json({
  models:Object.values(PROVIDER_MODELS).map(({label})=>label),
  providerConfigured:configured,
  apiGenerationEnabled:false,
  reason:configured?'Credit ledger, paid entitlement and provider budget checks pending':'Provider secret not configured'
 },{headers:{'Cache-Control':'private, no-store'}});
}
