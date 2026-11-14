// Signed live events are not sufficient to identify an APP subscription:
// invoice charges need not inherit subscription metadata, and disputes contain
// a charge pointer. Resolve attribution from Stripe, never from customer alone.
import {assertProcessingKey} from './billing-policy.mjs';
import {isK4KLiveEvent} from './live-webhook-scope.mjs';
import {invoiceSubscriptionId} from './stripe-invoice-shape.mjs';
const idOf=x=>typeof x==='string'?x:x?.id;
const valid=(id,prefix)=>typeof id==='string'&&id.startsWith(prefix)&&/^[a-zA-Z0-9_]+$/.test(id)&&id.length<=250;
const fail=()=>{throw Error('LIVE_BILLING_REVIEW_UNAVAILABLE')};
export async function resolveLiveBillingReview(event,{env=process.env,fetchImpl=fetch}={}){
 if(event?.livemode!==true||!['charge.refunded','charge.dispute.created'].includes(event.type))throw Error('INVALID_REVIEW_EVENT');
 if(assertProcessingKey(env.STRIPE_SECRET_KEY,env)!=='live')fail();
 const original=event.data?.object;
 if(!original)fail();
 async function get(path){
  const response=await fetchImpl('https://api.stripe.com/v1/'+path,{headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok)fail();
  return response.json();
 }
 let charge=original;
 if(event.type==='charge.dispute.created'){
  const id=idOf(original.charge);if(!valid(id,'ch_'))fail();
  charge=await get('charges/'+id);
  if(charge.id!==id)fail();
  const disputeIntent=idOf(original.payment_intent);
  if(disputeIntent&&disputeIntent!==idOf(charge.payment_intent))fail();
 }
 if(charge.livemode!==true||!valid(charge.id,'ch_'))fail();
 const intent=idOf(charge.payment_intent),customer=idOf(charge.customer);
 const normalized={...event,data:{...event.data,object:charge}};
 // Pack metadata is on the charge itself. Keep existing pack handling; live
 // pack checkout remains closed until its separate accounting is validated.
 if(charge.metadata?.kind==='k4k_credit_pack'){
  if(!valid(intent,'pi_'))fail();
  return {event:normalized,kind:'topup'};
 }
 const marked=typeof charge.metadata?.k4k_launch_claim==='string'&&charge.metadata.k4k_launch_claim.length>0;
 if(!valid(customer,'cus_')){if(marked)fail();return null;}
 const invoiceIds=new Set();
 const legacyInvoice=idOf(charge.invoice);
 if(legacyInvoice){
  if(!valid(legacyInvoice,'in_'))fail();invoiceIds.add(legacyInvoice);
 }else if(valid(intent,'pi_')){
  // Basil and newer Stripe API versions expose the charge/invoice connection
  // through Invoice Payments rather than charge.invoice.
  const params=new URLSearchParams({'payment[type]':'payment_intent','payment[payment_intent]':intent,limit:'100'});
  const payments=await get('invoice_payments?'+params.toString());
  if(!Array.isArray(payments.data)||payments.has_more!==false)fail();
  for(const payment of payments.data){
   if(payment.payment?.type!=='payment_intent'||idOf(payment.payment.payment_intent)!==intent)fail();
   const invoice=idOf(payment.invoice);if(!valid(invoice,'in_'))fail();
   invoiceIds.add(invoice);
  }
 }
 for(const invoiceId of invoiceIds){
  const invoice=await get('invoices/'+invoiceId);
  if(invoice.id!==invoiceId||invoice.livemode!==true||idOf(invoice.customer)!==customer)fail();
  if(!invoiceSubscriptionId(invoice))continue;
  if(isK4KLiveEvent({livemode:true,type:'invoice.paid',data:{object:invoice}},env)){
   return {event:{...normalized,data:{...normalized.data,object:{...charge,customer}}},kind:'subscription'};
  }
  // A partial list may hide the APP line. Never acknowledge uncertainty.
  if(invoice.lines?.has_more===true)fail();
 }
 if(marked)fail();
 return null;
}
