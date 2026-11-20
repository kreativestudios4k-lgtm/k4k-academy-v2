// Pure preflight helper: no database/Stripe effects. This does NOT replace
// public.k4k_app_launch_claim_paid; production reservation still uses its RPC.
import {V2_MONTHLY_CREDITS,v2PriceMatch,preservedPriceMatch} from './v2-live-price-policy.mjs';

export function evaluateV2LaunchReservation({
 priceId, currency, plan, activeSeats, subscriptionCommittedCredits=0,
 pixCommittedCredits=0, maxSeats, maxCredits, existingClaim=null
}={}){
 if(typeof priceId!=='string'||typeof currency!=='string'||typeof plan!=='string')
  return Object.freeze({allowed:false,reason:'INVALID_REQUEST'});
 const found=v2PriceMatch(priceId);
 if(!found||found.plan!==plan||found.currency!==currency)
  return Object.freeze({allowed:false,reason:'PRICE_NOT_IN_V2_CATALOGUE'});
 // A shared historic recurring Price ID cannot identify the new entitlement.
 // Old Starter GBP subscribers MUST keep getting 80, not V2's 420.
 if(preservedPriceMatch(priceId))
  return Object.freeze({allowed:false,reason:'SHARED_LEGACY_PRICE'});
 const credits=V2_MONTHLY_CREDITS[plan];
 if(!Number.isSafeInteger(credits)||credits<=0||!Number.isSafeInteger(activeSeats)||
    !Number.isSafeInteger(subscriptionCommittedCredits)||!Number.isSafeInteger(pixCommittedCredits)||
    !Number.isSafeInteger(maxCredits)||!Number.isSafeInteger(maxSeats)||
    activeSeats<0||subscriptionCommittedCredits<0||pixCommittedCredits<0||
    maxCredits<80||maxCredits>35000||maxSeats<1||maxSeats>50)
  return Object.freeze({allowed:false,reason:'LAUNCH_CONFIG_INVALID'});
 const consumed=subscriptionCommittedCredits+pixCommittedCredits;
 if(existingClaim){
  // The actual DB function must re-read a row using an advisory transaction lock.
  // This quote is only a consistency check; it never grants a seat or credits.
  if(existingClaim.priceId!==priceId||existingClaim.plan!==plan||existingClaim.currency!==currency)
   return Object.freeze({allowed:false,reason:'EXISTING_CLAIM_CONFLICT'});
  if(!Number.isSafeInteger(existingClaim.credits)||existingClaim.credits!==credits)
   return Object.freeze({allowed:false,reason:'EXISTING_CLAIM_CREDIT_MISMATCH'});
  return Object.freeze({allowed:true,reused:true,credits,reservedTotal:consumed,remainingCredits:maxCredits-consumed});
 }
 if(activeSeats>=maxSeats)
  return Object.freeze({allowed:false,reason:'LAUNCH_SOLD_OUT',credits,reservedTotal:consumed,remainingCredits:maxCredits-consumed});
 if(consumed+credits>maxCredits)
  return Object.freeze({allowed:false,reason:'LAUNCH_CREDIT_CAPACITY',credits,reservedTotal:consumed,remainingCredits:maxCredits-consumed,minimumRequiredCredits:consumed+credits});
 return Object.freeze({allowed:true,reused:false,credits,reservedTotal:consumed,afterReservationCredits:consumed+credits,remainingCredits:maxCredits-consumed-credits});
}
