import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return json({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return json({error:'UNAVAILABLE'},503);
 const client=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await client.auth.getUser(token);
 if(error||!user||user.is_anonymous)return json({error:'UNAUTHENTICATED'},401);
 const fields='status,plan,current_period_end,cancel_at_period_end';
 const legacy=await client.from('memberships').select(fields).eq('user_id',user.id).maybeSingle();
 if(legacy.error)return json({error:'UNAVAILABLE'},503);
 // Preview QA uses the old test-only ledger. Production never treats an
 // Academy subscription or a preview Stripe test as a paid K4K APP plan.
 if(process.env.VERCEL_ENV!=='production')return json({app:legacy.data,academy:null});
 const app=await client.from('k4k_app_memberships').select(fields).eq('user_id',user.id).maybeSingle();
 if(app.error)return json({error:'UNAVAILABLE'},503);
 const academy=legacy.data&&!['starter','creator','pro','studio'].includes(legacy.data.plan)?legacy.data:null;
 return json({app:app.data,academy});
}
