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
