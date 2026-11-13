// Live checkout remains fail-closed until the owner enables a funded cohort.
import {stripeCheckoutDestination} from '../stripe-checkout-destination.mjs';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const sessionId=/^cs_live_[A-Za-z0-9_]{8,250}$/;
export function launchLimits(env=process.env){
 if(env.K4K_SOFT_LAUNCH_ENABLED!=='true')throw Error('LAUNCH_NOT_OPEN');
 const seats=Number(env.K4K_LAUNCH_PAID_SEATS),credits=Number(env.K4K_LAUNCH_PAID_CREDIT_BUDGET);
 if(!Number.isSafeInteger(seats)||seats<1||seats>50||!Number.isSafeInteger(credits)||credits<80||credits>35000)throw Error('LAUNCH_CONFIG_INVALID');
 return {seats,credits};
}
const errors=new Set(['LAUNCH_SOLD_OUT','LAUNCH_CREDIT_CAPACITY','LAUNCH_CHECKOUT_PENDING','ALREADY_SUBSCRIBED','LAUNCH_SESSION_INVALID','LAUNCH_SESSION_EXPIRED','LAUNCH_SESSION_PAID','LAUNCH_CONFIG_INVALID']);
async function rpc(database,name,args){const {data,error}=await database.rpc(name,args);if(error||!data)throw Error(errors.has(error?.message)?error.message:'LAUNCH_UNAVAILABLE');return data;}
export function claimPaidSeat(database,{userId,plan,priceId,currency,limits}){return rpc(database,'k4k_launch_claim_paid',{p_user:userId,p_plan:plan,p_price:priceId,p_currency:currency,p_max_seats:limits.seats,p_max_credits:limits.credits});}
export function updateLaunchCheckout(database,{claimId,userId,sessionId:session,outcome}){
 if(!uuid.test(claimId||'')||!uuid.test(userId||'')||!sessionId.test(session||''))throw Error('LAUNCH_SESSION_INVALID');
 return rpc(database,'k4k_launch_checkout_update',{p_claim:claimId,p_user:userId,p_session:session,p_outcome:outcome});
}
export function verifyLaunchSession(session,claim){
 if(!session||session.livemode!==true||session.mode!=='subscription'||!sessionId.test(session.id||'')||session.client_reference_id!==claim.user_id||session.metadata?.k4k_launch_claim!==claim.id||(claim.stripe_session_id&&claim.stripe_session_id!==session.id))throw Error('LAUNCH_SESSION_INVALID');
 return session;
}
export async function launchSessionOutcome(database,session,outcome){
 const claimId=session.metadata?.k4k_launch_claim;
 if(!claimId)return {handled:false,reason:'LEGACY_CHECKOUT'};
 if(session.livemode!==true||session.mode!=='subscription'||(outcome==='paid'&&(session.status!=='complete'||session.payment_status!=='paid'))||(outcome==='expired'&&session.status!=='expired'))throw Error('LAUNCH_SESSION_INVALID');
 return updateLaunchCheckout(database,{claimId,userId:session.client_reference_id,sessionId:session.id,outcome});
}
export async function openLaunchCheckout({database,claim,secret,form,fetchImpl=fetch,now=Math.floor(Date.now()/1000)}){
 if(claim.state==='paid')throw Error('ALREADY_SUBSCRIBED');
 if(claim.state!=='reserved'||!uuid.test(claim.id||'')||!uuid.test(claim.user_id||''))throw Error('LAUNCH_SESSION_INVALID');
 async function request(path,options={}){let response;try{response=await fetchImpl('https://api.stripe.com/v1/'+path,{...options,headers:{Authorization:'Bearer '+secret,...options.headers},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)});}catch{throw Error('STRIPE_UNREACHABLE');}if(!response.ok)throw Error('CHECKOUT_FAILED');return response.json();}
 if(claim.stripe_session_id){
  if(!sessionId.test(claim.stripe_session_id))throw Error('LAUNCH_SESSION_INVALID');
  const session=verifyLaunchSession(await request('checkout/sessions/'+encodeURIComponent(claim.stripe_session_id)),claim);
  if(session.status==='open')return stripeCheckoutDestination(session.url);
  if(session.status==='expired'){await launchSessionOutcome(database,session,'expired');throw Error('CHECKOUT_EXPIRED_RETRY');}
  if(session.status==='complete'){if(session.payment_status==='paid')await launchSessionOutcome(database,session,'paid');throw Error('CHECKOUT_RECONCILE_REQUIRED');}
  throw Error('LAUNCH_CHECKOUT_REVIEW');
 }
 // Fixed form and fixed idempotency key for the entire claim. Never guess
 // that an unrecorded session has expired or resubmit after the safe window.
 if(!Number.isSafeInteger(claim.expires_epoch)||claim.expires_epoch<now+1800||claim.expires_epoch>now+86400)throw Error('LAUNCH_CHECKOUT_REVIEW');
 form.set('expires_at',String(claim.expires_epoch));form.set('metadata[k4k_launch_claim]',claim.id);form.set('subscription_data[metadata][k4k_launch_claim]',claim.id);
 const session=verifyLaunchSession(await request('checkout/sessions',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'k4k-launch-'+claim.id},body:form.toString()}),claim);
 if(session.status!=='open')throw Error('LAUNCH_CHECKOUT_REVIEW');
 const destination=stripeCheckoutDestination(session.url);
 await updateLaunchCheckout(database,{claimId:claim.id,userId:claim.user_id,sessionId:session.id,outcome:'bind'});
 return destination;
}
