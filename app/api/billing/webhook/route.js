import {NextResponse} from 'next/server';
import {verifyStripeSignature} from '../../../../lib/server/stripe-billing.mjs';
import {handleStripeEvent} from '../../../../lib/server/stripe-webhook-handler.mjs';
import {billingProcessingMode} from '../../../../lib/server/billing-policy.mjs';
import {invoiceSubscriptionId} from '../../../../lib/server/stripe-invoice-shape.mjs';
import {createMembershipStore} from '../../../../lib/server/stripe-membership-store.mjs';
import {isK4KLiveEvent} from '../../../../lib/server/live-webhook-scope.mjs';
import {resolveLiveBillingReview} from '../../../../lib/server/live-billing-review.mjs';
import {isLiveWebhookAudit} from '../../../../lib/server/live-webhook-audit.mjs';

export const runtime = 'nodejs';

const NO_STORE = {'Cache-Control': 'no-store'};

// Until the database migration is approved and SUPABASE_SERVICE_ROLE_KEY is set,
// subscription events are refused with 503 so Stripe keeps retrying them.
const SUBSCRIPTION_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.expired',
  'charge.refunded',
  'charge.dispute.created',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

// Manual invoices and non-subscription checkouts never change memberships or credits,
// so they are acknowledged without needing the database.
function isNonSubscriptionEvent(event) {
  const object = event?.data?.object;
  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    return !invoiceSubscriptionId(object);
  }
  if (event.type === 'checkout.session.completed') {
    return object?.mode !== 'subscription'&&object?.metadata?.kind!=='k4k_credit_pack';
  }
  return false;
}

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({error: 'UNAVAILABLE'}, {status: 503, headers: NO_STORE});

  const payload = await request.text();
  const header = request.headers.get('stripe-signature');
  if (!verifyStripeSignature({payload, header, secret})) {
    return NextResponse.json({error: 'INVALID_SIGNATURE'}, {status: 400, headers: NO_STORE});
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({error: 'INVALID_PAYLOAD'}, {status: 400, headers: NO_STORE});
  }

  // Production uses a live endpoint secret regardless of whether checkout is open.
  // Preview must never process a live event or write live membership state.
  const production=billingProcessingMode()==='live';
  if(event.livemode!==production)return NextResponse.json({error:'BILLING_MODE_MISMATCH'},{status:400,headers:NO_STORE});

  if (!SUBSCRIPTION_EVENTS.has(event.type)) {
    return NextResponse.json({received: true, type: event.type, handled: false}, {status: 200, headers: NO_STORE});
  }

  if(production&&isLiveWebhookAudit(event)){
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!serviceKey)return NextResponse.json({error:'NOT_PROCESSING_YET'},{status:503,headers:NO_STORE});
    try{
      await createMembershipStore({url,serviceKey,liveMode:true}).markProcessed({eventId:event.id,type:event.type});
      return NextResponse.json({received:true,handled:true,audit:true},{status:200,headers:NO_STORE});
    }catch{return NextResponse.json({error:'RETRY',reason:'AUDIT_RECEIPT_UNAVAILABLE'},{status:503,headers:NO_STORE});}
  }

  let billingReviewKind=null;
  try {
    if(production&&['charge.refunded','charge.dispute.created'].includes(event.type)){
      const review=await resolveLiveBillingReview(event);
      if(!review)return NextResponse.json({received:true,handled:false,reason:'OUTSIDE_K4K_APP'},{status:200,headers:NO_STORE});
      event=review.event;billingReviewKind=review.kind;
    }else if(!isK4KLiveEvent(event))return NextResponse.json({received:true,handled:false,reason:'OUTSIDE_K4K_APP'},{status:200,headers:NO_STORE});
  } catch { return NextResponse.json({error:'RETRY',reason:'LIVE_SCOPE_UNAVAILABLE'},{status:503,headers:NO_STORE}); }

  // Pausing new purchases must not interrupt existing subscriptions, refunds
  // or paid checkouts. Only verified, correctly scoped events reach the store.

  let nonSubscription;
  try{nonSubscription=isNonSubscriptionEvent(event)}catch{return NextResponse.json({error:'CONFLICTING_INVOICE_FIELDS'}, {status:400,headers:NO_STORE})}
  if (nonSubscription) {
    return NextResponse.json(
      {received: true, type: event.type, handled: false, reason: 'NOT_SUBSCRIPTION'},
      {status: 200, headers: NO_STORE},
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({error: 'NOT_PROCESSING_YET', type: event.type}, {status: 503, headers: NO_STORE});
  }

  try {
    const result = await handleStripeEvent(event, createMembershipStore({url, serviceKey, liveMode:production}),{liveMode:production,billingReviewKind});
    return NextResponse.json({received: true, type: event.type, ...result}, {status: 200, headers: NO_STORE});
  } catch (error) {
    // Any failure returns 503 so Stripe retries the event later.
    return NextResponse.json({error: 'RETRY', reason: String(error?.message || 'UNKNOWN')}, {status: 503, headers: NO_STORE});
  }
}
