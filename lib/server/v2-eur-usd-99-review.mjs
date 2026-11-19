// DRAFT-ONLY integration review of ten CREATED and independently VERIFIED
// Stripe LIVE .99 EUR/USD prices. This module never opens checkout or writes
// Stripe, and old V2/historical entitlements must still be honored.
import {V2_LIVE_PLAN_MINOR,V2_LIVE_PLAN_PRICES,V2_MONTHLY_CREDITS,
 V2_SINGLE_VIDEO,V2_PRIOR_EUR_USD_PLAN_PRICES,V2_PRIOR_EUR_USD_PLAN_MINOR,
 V2_PRIOR_EUR_USD_SINGLE_VIDEO,PRESERVED_LIVE_PLAN_PRICES} from './v2-live-price-policy.mjs';

export const EUR_USD_99_REVIEW_ONLY=true;
export const EUR_USD_99_NEW_PRICE_IDS_APPROVED_AND_VERIFIED=true;
// ECB 19 Nov 2026: 1 EUR = 0.83581 GBP, 1 EUR = 1.0992 USD.
// These REFERENCE rates are not bank/Stripe settlement rates.
export const ECB_REFERENCE_20261119=Object.freeze({
  EUR_PER_GBP:1/0.83581,
  USD_PER_GBP:1.0992/0.83581,
  rateDate:'2026-11-19'
});
const freezeRows=rows=>Object.freeze(Object.fromEntries(
 Object.entries(rows).map(([key,values])=>[key,Object.freeze(values)])));

// Amounts in minor units. Approved and created in LIVE Stripe 19 Nov 2026,
// but not connected to public checkout, webhooks or production balances.
export const EUR_USD_99_PROPOSED_MINOR=freezeRows({
 starter:{EUR:1899,USD:2099},
 creator:{EUR:3599,USD:3999},
 pro:{EUR:7199,USD:7899},
 studio:{EUR:14399,USD:15799},
 single_video:{EUR:699,USD:799}
});
export const PROTECTED_GBP_BRL_MINOR=freezeRows({
 starter:{GBP:1599,BRL:11990},
 creator:{GBP:2999,BRL:22490},
 pro:{GBP:5999,BRL:44990},
 studio:{GBP:11999,BRL:89990},
 single_video:{GBP:599,BRL:4490}
});

const signedDifference=(a,b)=>a-b;
const legacySameAmount=(plan,currency,amount)=>{
 // Do not reuse the historical Price ID simply because the old amount equals
 // the new suggested amount: the old entitlements are separate and immutable.
 if(plan!=='starter')return false;
 return (currency==='EUR'&&amount===1899)||(currency==='USD'&&amount===2099);
};

export function eurUsd99ReviewLine(plan,currency){
 if(!['EUR','USD'].includes(currency))throw Error('EUR_USD_ONLY');
 if(!Object.hasOwn(EUR_USD_99_PROPOSED_MINOR,plan))throw Error('UNKNOWN_PLAN');
 const proposedMinor=EUR_USD_99_PROPOSED_MINOR[plan][currency];
 const v2Minor=plan==='single_video'?V2_SINGLE_VIDEO.minor[currency]:V2_LIVE_PLAN_MINOR[plan][currency];
 const v2PriceId=plan==='single_video'?V2_SINGLE_VIDEO.prices[currency]:V2_LIVE_PLAN_PRICES[plan][currency];
 const previousMinor=plan==='single_video'?V2_PRIOR_EUR_USD_SINGLE_VIDEO.minor[currency]:V2_PRIOR_EUR_USD_PLAN_MINOR[plan][currency];
 const previousPriceId=plan==='single_video'?V2_PRIOR_EUR_USD_SINGLE_VIDEO.prices[currency]:V2_PRIOR_EUR_USD_PLAN_PRICES[plan][currency];
 const gbpMinor=PROTECTED_GBP_BRL_MINOR[plan].GBP;
 const rate=currency==='EUR'?ECB_REFERENCE_20261119.EUR_PER_GBP:ECB_REFERENCE_20261119.USD_PER_GBP;
 return Object.freeze({
  plan,currency,gbpMinor,
  credits:plan==='single_video'?V2_SINGLE_VIDEO.credits:V2_MONTHLY_CREDITS[plan],
  purchaseKind:plan==='single_video'?'one_time':'monthly',
  referenceRate:rate,convertedMinor:Math.round(gbpMinor*rate),
  currentLiveMinor:v2Minor,currentLivePriceId:v2PriceId,
  priorV2Minor:previousMinor,priorV2PriceId:previousPriceId,
  proposedMinor,changeMinor:signedDifference(proposedMinor,previousMinor),
  historicalEntitlementCollision:legacySameAmount(plan,currency,proposedMinor),
  replacementPriceId:v2PriceId, // Verified LIVE, still NOT wired into public Checkout.
  checkoutReady:false
 });
}
export function eurUsd99ReviewMatrix(){
 return Object.freeze(Object.keys(EUR_USD_99_PROPOSED_MINOR).flatMap(plan=>
  ['EUR','USD'].map(currency=>eurUsd99ReviewLine(plan,currency))));
}
export function ensureNoUnverifiedEurUsdPriceCutover(){
 if(!EUR_USD_99_NEW_PRICE_IDS_APPROVED_AND_VERIFIED)
  throw Error('EUR_USD_99_CUTOVER_NOT_APPROVED');
 // Separate live payment adapter, funded capacity, BF and tax QA remain blocked.
 throw Error('EUR_USD_99_PAYMENT_INTEGRATION_NOT_WIRED');
}
