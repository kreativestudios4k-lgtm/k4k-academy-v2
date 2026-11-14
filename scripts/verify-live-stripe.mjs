// Read-only production credential audit. Never create sessions or print secrets.
import {configuredLivePrices} from '../lib/server/live-price-config.mjs';
import {PLAN_PRICES,PLAN_CURRENCIES} from '../lib/k4k-plan-prices.mjs';
if(process.env.VERCEL_ENV==='production'&&process.env.K4K_VERIFY_LIVE_STRIPE==='true'){
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key||!/^([rs]k)_live_/.test(key))throw Error('STRIPE_AUDIT_LIVE_KEY_MISSING');
 const prices=configuredLivePrices('plans');
 let checked=0;
 for(const [plan,details] of Object.entries(PLAN_PRICES)){
  for(const currency of PLAN_CURRENCIES){
   const response=await fetch('https://api.stripe.com/v1/prices/'+encodeURIComponent(prices[plan][currency]),{headers:{Authorization:'Bearer '+key},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('STRIPE_AUDIT_PRICE_READ_HTTP_'+response.status);
   const p=await response.json();
   if(p.id!==prices[plan][currency]||!p.livemode||!p.active||p.currency!==currency.toLowerCase()||p.unit_amount!==details[currency]||p.tax_behavior!=='inclusive'||p.recurring?.interval!=='month'||p.recurring?.interval_count!==1||p.metadata?.product_line!=='k4k_app'||p.metadata?.plan_key!==plan)throw Error('STRIPE_AUDIT_PRICE_MISMATCH');
   checked++;
  }
 }
 console.log('K4K Stripe read-only audit: '+checked+' live prices verified; no payment created.');
}

 
// One-time production-only signature/delivery probe. An unpaid, unshared
// Starter Checkout Session tests the exact live subscription-create permission.
// It is immediately expired, without a charge, customer, card, subscription
// or launch claim. The genuine Stripe expiry event is ignored by membership.
if(process.env.VERCEL_ENV==='production'&&process.env.K4K_VERIFY_LIVE_WEBHOOK_AUDIT==='20261114-02'){
 const secret=process.env.STRIPE_SECRET_KEY;
 if(!/^([rs]k)_live_/.test(secret||''))throw Error('WEBHOOK_AUDIT_LIVE_KEY_MISSING');
 if(process.env.K4K_LIVE_PAYMENTS_ENABLED==='true')throw Error('WEBHOOK_AUDIT_REQUIRES_CLOSED_CHECKOUT');
 const marker='k4k-webhook-audit-20261114-02';
 async function request(path,{method='GET',form,idem}={}){
  const response=await fetch('https://api.stripe.com/v1/'+path,{method,headers:{Authorization:'Bearer '+secret,...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idem?{'Idempotency-Key':idem}:{})},...(form?{body:form.toString()}:{}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok){const e=await response.json().catch(()=>({}));const code=String(e.error?.code||e.error?.type||'unknown').replace(/[^a-zA-Z0-9_]/g,'').slice(0,60);const permissions=String(e.error?.message||'').match(/\b[a-z][a-z_]{2,60}_(?:read|write)\b/g)||[];throw Error('WEBHOOK_AUDIT_STRIPE_HTTP_'+response.status+'_'+code+(permissions.length?'_'+[...new Set(permissions)].slice(0,5).join('_'):''));}
  return response.json();
 }
 const price=configuredLivePrices('plans').starter.GBP;
 const form=new URLSearchParams({mode:'subscription','line_items[0][price]':price,'line_items[0][quantity]':'1','payment_method_types[0]':'card','automatic_tax[enabled]':'true','tax_id_collection[enabled]':'true',success_url:'https://kreativestudios4k.com/',cancel_url:'https://kreativestudios4k.com/','metadata[k4k_webhook_audit]':marker});
 const created=await request('checkout/sessions',{method:'POST',form,idem:marker});
 if(created.livemode!==true||created.mode!=='subscription'||created.metadata?.k4k_webhook_audit!==marker||!/^cs_live_[a-zA-Z0-9_]+$/.test(created.id||'')||created.payment_intent||created.subscription||created.customer)throw Error('WEBHOOK_AUDIT_UNEXPECTED_SESSION');
 let session=await request('checkout/sessions/'+created.id);
 if(session.status==='open')session=await request('checkout/sessions/'+created.id+'/expire',{method:'POST',form:new URLSearchParams(),idem:marker+'-expire'});
 if(session.status!=='expired'||session.payment_intent||session.subscription||session.customer)throw Error('WEBHOOK_AUDIT_EXPIRY_FAILED');
 console.log('K4K_WEBHOOK_AUDIT_EXPIRED '+session.id+' no charge or subscription');
 // Delivery verification is performed independently with the Stripe event API.
}
