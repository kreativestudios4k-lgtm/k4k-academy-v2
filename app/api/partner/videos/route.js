import {createClient} from '@supabase/supabase-js';
import {referralsEnabled} from '../../../../lib/server/referral-tracking.mjs';
import {approvedPartner} from '../../../../lib/server/partner-policy.mjs';
export const runtime='nodejs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function context(request){
 if(!referralsEnabled())return {error:json({error:'PROGRAM_CLOSED'},503)};
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return {error:json({error:'UNAUTHENTICATED'},401)};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!secret)return {error:json({error:'UNAVAILABLE'},503)};
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
 if(error||!user||user.is_anonymous)return {error:json({error:'UNAUTHENTICATED'},401)};
 const db=createClient(url,secret,options);
 const {data:partner,error:err}=await db.from('k4k_app_partners').select('user_id,code,active,commission_bps').eq('user_id',user.id).maybeSingle();
 if(err)return {error:json({error:'UNAVAILABLE'},503)};
 if(!approvedPartner(partner)||partner.user_id!==user.id)return {error:json({error:'PARTNER_NOT_ACTIVE'},403)};
 return {db,user};
}
function normalizeVideo(raw){
 if(typeof raw!=='string'||raw.length>500)return null;
 try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
 const host=u.hostname.toLowerCase(),p=u.pathname;
 let m;if(['instagram.com','www.instagram.com'].includes(host)&&(m=p.match(/^\/(reel|p)\/([A-Za-z0-9_-]{5,80})\/?$/)))return {platform:'instagram',video_key:'instagram:'+m[2],url:'https://www.instagram.com/'+m[1]+'/'+m[2]+'/'};
 if(['tiktok.com','www.tiktok.com'].includes(host)&&(m=p.match(/^\/@([A-Za-z0-9_.]{1,32})\/video\/(\d{5,30})\/?$/)))return {platform:'tiktok',video_key:'tiktok:'+m[2],url:'https://www.tiktok.com/@'+m[1]+'/video/'+m[2]};
 }catch{}return null;
}
export async function GET(request){const c=await context(request);if(c.error)return c.error;const {data,error}=await c.db.from('k4k_partner_videos').select('id,platform,url,status,verified_views,bonus_brl_cents,created_at').eq('partner_id',c.user.id).order('created_at',{ascending:false}).limit(100);return error?json({error:'UNAVAILABLE'},503):json({videos:data});}
export async function POST(request){const c=await context(request);if(c.error)return c.error;let body;try{body=await request.json()}catch{return json({error:'INVALID_INPUT'},400)}const v=normalizeVideo(body?.url);if(!v||body.logo!==true||body.outro!==true)return json({error:'INVALID_VIDEO'},400);
 const {data,error}=await c.db.from('k4k_partner_videos').insert({...v,partner_id:c.user.id}).select('id,platform,url,status,verified_views,bonus_brl_cents,created_at').single();
 if(error)return json({error:error.code==='23505'?'ALREADY_SUBMITTED':'UNAVAILABLE'},error.code==='23505'?409:503);return json({video:data},201);}
