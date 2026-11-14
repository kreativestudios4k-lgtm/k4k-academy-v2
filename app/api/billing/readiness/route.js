import {createClient} from '@supabase/supabase-js';
import {assertBillingKey,assertTaxReady,billingMode,assertLiveLaunchReady,ownerLivePilot} from '../../../../lib/server/billing-policy.mjs';
import {livePrices} from '../../../../lib/server/live-price-config.mjs';
import {launchLimits} from '../../../../lib/server/soft-launch.mjs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(process.env.K4K_WAITLIST_ONLY==='true')return Response.json({mode:billingMode(),checkoutReady:false,topupsReady:false,reason:'WAITLIST_ONLY'},{headers:{'Cache-Control':'no-store'}});
 if(process.env.VERCEL_ENV==='production'&&billingMode()!=='live')return Response.json({mode:'closed',checkoutReady:false,topupsReady:false,reason:'LIVE_CHECKOUT_DISABLED'},{headers:{'Cache-Control':'no-store'}});
 let reason=null;let checkoutReady=false;let topupsReady=false;
 const pilot=ownerLivePilot();let userId;
 if(pilot){
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(token&&url&&key){try{const {data:{user}={},error}=await createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).auth.getUser(token);if(!error&&user&&!user.is_anonymous)userId=user.id}catch{}}
 }
 try{assertTaxReady();assertBillingKey(process.env.STRIPE_SECRET_KEY);livePrices('plans');if(billingMode()==='live'){assertLiveLaunchReady(process.env,{userId,plan:'starter'});launchLimits();}checkoutReady=true;if(!pilot&&process.env.K4K_TOPUPS_ENABLED==='true'){livePrices('packs');topupsReady=true;}}
 catch(error){reason=['TAX_SETUP_REQUIRED','OWNER_LIVE_PILOT_ONLY'].includes(error.message)?error.message:'BILLING_SETUP_REQUIRED';}
 return Response.json({mode:billingMode(),checkoutReady,topupsReady,reason,ownerPilot:pilot&&checkoutReady},{headers:{'Cache-Control':'no-store'}});
}
