// Isolated Stripe TEST subscription billing state. Never touches legacy memberships
// or the credit wallet. Only re-fetched, owned Stripe TEST invoices can change state.
import {sandboxPriceAllowed} from './v2-sandbox-catalog.mjs';
import {invoiceLinePriceId,invoiceSubscriptionId} from './stripe-invoice-shape.mjs';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const stripeId=(id,prefix)=>typeof id==='string'&&id.startsWith(prefix)&&id.length>prefix.length+6;
const ofId=x=>typeof x==='string'?x:typeof x?.id==='string'?x.id:null;

async function readOwnedInvoice({invoiceId,stripe,gateway}){
 if(!stripeId(invoiceId,'in_')||typeof stripe?.getInvoice!=='function'||
    typeof stripe?.getSubscription!=='function'||
    typeof gateway?.findBinding!=='function')throw Error('V2_TEST_BILLING_DEPENDENCIES_MISSING');
 const invoice=await stripe.getInvoice(invoiceId);
 const lines=invoice?.lines?.data;
 const priceId=lines?.length===1?invoiceLinePriceId(lines[0]):null;
 const contract=sandboxPriceAllowed(priceId,'subscription_invoice');
 const subscriptionId=invoiceSubscriptionId(invoice);
 if(invoice?.id!==invoiceId||invoice.livemode!==false||
    !contract||lines.length!==1||lines[0].quantity!==1||
    !stripeId(invoice.customer,'cus_')||!stripeId(subscriptionId,'sub_')||
    !['subscription_create','subscription_cycle'].includes(invoice.billing_reason)||
    invoice.currency!==contract.currency.toLowerCase()||
    invoice.total!==contract.amountMinor||
    invoice.amount_due!==contract.amountMinor||
    (invoice.discounts?.length||0)!==0||
    (invoice.total_discount_amounts||[]).some(d=>d.amount!==0))
   throw Error('V2_TEST_BILLING_INVOICE_INVALID');
 const sub=await stripe.getSubscription(subscriptionId);
 const customerId=ofId(sub?.customer),latestId=ofId(sub?.latest_invoice);
 const items=sub?.items?.data;
 if(sub?.id!==subscriptionId||sub.livemode!==false||
    customerId!==invoice.customer||!stripeId(customerId,'cus_')||
    sub.metadata?.kind!=='k4k_v2_subscription'||
    sub.metadata?.credit_version!=='v2'||!uuid.test(sub.metadata?.user_id||'')||
    items?.length!==1||items[0].quantity!==1||
    items[0].price?.id!==contract.priceId)
   throw Error('V2_TEST_BILLING_SUBSCRIPTION_INVALID');
 const binding=await gateway.findBinding({
  kind:'subscription',customerId,subscriptionId,priceId:contract.priceId
 });
 if(!binding||binding.kind!=='subscription'||binding.status!=='active'||
    binding.userId!==sub.metadata.user_id||
    binding.customerId!==customerId||
    binding.subscriptionId!==subscriptionId||
    binding.priceId!==contract.priceId)
   throw Error('V2_TEST_BILLING_OWNER_INVALID');
 return {invoice,sub,binding,contract,latestId};
}
export async function reconcileFailedTestInvoice({invoiceId,stripe,gateway}={}){
 const {invoice,sub,binding,contract,latestId}=await readOwnedInvoice({invoiceId,stripe,gateway});
 // Stripe can deliver a failed event late, after the invoice was paid or replaced.
 // Never reopen an old failure or undo an already verified recovery.
 if(latestId!==invoiceId||invoice.status==='paid')
  return {handled:true,kind:'subscription_payment_failure_stale',credits:0,duplicate:true};
 if(invoice.billing_reason!=='subscription_cycle'||
    invoice.status!=='open'||invoice.amount_paid!==0||
    invoice.amount_remaining!==contract.amountMinor||
    invoice.attempted!==true||!Number.isSafeInteger(invoice.attempt_count)||
    invoice.attempt_count<1||!['past_due','unpaid'].includes(sub.status))
   throw Error('V2_TEST_BILLING_FAILURE_UNVERIFIED');
 if(typeof gateway.setSubscriptionBillingState!=='function')
   throw Error('V2_TEST_BILLING_STATE_STORAGE_UNAVAILABLE');
 const result=await gateway.setSubscriptionBillingState({
  binding,state:'past_due',invoiceId
 });
 if(!result||result.state!=='past_due'||result.invoiceId!==invoiceId)
   throw Error('V2_TEST_BILLING_FAILURE_STATE_NOT_WRITTEN');
 // Failed invoices never create credits, and previously purchased credits remain.
 return {handled:true,kind:'subscription_payment_failed',credits:0,duplicate:result.duplicate===true};
}
export async function reconcilePaidTestInvoice({invoiceId,stripe,gateway}={}){
 const {invoice,sub,binding,contract,latestId}=await readOwnedInvoice({invoiceId,stripe,gateway});
 if(invoice.status!=='paid'||invoice.amount_paid!==contract.amountMinor||
    invoice.amount_remaining!==0)
   throw Error('V2_TEST_BILLING_RECOVERY_UNVERIFIED');
 if(latestId!==invoiceId||sub.status!=='active')
  return {handled:true,kind:'subscription_payment_recovery_stale',credits:0};
 if(typeof gateway.setSubscriptionBillingState!=='function')
  throw Error('V2_TEST_BILLING_STATE_STORAGE_UNAVAILABLE');
 const result=await gateway.setSubscriptionBillingState({binding,state:'current',invoiceId});
 if(!result||result.state!=='current'||result.invoiceId!==invoiceId)
  throw Error('V2_TEST_BILLING_RECOVERY_STATE_NOT_WRITTEN');
 return {handled:true,kind:'subscription_payment_current',credits:0,duplicate:result.duplicate===true};
}
