// One-time TEST-mode catalogue setup. Never create a customer, payment or subscription.
import {PLAN_PRICES,PLAN_CURRENCIES} from '../lib/k4k-plan-prices.mjs';
const env=process.env;
if(env.VERCEL_ENV!=='preview'||env.K4K_BILLING_QA_ONLY!=='true'||env.K4K_QA_CREATE_INCLUSIVE_PRICES!=='true')process.exit(0);
const key=env.STRIPE_SECRET_KEY;
if(!key?.startsWith('sk_test_')||env.K4K_LIVE_PAYMENTS_ENABLED==='true')throw Error('QA_TEST_MODE_REQUIRED');
const base='https://api.stripe.com/v1/',headers={Authorization:'Bearer '+key};
async function stripe(path,options={}){const r=await fetch(base+path,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok){const body=await r.json().catch(()=>({}));throw Error('QA_STRIPE_HTTP_'+r.status+'_'+(body.error?.code||'UNKNOWN'));}return r.json()}
const catalogue={};
for(const [plan,details] of Object.entries(PLAN_PRICES)){
 const product=await stripe('products/'+details.productId);
 if(product.livemode!==false||product.active!==true||product.id!==details.productId)throw Error('QA_PRODUCT_MISMATCH');
 catalogue[plan]={};
 for(const currency of PLAN_CURRENCIES){
  const lookup='k4k_app_'+plan+'_'+currency.toLowerCase()+'_monthly_tax_inclusive_test_2026';
  const list=await stripe('prices?'+new URLSearchParams({'lookup_keys[]':lookup,'limit':'10'}));
  if(list.data?.length>1)throw Error('QA_DUPLICATE_LOOKUP_KEY');
  let price=list.data?.[0];
  if(!price){
   const form=new URLSearchParams({product:product.id,currency:currency.toLowerCase(),unit_amount:String(details[currency]),'recurring[interval]':'month',tax_behavior:'inclusive',lookup_key:lookup,nickname:'K4K APP '+plan+' '+currency+' inclusive TEST','metadata[product_line]':'k4k_app','metadata[plan_key]':plan,'metadata[market]':currency,'metadata[environment]':'test'});
   price=await stripe('prices',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':lookup},body:form.toString()});
  }
  if(price.livemode!==false||!price.active||price.product!==product.id||price.currency!==currency.toLowerCase()||price.unit_amount!==details[currency]||price.tax_behavior!=='inclusive'||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1||price.metadata?.plan_key!==plan)throw Error('QA_PRICE_MISMATCH');
  catalogue[plan][currency]=price.id;
 }
}
console.log('QA_INCLUSIVE_PRICE_MAP '+JSON.stringify(catalogue));
console.log('QA_INCLUSIVE_PRICE_PASS 16 active monthly tax-inclusive test prices verified; no live objects or existing test subscriptions changed.');
