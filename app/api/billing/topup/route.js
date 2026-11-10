import {createClient} from '@supabase/supabase-js';
import {currencyForCountry} from '../../../../lib/k4k-market.mjs';
import {creditPack,buildTopupCheckout} from '../../../../lib/server/credit-packs.mjs';
import {assertBillingKey,assertTaxReady,billingMode} from '../../../../lib/server/billing-policy.mjs';
import {stripeCheckoutDestination} from '../../../../lib/stripe-checkout-destination.mjs';
export const runtime='nodejs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:'UNAUTHENTICATED'},401);
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}={},error}=await client.auth.getUser(token);
  if(error||!user||user.is_anonymous)return json({error:'UNAUTHENTICATED'},401);
  const body=await request.json();const currency=currencyForCountry(request.headers.get('x-vercel-ip-country'));
  if(body.currency!==currency)return json({error:'CURRENCY_REGION_MISMATCH',currency},409);
  const pack=creditPack(body.pack,currency);
  assertTaxReady();if(process.env.K4K_TOPUPS_ENABLED!=='true')return json({error:'TOPUPS_DISABLED'},503);
  assertBillingKey(process.env.STRIPE_SECRET_KEY);
  // Live price IDs are never inferred from TEST configuration.

  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded'},body:buildTopupCheckout({pack,userId:user.id,origin:new URL(request.url).origin}).toString(),signal:AbortSignal.timeout(15000)});
  if(!response.ok)return json({error:'CHECKOUT_FAILED'},502);
  const session=await response.json();return json({url:stripeCheckoutDestination(session.url)});
 }catch(error){const allowed=['INVALID_PACK','PACK_NOT_CONFIGURED','TAX_SETUP_REQUIRED','LIVE_CHECKOUT_DISABLED','LIVE_KEY_NOT_CONFIGURED'];return json({error:allowed.includes(error.message)?error.message:'TOPUP_UNAVAILABLE'},503)}
}
