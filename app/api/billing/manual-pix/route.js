import {createClient} from '@supabase/supabase-js';
import {currencyForCountry} from '../../../../lib/k4k-market.mjs';
import {assertBillingKey,assertTaxReady,assertLiveLaunchReady,billingMode,ownerLivePilot} from '../../../../lib/server/billing-policy.mjs';
import {launchLimits,updateLaunchCheckout} from '../../../../lib/server/soft-launch.mjs';
import {prepareManualPixCardSwitch} from '../../../../lib/server/manual-pix-card-switch.mjs';
import {manualPixEnabled,manualPixUserAllowed,manualPixPlan,assertManualPixSource,buildManualPixCheckout,manualPixHeaders,MANUAL_PIX_KIND} from '../../../../lib/server/manual-pix.mjs';
import {stripeCheckoutDestination} from '../../../../lib/stripe-checkout-destination.mjs';
export const runtime='nodejs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 if(!manualPixEnabled()||ownerLivePilot()||process.env.K4K_WAITLIST_ONLY==='true')return json({error:'MANUAL_PIX_DISABLED'},503);
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:'UNAUTHENTICATED'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,secret=process.env.STRIPE_SECRET_KEY;
  if(!url||!key||!serviceKey||!secret)return json({error:'UNAVAILABLE'},503);
  const options={auth:{persistSession:false,autoRefreshToken:false}};
  const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
  if(error||!user||user.is_anonymous)return json({error:'UNAUTHENTICATED'},401);
  if(!manualPixUserAllowed(user.id))return json({error:'MANUAL_PIX_OWNER_TEST_ONLY'},403);
  let body;try{body=await request.json()}catch{return json({error:'INVALID_REQUEST'},400)}
  if(currencyForCountry(request.headers.get('x-vercel-ip-country'))!=='BRL'||body?.currency!=='BRL')return json({error:'MANUAL_PIX_BRAZIL_ONLY'},409);
  if(body.discountCode)return json({error:'MANUAL_PIX_DISCOUNT_UNAVAILABLE'},409);
  assertBillingKey(secret);assertTaxReady();assertLiveLaunchReady(process.env,{userId:user.id,plan:body.plan});
  const liveMode=billingMode()==='live',plan=manualPixPlan(body.plan,{liveMode});
  const limits=liveMode?launchLimits():{seats:20,credits:1600};
  const database=createClient(url,serviceKey,options);
  async function rpc(name,args){const {data,error}=await database.rpc(name,args);if(error||!data)throw Error(error?.message||'MANUAL_PIX_UNAVAILABLE');return data;}
  async function stripe(path,{method='GET',form,idempotencyKey}={}){
   const res=await fetch('https://api.stripe.com/v1/'+path,{method,headers:{Authorization:'Bearer '+secret,...manualPixHeaders(),...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},...(form?{body:form.toString()}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!res.ok){
    const payload=await res.json().catch(()=>({})),e=payload.error||{};
    const safe=v=>typeof v==='string'&&/^[A-Za-z0-9_\[\].-]{1,100}$/.test(v)?v:null;
    console.error('Manual Pix Stripe rejection',{status:res.status,code:safe(e.code),type:safe(e.type),param:safe(e.param)});
    throw Error('CHECKOUT_FAILED');
   }return res.json();
  }
  const product=assertManualPixSource(await stripe('prices/'+plan.sourcePrice),plan,liveMode);
  if(liveMode){
   const {data:claim,error}=await database.from('k4k_launch_paid_claims').select('id,user_id,state,stripe_session_id').eq('user_id',user.id).eq('state','reserved').maybeSingle();
   if(error)throw Error('MANUAL_PIX_UNAVAILABLE');
   await prepareManualPixCardSwitch({claim,userId:user.id,
    readSession:id=>stripe('checkout/sessions/'+encodeURIComponent(id)),
    expireSession:id=>stripe('checkout/sessions/'+encodeURIComponent(id)+'/expire',{method:'POST',idempotencyKey:'k4k-manual-pix-switch-'+claim.id}),
    releaseClaim:(c,s)=>updateLaunchCheckout(database,{claimId:c.id,userId:user.id,sessionId:s.id,outcome:'expired'}),
   });
  }
  const order=await rpc('k4k_manual_pix_reserve',{p_user:user.id,p_mode:liveMode?'live':'test',p_plan:plan.key,p_price:plan.sourcePrice,p_product:product,p_max_seats:limits.seats,p_max_credits:limits.credits});
  function verify(session){
   if(session.mode!=='payment'||session.livemode!==liveMode||session.client_reference_id!==user.id||session.metadata?.kind!==MANUAL_PIX_KIND||session.metadata?.order_id!==order.id||session.metadata?.user_id!==user.id||session.currency!=='brl'||session.subscription)throw Error('MANUAL_PIX_SESSION_INVALID');
   return session;
  }
  if(order.stripe_session_id){
   const session=verify(await stripe('checkout/sessions/'+encodeURIComponent(order.stripe_session_id)));
   if(session.status==='open')return json({url:stripeCheckoutDestination(session.url)});
   if(session.status==='expired'){
    await rpc('k4k_manual_pix_bind',{p_order:order.id,p_user:user.id,p_session:session.id,p_expired:true});
    return json({error:'CHECKOUT_EXPIRED_RETRY'},409);
   }
   return json({error:'MANUAL_PIX_PAYMENT_PENDING',sessionId:session.id},409);
  }
  const form=buildManualPixCheckout({order,plan,userId:user.id,origin:new URL(request.url).origin});
  const session=verify(await stripe('checkout/sessions',{method:'POST',form,idempotencyKey:'k4k-manual-pix-'+order.id}));
  if(session.status!=='open'||session.payment_status!=='unpaid')throw Error('MANUAL_PIX_PAYMENT_PENDING');
  await rpc('k4k_manual_pix_bind',{p_order:order.id,p_user:user.id,p_session:session.id,p_expired:false});
  return json({url:stripeCheckoutDestination(session.url)});
 }catch(error){
  console.error('Manual Pix checkout failed',{code:/^[A-Z][A-Z0-9_]{1,79}$/.test(error.message||'')?error.message:'INTERNAL_ERROR'});
  const conflicts=['BILLING_REVIEW_REQUIRED','MANUAL_PIX_PERIOD_ACTIVE','MANUAL_PIX_CHECKOUT_PENDING','EXISTING_SUBSCRIPTION_OR_CHECKOUT','MANUAL_PIX_PAYMENT_PENDING','LAUNCH_SOLD_OUT','LAUNCH_CREDIT_CAPACITY'];
  const safe=[...conflicts,'MANUAL_PIX_DISABLED','MANUAL_PIX_ORDER_EXPIRED','MANUAL_PIX_PRICE_INVALID','CHECKOUT_FAILED','INVALID_PLAN','LIVE_CHECKOUT_DISABLED','OWNER_LIVE_PILOT_ONLY'];
  return json({error:safe.includes(error.message)?error.message:'MANUAL_PIX_UNAVAILABLE'},conflicts.includes(error.message)?409:503);
 }
}
