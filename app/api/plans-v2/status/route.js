import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {v2PreviewAllowed} from '../../../../lib/k4k-plan-v2.mjs';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
const respond=(body,status)=>NextResponse.json(body,{status,headers});
export async function GET(request){
 if(!v2PreviewAllowed()||process.env.K4K_PLAN_V2_OWNER_TEST_CHECKOUT!=='true')
  return respond({error:'NOT_AVAILABLE'},404);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!service)return respond({error:'NOT_READY'},503);
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await client.auth.getUser(token);
 if(error||!user||user.is_anonymous||user.id!==process.env.K4K_PLAN_V2_OWNER_ID)
  return respond({error:'NOT_AVAILABLE'},404);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const [wallet,grants]=await Promise.all([
  db.from('k4k_v2_qa_wallets').select('balance').eq('user_id',user.id).maybeSingle(),
  db.from('k4k_v2_qa_grants').select('stripe_invoice_id,credits,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10)
 ]);
 if(wallet.error||grants.error)return respond({error:'LEDGER_UNAVAILABLE'},503);
 return respond({testMode:true,balance:wallet.data?.balance??0,grants:grants.data??[]},200);
}
