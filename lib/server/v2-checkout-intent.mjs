// Stage 5 REVIEW-ONLY V2 Stripe Checkout intent. This pure preflight never
// creates a Stripe session, modifies subscriptions or touches Supabase.
// Use only after authenticated user, server-derived country and subscription
// checks succeed. A separate release must wire verified Stripe and V2 RPCs.
import {currencyForCountry} from '../k4k-market.mjs';
import {
 V2_LIVE_PLAN_PRICES,V2_LIVE_PLAN_MINOR,V2_MONTHLY_CREDITS,
 V2_SINGLE_VIDEO,PRESERVED_LIVE_PLAN_PRICES
} from './v2-live-price-policy.mjs';
import {OPTION_B_USD_MICROS_PER_V2_CREDIT,singleVideoOfferForCurrency} from './v2-option-b-policy.mjs';
export const V2_CHECKOUT_WIRED_AND_VERIFIED=false; // compile-time release lock
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowed=new Set(['starter','creator','pro','studio']);
const hasPrice=id=>Object.values(PRESERVED_LIVE_PLAN_PRICES).some(row=>Object.values(row).includes(id));
export function prepareV2CheckoutIntent({
 verifiedUserId,trustedCountry,kind,plan,hasActiveSubscription=false,
 browserPriceId,discountCode
}={}){
 if(!uuid.test(verifiedUserId||''))throw Error('AUTH_REQUIRED');
 if(typeof trustedCountry!=='string'||!/^[A-Z]{2}$/.test(trustedCountry))
   throw Error('TRUSTED_REGION_REQUIRED');
 if(discountCode!==undefined&&discountCode!==null&&discountCode!=='')
   throw Error('DISCOUNT_QA_NOT_APPROVED');
 if(!['subscription','single_video'].includes(kind))throw Error('INVALID_V2_PURCHASE_TYPE');
 const currency=currencyForCountry(trustedCountry);
 if(kind==='subscription'&&(hasActiveSubscription||!allowed.has(plan)))
   throw Error(hasActiveSubscription?'EXISTING_SUBSCRIPTION':'INVALID_PLAN');
 if(kind==='single_video'&&plan!=null)throw Error('SINGLE_VIDEO_NOT_SUBSCRIPTION');
 const priceId=kind==='single_video'?V2_SINGLE_VIDEO.prices[currency]:V2_LIVE_PLAN_PRICES[plan]?.[currency];
 const amountMinor=kind==='single_video'?V2_SINGLE_VIDEO.minor[currency]:V2_LIVE_PLAN_MINOR[plan]?.[currency];
 const credits=kind==='single_video'?V2_SINGLE_VIDEO.credits:V2_MONTHLY_CREDITS[plan];
 if(!priceId||hasPrice(priceId)||!Number.isSafeInteger(amountMinor)||amountMinor<=0)
   throw Error('V2_PRICE_NOT_APPROVED');
 if(browserPriceId!==undefined&&browserPriceId!==priceId)
   throw Error('CLIENT_PRICE_ID_MISMATCH');
 return Object.freeze({
  userId:verifiedUserId,kind,plan:kind==='subscription'?plan:null,
  currency,amountMinor,priceId,quantity:1,
  stripeMode:kind==='subscription'?'subscription':'payment',
  credits,creditVersion:'v2',creditUsdMicros:OPTION_B_USD_MICROS_PER_V2_CREDIT,
  customerDisclosure:kind==='single_video'?singleVideoOfferForCurrency(currency).disclosure:null,
  checkoutReady:false,reason:'V2_CHECKOUT_WIRED_AND_VERIFIED_REQUIRED'
 });
}
// Even if env vars were accidentally enabled, no payment session can be
// created through this staged contract without an explicit code review.
export async function createV2CheckoutSession(){
 if(!V2_CHECKOUT_WIRED_AND_VERIFIED)throw Error('V2_CHECKOUT_DISABLED');
 throw Error('V2_STRIPE_ADAPTER_NOT_INSTALLED');
}
