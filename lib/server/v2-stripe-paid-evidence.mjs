// Stage 5: Strict review-only server-side Stripe evidence contract.
// Caller must obtain a Stripe-signature verified event AND retrieve/expand the
// current invoice/session with its server-side Stripe key. Do not trust client JSON.
// Discounts, prorations and migration are intentionally blocked pending QA.
import {invoiceLinePriceId,invoiceSubscriptionId} from './stripe-invoice-shape.mjs';
import {v2PriceMatch,V2_LIVE_PLAN_MINOR,V2_MONTHLY_CREDITS} from './v2-live-price-policy.mjs';
import {verifySingleVideoSession} from './v2-credit-ledger-contract.mjs';
const sameId=(v,expected)=>typeof v==='string'&&v===expected;
const validId=(v,prefix)=>typeof v==='string'&&v.startsWith(prefix)&&v.length>prefix.length+5;
const allZero=items=>!Array.isArray(items)||items.every(x=>x?.amount===0);
export function verifyV2PaidSubscriptionInvoice(invoice,{
 verifiedCustomerId,verifiedSubscriptionId,verifiedOwnerUserId,requestingUserId
}={}){
 if(!validId(verifiedCustomerId,'cus_')||!validId(verifiedSubscriptionId,'sub_')||
    !validId(verifiedOwnerUserId,'')||verifiedOwnerUserId!==requestingUserId)
    throw Error('V2_SUBSCRIPTION_OWNERSHIP_UNVERIFIED');
 const lines=invoice?.lines?.data;
 const line=lines?.[0];
 const priceId=invoiceLinePriceId(line);
 const match=v2PriceMatch(priceId);
 if(!match||!Array.isArray(lines)||lines.length!==1||!match.plan||!match.currency)
   throw Error('V2_INVOICE_PRICE_INVALID');
 const expected=V2_LIVE_PLAN_MINOR[match.plan][match.currency];
 if(invoice.livemode!==true||!sameId(invoice.customer,verifiedCustomerId)||
   !sameId(invoiceSubscriptionId(invoice),verifiedSubscriptionId)||
   !validId(invoice.id,'in_')||invoice.status!=='paid'||invoice.paid!==true||
   invoice.currency!==match.currency.toLowerCase()||
   !['subscription_create','subscription_cycle'].includes(invoice.billing_reason)||
   Number(line?.quantity??1)!==1||
   invoice.total!==expected||invoice.amount_paid!==expected||
   invoice.amount_remaining!==0||invoice.amount_due!==expected||
   !allZero(invoice.total_discount_amounts)||
   (Array.isArray(invoice.discounts)&&invoice.discounts.length>0))
   throw Error('V2_INVOICE_PAYMENT_UNVERIFIED');
 return Object.freeze({
  verifiedUserId:verifiedOwnerUserId,receiptId:invoice.id,
  priceId,plan:match.plan,currency:match.currency,
  sourceKind:'subscription_invoice',credits:V2_MONTHLY_CREDITS[match.plan],
  amountMinor:expected,creditVersion:'v2'
 });
}
export function verifyV2PaidSingleVideoEvidence(session,{
 verifiedOwnerUserId,requestingUserId
}={}){
 if(!validId(verifiedOwnerUserId,'')||verifiedOwnerUserId!==requestingUserId)
   throw Error('V2_SINGLE_VIDEO_OWNERSHIP_UNVERIFIED');
 const verified=verifySingleVideoSession(session,{userId:verifiedOwnerUserId});
 return Object.freeze({
  verifiedUserId:verifiedOwnerUserId,receiptId:verified.paymentId,
  priceId:verified.priceId,amountMinor:verified.amountMinor,currency:verified.currency,
  sourceKind:'single_video_payment',credits:140,creditVersion:'v2'
 });
}
