import {createClient} from '@supabase/supabase-js';
import {referralsEnabled} from '../../../../lib/server/referral-tracking.mjs';
import {isMatheusAccount,exclusivePartner,MATHEUS_TERMS} from '../../../../lib/server/matheus-partner.mjs';
export const runtime='nodejs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request){
 if(!referralsEnabled())return json({error:'PARTNER_PROGRAM_NOT_OPEN'},503);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return json({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!secret)return json({error:'UNAVAILABLE'},503);
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
 if(error||!user||user.is_anonymous)return json({error:'UNAUTHENTICATED'},401);
 if(!isMatheusAccount(user.id))return json({error:'PARTNER_NOT_ACTIVE'},403);
 const db=createClient(url,secret,options);
 try{if(!await exclusivePartner(db))return json({error:'PARTNER_NOT_ACTIVE'},403)}catch{return json({error:'UNAVAILABLE'},503)}
 const {data,error:statsError}=await db.rpc('k4k_app_partner_stats',{p_partner:user.id});
 if(statsError||!data)return json({error:'UNAVAILABLE'},503);
 if(!data.active)return json({error:'PARTNER_NOT_ACTIVE'},403);
 return json({...data,ambassador:MATHEUS_TERMS});
}
