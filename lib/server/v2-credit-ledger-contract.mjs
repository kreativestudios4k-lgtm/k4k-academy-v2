// Stage 3: pure, REVIEW-ONLY simulation of a distinct V2 credit denomination.
// This is deliberately NOT used by production wallets, Stripe webhooks or jobs.
// Future database implementation must use a single SERIALIZABLE/locked SQL transaction.
export const V2_CREDIT_VERSION='v2';

const goodId=id=>typeof id==='string'&&/^[a-zA-Z0-9_:-]{5,160}$/.test(id);
const goodCredits=n=>Number.isSafeInteger(n)&&n>0&&n<=10000;
const fail=code=>{throw Error(code)};
export function createV2Ledger({userId,legacySnapshot=0}={}){
 if(!goodId(userId)||!Number.isSafeInteger(legacySnapshot)||legacySnapshot<0)fail('INVALID_LEDGER_OWNER');
 return {userId,creditVersion:V2_CREDIT_VERSION,legacySnapshot,
  available:0,reserved:0,debt:0,billingHold:false,
  paymentReceipts:{},jobs:{},events:{}};
}
function checkInput(state,event){
 if(!state||state.creditVersion!==V2_CREDIT_VERSION||!goodId(state.userId)||
    !event||event.userId!==state.userId||event.creditVersion!==V2_CREDIT_VERSION||
    !goodId(event.eventId)||!goodCredits(event.credits))fail('V2_LEDGER_INPUT_INVALID');
}
function fingerprint(event){return JSON.stringify({
 type:event.type,userId:event.userId,creditVersion:event.creditVersion,credits:event.credits,
 paymentId:event.paymentId??null,jobId:event.jobId??null,verifiedPaid:event.verifiedPaid??null,
 fullRefund:event.fullRefund??null,
});}
function copy(state){return structuredClone(state);}
export function applyV2LedgerEvent(state,event){
 checkInput(state,event);
 const fp=fingerprint(event),current=state.events[event.eventId];
 if(current){
  if(current!==fp)fail('IDEMPOTENCY_CONFLICT');
  return {ledger:state,duplicate:true};
 }
 const draft=copy(state),c=event.credits;
 if(event.type==='grant_paid'){
  // `verifiedPaid` is an assertion from a trusted SERVER-ONLY Stripe verifier,
  // never a request field sent by the browser or read from redirect params.
  if(event.verifiedPaid!==true||!goodId(event.paymentId)||
     !/^(in|pi)_[A-Za-z0-9_]+$/.test(event.paymentId))fail('UNVERIFIED_PAYMENT');
  const original=draft.paymentReceipts[event.paymentId];
  if(original){
   if(original.credits!==c||original.userId!==event.userId)fail('PAYMENT_RECEIPT_CONFLICT');
   return {ledger:state,duplicate:true};
  }
  const debtPaid=Math.min(c,draft.debt);
  draft.debt-=debtPaid;
  draft.available+=c-debtPaid;
  draft.paymentReceipts[event.paymentId]={credits:c,userId:event.userId,refunded:false};
 }else if(event.type==='reserve_generation'){
  if(!goodId(event.jobId))fail('INVALID_GENERATION_JOB');
  const prior=draft.jobs[event.jobId];
  if(prior){
   if(prior.credits!==c)fail('GENERATION_RESERVATION_CONFLICT');
   return {ledger:state,duplicate:true};
  }
  if(draft.billingHold||draft.debt>0)fail('BILLING_REVIEW_REQUIRED');
  if(draft.available<c)fail('INSUFFICIENT_V2_CREDITS');
  draft.available-=c;draft.reserved+=c;
  draft.jobs[event.jobId]={credits:c,status:'reserved'};
 }else if(event.type==='settle_generation'||event.type==='release_generation'){
  if(!goodId(event.jobId))fail('INVALID_GENERATION_JOB');
  const job=draft.jobs[event.jobId];
  if(!job||job.status!=='reserved'||job.credits!==c)fail('GENERATION_STATE_CONFLICT');
  draft.reserved-=c;
  if(event.type==='release_generation')draft.available+=c;
  job.status=event.type==='settle_generation'?'settled':'released';
 }else if(event.type==='refund_payment'){
  if(event.fullRefund!==true)fail('PARTIAL_REFUND_REVIEW_REQUIRED');
  if(!goodId(event.paymentId))fail('UNKNOWN_PAYMENT');
  const receipt=draft.paymentReceipts[event.paymentId];
  if(!receipt||receipt.refunded||receipt.credits!==c)fail('REFUND_RECEIPT_CONFLICT');
  const recovered=Math.min(draft.available,c);
  draft.available-=recovered;
  draft.debt+=c-recovered;
  draft.billingHold=true;receipt.refunded=true;
 }else fail('UNKNOWN_V2_LEDGER_EVENT');
 draft.events[event.eventId]=fp;
 if(!Number.isSafeInteger(draft.available)||!Number.isSafeInteger(draft.reserved)||
    !Number.isSafeInteger(draft.debt)||Math.min(draft.available,draft.reserved,draft.debt)<0)
  fail('V2_LEDGER_INVARIANT');
 if(draft.legacySnapshot!==state.legacySnapshot)fail('LEGACY_BALANCE_MUTATED');
 return {ledger:draft,duplicate:false};
}

import {V2_SINGLE_VIDEO} from './v2-live-price-policy.mjs';
export function verifySingleVideoSession(session,{userId}={}){
 // Caller MUST retrieve and verify this from Stripe with server credentials.
 // Pure predicate is one defensive validation layer, not authorization alone.
 if(!goodId(userId)||!session||session.livemode!==true||
   session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||
   session.client_reference_id!==userId||session.metadata?.kind!=='k4k_v2_single_video'||
   session.metadata?.user_id!==userId||session.metadata?.credit_version!=='v2'||
   session.metadata?.product_id!==V2_SINGLE_VIDEO.productId)fail('SINGLE_VIDEO_SESSION_INVALID');
 const curr=session.currency?.toUpperCase();
 const price=V2_SINGLE_VIDEO.prices[curr],amount=V2_SINGLE_VIDEO.minor[curr];
 const lines=session.line_items?.data;
 if(!price||!Number.isSafeInteger(amount)||!Array.isArray(lines)||lines.length!==1||
   lines[0]?.price?.id!==price||lines[0]?.quantity!==1||
   session.amount_subtotal!==amount||session.amount_total!==amount||
   session.total_details?.amount_discount!==0||
   session.automatic_tax?.enabled!==true||session.automatic_tax?.status!=='complete')
   fail('SINGLE_VIDEO_AMOUNT_MISMATCH');
 const intent=session.payment_intent;
 if(!intent||typeof intent!=='object'||intent.status!=='succeeded'||
   !/^pi_[A-Za-z0-9_]+$/.test(intent.id||'')||
   intent.latest_charge?.refunded===true||intent.latest_charge?.disputed===true||
   Number(intent.latest_charge?.amount_refunded||0)>0)fail('SINGLE_VIDEO_PAYMENT_UNVERIFIED');
 return Object.freeze({userId,paymentId:intent.id,credits:V2_SINGLE_VIDEO.credits,
  priceId:price,currency:curr,amountMinor:amount,creditVersion:V2_CREDIT_VERSION});
}
