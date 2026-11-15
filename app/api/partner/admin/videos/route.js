import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function context(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const ids=(process.env.K4K_AFFILIATE_ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!token)return {error:json({error:'UNAUTHENTICATED'},401)};
 if(!url||!key||!secret||!ids.length)return {error:json({error:'UNAVAILABLE'},503)};
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
 if(error||!user||user.is_anonymous||!ids.includes(user.id))return {error:json({error:'FORBIDDEN'},403)};
 return {db:createClient(url,secret,options),user};
}
export async function GET(request){const c=await context(request);if(c.error)return c.error;const {data,error}=await c.db.from('k4k_partner_videos').select('id,partner_id,platform,url,status,verified_views,bonus_brl_cents,created_at').order('created_at',{ascending:false}).limit(100);return error?json({error:'UNAVAILABLE'},503):json({videos:data});}
export async function POST(request){const c=await context(request);if(c.error)return c.error;let b;try{b=await request.json()}catch{return json({error:'INVALID_INPUT'},400)}
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(b?.id||'')||!['approved','rejected'].includes(b.status)||!Number.isSafeInteger(b.views)||b.views<0)return json({error:'INVALID_INPUT'},400);
 const {data,error}=await c.db.rpc('k4k_review_partner_video',{p_id:b.id,p_admin:c.user.id,p_status:b.status,p_views:b.views});
 return error?json({error:'REVIEW_FAILED'},409):json({video:data});
}
