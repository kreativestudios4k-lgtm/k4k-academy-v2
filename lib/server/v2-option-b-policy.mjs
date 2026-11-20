// Stage 5: APPROVED Option B planning contract. Review branch only; not wired
// to legacy wallets, the generator, Stripe checkout or the public website.
// $0.012/provider USD per NEW V2 credit. Never re-denominate legacy balances.
import {V2_SINGLE_VIDEO} from './v2-live-price-policy.mjs';
export const OPTION_B_USD_MICROS_PER_V2_CREDIT=12000;
export const OPTION_B_USD_PER_V2_CREDIT=0.012;
export const STANDARD_MOTION_USD_MICROS_PER_SECOND=70000; // provider quote snapshot, re-verify at dispatch
export const PRO_MOTION_USD_MICROS_PER_SECOND=112000;     // illustrative comparison, not a production route
export const V2_COST_MODEL_VERSION='v2-option-b-2026-11-19';
export const SINGLE_VIDEO_ENTITLEMENT=Object.freeze({
 kind:'one_time_v2_credit_grant',
 credits:V2_SINGLE_VIDEO.credits,
 purchaseCount:1,
 priceIdByCurrency:V2_SINGLE_VIDEO.prices,
 // Consistent with the LIVE Product description: one-time purchase of 140 credits,
 // not a claim that every user can create a 30s/premium video.
 disclaimer:'One-time 140 V2 credits toward video creation. Generations require a separate verified model/duration quote; 30 seconds may need more credits.'
});
const assertPositiveInt=n=>Number.isSafeInteger(n)&&n>=1;
export function v2CreditsFromProviderMicros(costMicros){
 if(!assertPositiveInt(costMicros)||costMicros>1e10)throw Error('INVALID_V2_PROVIDER_COST');
 return Math.ceil(costMicros/OPTION_B_USD_MICROS_PER_V2_CREDIT);
}
export function quoteOptionBStandardMotion({seconds,orientation='video'}={}){
 if(!assertPositiveInt(seconds)||!['video','image'].includes(orientation))
  throw Error('INVALID_MOTION_QUOTE');
 // Only verified Kling 2.6 Standard route. Unknown models must be priced
 // server-side from their OWN provider rate cards, not from this reference.
 const maxSeconds=orientation==='video'?30:10;
 if(seconds<3||seconds>maxSeconds)throw Error('UNSUPPORTED_MOTION_DURATION');
 const providerCostMicros=seconds*STANDARD_MOTION_USD_MICROS_PER_SECOND;
 return Object.freeze({
  model:'fal-ai/kling-video/v2.6/standard/motion-control',
  orientation,seconds,
  providerCostMicros,credits:v2CreditsFromProviderMicros(providerCostMicros),
  creditVersion:'v2',costPolicy:V2_COST_MODEL_VERSION,
  estimateOnly:true,
  providerRateVerifiedAtCheckout:false // must be refreshed before generation
 });
}
export function singleVideoOfferForCurrency(currency,{requestedQuote=null}={}){
 const key=typeof currency==='string'?currency.toUpperCase():'';
 const priceId=SINGLE_VIDEO_ENTITLEMENT.priceIdByCurrency[key];
 if(!priceId)throw Error('UNSUPPORTED_CURRENCY');
 if(requestedQuote!==null&&(requestedQuote.creditVersion!=='v2'||
     !assertPositiveInt(requestedQuote.credits)||requestedQuote.estimateOnly!==true))
   throw Error('INVALID_V2_QUOTE');
 const missingCredits=requestedQuote?Math.max(0,requestedQuote.credits-SINGLE_VIDEO_ENTITLEMENT.credits):null;
 return Object.freeze({
  priceId,creditVersion:'v2',credits:140,billing:'one_time',
  doesNotGuaranteeThirtySeconds:true,
  thirtySecondStandardCredits:quoteOptionBStandardMotion({seconds:30}).credits,
  requestedCredits:requestedQuote?.credits??null,missingCredits,
  canCoverSelectedQuote:requestedQuote?missingCredits===0:null,
  disclosure:SINGLE_VIDEO_ENTITLEMENT.disclaimer
 });
}
// Do not send an estimated provider cost to actual billing as if it were verified.
// Actual generation: server must validate current model cost, source duration,
// verified user/owner, quote signature, budget lock and reserve credits atomically.
export function requireVerifiedV2GenerationQuote(quote){
 if(!quote||quote.creditVersion!=='v2'||quote.costPolicy!==V2_COST_MODEL_VERSION||
    quote.estimateOnly!==false||quote.providerRateVerifiedAtCheckout!==true||
    quote.ownerVerified!==true||quote.signedQuoteVerified!==true||
    !assertPositiveInt(quote.credits))
  throw Error('V2_QUOTE_NOT_VERIFIED');
 return quote;
}
