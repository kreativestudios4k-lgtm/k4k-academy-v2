import {createClient} from '@supabase/supabase-js';
import {accountMembershipView} from '../../../../lib/server/account-membership-view.mjs';
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
 const legacy=await client.from('memberships').select(fields+',stripe_subscription_id,stripe_price_id').eq('user_id',user.id).maybeSingle();
 if(legacy.error)return json({error:'UNAVAILABLE'},503);
 // Look up only the authenticated owner's existing subscription. Never infer
 // Academy status from the plan label: legacy Academy customers use starter.
 let academyClaim=false;
 if(legacy.data?.stripe_subscription_id){
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!serviceKey)return json({error:'UNAVAILABLE'},503);
  const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const claim=await service.from('academy_subscription_claims').select('stripe_subscription_id').eq('stripe_subscription_id',legacy.data.stripe_subscription_id).maybeSingle();
  if(claim.error)return json({error:'UNAVAILABLE'},503);
  academyClaim=Boolean(claim.data);
 }
 const production=process.env.VERCEL_ENV==='production';
 const app=production?await client.from('k4k_app_memberships').select(fields).eq('user_id',user.id).maybeSingle():{data:null,error:null};
 if(app.error)return json({error:'UNAVAILABLE'},503);
 const wallet=await client.from(production?'k4k_live_credit_accounts':'studio_credit_accounts').select('balance,billing_hold').eq('user_id',user.id).maybeSingle();
 if(wallet.error)return json({error:'UNAVAILABLE'},503);
 return json({...accountMembershipView({legacy:legacy.data,app:app.data,academyClaim,production}),creditBalance:wallet.data?.balance??0,billingHold:wallet.data?.billing_hold??false,creditMode:production?'live':'test'});
}
