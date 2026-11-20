// Internal Stripe TEST-only event dispatcher. Signature verification MUST be
// completed by the HTTP route before this is invoked. Never accepts LIVE events.
// No legacy wallets or subscriptions are touched.
import {assertV2SandboxRuntime,sandboxPriceAllowed} from './v2-sandbox-catalog.mjs';
import {invoiceLinePriceId} from './stripe-invoice-shape.mjs';
import {createV2SandboxCheckoutBindingFlow} from './v2-sandbox-checkout-binding-flow.mjs';
import {createV2SandboxPaymentAdapter} from './v2-sandbox-payment-adapter.mjs';

const validEvent=e=>e&&e.livemode===false&&typeof e.id==='string'&&
 /^evt_[A-Za-z0-9_]{7,}$/.test(e.id);

export function createV2SandboxWebhookDispatcher({stripe,gateway,env=process.env}={}){
 assertV2SandboxRuntime(env);
 if(!stripe||!gateway)throw Error('V2_TEST_DISPATCHER_DEPENDENCIES_MISSING');
 const binding=createV2SandboxCheckoutBindingFlow({stripe,gateway,env});
 const payment=createV2SandboxPaymentAdapter({stripe,gateway,env});
 return Object.freeze({
  async handleVerifiedEvent(event){
   if(!validEvent(event))throw Error('V2_TEST_WEBHOOK_EVENT_INVALID');
   const obj=event.data?.object;
   if(!obj||typeof obj!=='object')throw Error('V2_TEST_WEBHOOK_OBJECT_INVALID');
   if(event.type==='checkout.session.completed'){
    // This webhook receives account-wide Stripe TEST events. Ignore other
    // apps' sessions; never mutate the V2 ledger on external Checkout events.
    if(obj.metadata?.credit_version!=='v2'||
       !['k4k_v2_single_video','k4k_v2_subscription'].includes(obj.metadata?.kind))
     return {handled:false,reason:'OUTSIDE_K4K_V2_TEST_SCOPE'};
    if(typeof obj.id!=='string'||!obj.id.startsWith('cs_test_'))
     throw Error('V2_TEST_SESSION_INVALID');
    const active=await binding.activatePaidSession({sessionId:obj.id});
    if(active.kind==='single_video'){
     return payment.applyPaidSingleVideo({sessionId:obj.id,eventId:event.id});
    }
    return {handled:true,kind:'subscription_binding_activated',credits:0};
   }
   if(event.type==='invoice.paid'){
    // Only V2 TEST subscription prices may invoke this isolated credit ledger.
    const hint=obj.metadata?.credit_version==='v2'||
     obj.parent?.subscription_details?.metadata?.credit_version==='v2';
    const line=obj.lines?.data?.[0];
    const testContract=sandboxPriceAllowed(invoiceLinePriceId(line),'subscription_invoice');
    if(!testContract&&!hint)
     return {handled:false,reason:'OUTSIDE_K4K_V2_TEST_SCOPE'};
    if(!testContract)throw Error('V2_TEST_INVOICE_PRICE_INVALID');
    if(typeof obj.id!=='string'||!obj.id.startsWith('in_'))
     throw Error('V2_TEST_INVOICE_ID_INVALID');
    return payment.applyPaidInvoice({invoiceId:obj.id,eventId:event.id});
   }
   if(event.type==='charge.refunded'){
    const chargeId=obj.id;
    const receiptId=typeof obj.invoice==='string'?obj.invoice:
      typeof obj.invoice?.id==='string'?obj.invoice.id:
      typeof obj.payment_intent==='string'?obj.payment_intent:obj.payment_intent?.id;
    // Never reject refunds belonging to other apps using this TEST account.
    // This is a scope check only; payment.applyFullRefund independently
    // re-fetches and verifies the charge before making any credit change.
    if(!receiptId||typeof gateway.findReceipt!=='function'||
       !await gateway.findReceipt(receiptId))
     return {handled:false,reason:'OUTSIDE_K4K_V2_TEST_SCOPE'};
    return payment.applyFullRefund({chargeId,receiptId,eventId:event.id});
   }
   // These affect financial state. A 200 without recording or handling the
   // state would silently lose the only webhook delivery. Return 503 until
   // the TEST-only cancellation/failure reconciliation is implemented.
   if(['invoice.payment_failed','checkout.session.expired','customer.subscription.deleted'].includes(event.type))
    throw Error('V2_TEST_ACCOUNT_STATE_RECONCILIATION_PENDING');
   if(event.type==='charge.dispute.created')
    throw Error('V2_TEST_DISPUTE_REVIEW_REQUIRED');
   return {handled:false,reason:'OUTSIDE_V2_TEST_SCOPE'};
  }
 });
}
