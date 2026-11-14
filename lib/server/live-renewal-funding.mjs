// Hold subsequent APP subscription invoices as drafts until capacity is funded.
// This never changes a price, bills an invoice, cancels a subscription or touches Academy.
import {assertProcessingKey} from './billing-policy.mjs';
import {planForPrice} from './stripe-membership.mjs';
import {invoiceSubscriptionId} from './stripe-invoice-shape.mjs';
const idOf=x=>typeof x==='string'?x:x?.id;
const claim=id=>typeof id==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id);
const subscriptionId=id=>typeof id==='string'&&/^sub_[A-Za-z0-9_]{1,250}$/.test(id);
const customerId=id=>typeof id==='string'&&/^cus_[A-Za-z0-9_]{1,250}$/.test(id);
export function renewalFundingGuardEnabled(env=process.env){
 return env.VERCEL_ENV==='production'&&env.K4K_RENEWAL_FUNDING_GUARD_ENABLED==='true';
}
export function firstPaidAppSubscription(event){
 if(event?.livemode!==true)return null;
 const o=event.data?.object;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&o?.mode==='subscription'&&o.status==='complete'&&o.payment_status==='paid'&&claim(o.metadata?.k4k_launch_claim))return {subscriptionId:idOf(o.subscription),customerId:idOf(o.customer),claimId:o.metadata.k4k_launch_claim};
 if(event.type==='invoice.paid'&&o?.billing_reason==='subscription_create'&&o.status==='paid'&&invoiceSubscriptionId(o))return {subscriptionId:invoiceSubscriptionId(o),customerId:idOf(o.customer),claimId:o.parent?.subscription_details?.metadata?.k4k_launch_claim||o.subscription_details?.metadata?.k4k_launch_claim};
 return null;
}
export async function ensureAppRenewalHold({subscriptionId:subId,customerId:cusId,claimId,env=process.env,fetchImpl=globalThis.fetch,verifyWrite=false}={}){
 if(!renewalFundingGuardEnabled(env))return {guarded:false,reason:'GUARD_DISABLED'};
 if(assertProcessingKey(env.STRIPE_SECRET_KEY,env)!=='live'||!subscriptionId(subId)||!customerId(cusId)||(claimId!=null&&!claim(claimId)))throw Error('RENEWAL_SCOPE_INVALID');
 const path='https://api.stripe.com/v1/subscriptions/'+encodeURIComponent(subId);
 async function request(options={}){
  let r;try{r=await fetchImpl(path,{...options,headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,...options.headers},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)});}catch{throw Error('RENEWAL_STRIPE_UNREACHABLE')}
  if(!r?.ok){const body=await r?.json?.().catch(()=>({}));const code=String(body?.error?.code||body?.error?.type||'unknown').replace(/[^a-zA-Z0-9_]/g,'').slice(0,60);throw Error('RENEWAL_STRIPE_HTTP_'+(r?.status||0)+'_'+code);}
  return r.json();
 }
 function verify(s){
  if(s?.id!==subId||s.livemode!==true||idOf(s.customer)!==cusId||!claim(s.metadata?.k4k_launch_claim)||(claimId&&s.metadata.k4k_launch_claim!==claimId)||s.items?.data?.length!==1||s.items.data[0].quantity!==1)throw Error('RENEWAL_SCOPE_INVALID');
  const {plan}=planForPrice(s.items.data[0].price?.id,{liveMode:true,env});
  if(plan!==s.metadata.plan_key)throw Error('RENEWAL_SCOPE_INVALID');
 }
 const sub=await request();verify(sub);
 if(['canceled','incomplete_expired'].includes(sub.status)||sub.cancel_at_period_end===true)return {guarded:true,reason:'NO_FUTURE_RENEWAL'};
 if(!['active','trialing','past_due','unpaid'].includes(sub.status))throw Error('RENEWAL_SUBSCRIPTION_NOT_READY');
 const held=s=>s.pause_collection?.behavior==='keep_as_draft'&&s.pause_collection?.resumes_at==null;
 if(held(sub)&&!verifyWrite)return {guarded:true,reason:'ALREADY_HELD'};
 // Never overwrite a different pre-existing pause policy or scheduled resume.
 if(sub.pause_collection&&!held(sub))throw Error('RENEWAL_EXISTING_PAUSE_REVIEW');
 const form=new URLSearchParams({'pause_collection[behavior]':'keep_as_draft',proration_behavior:'none'});
 const updated=await request({method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'k4k-renewal-hold-v1-'+subId},body:form.toString()});verify(updated);
 if(!held(updated))throw Error('RENEWAL_HOLD_NOT_CONFIRMED');
 return {guarded:true,reason:'HELD'};
}
