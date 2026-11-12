import {NextResponse} from 'next/server';
import {assertTestModeKey, verifyStripeSignature} from '../../../../lib/server/stripe-billing.mjs';
import {handleStripeEvent} from '../../../../lib/server/stripe-webhook-handler.mjs';
import {createMembershipStore} from '../../../../lib/server/stripe-membership-store.mjs';

export const runtime = 'nodejs';

const NO_STORE = {'Cache-Control': 'no-store'};

// Subscription events require the server-only Supabase service-role credential.
// If it is absent, return 503 so Stripe retries without acknowledging the event.
const SUBSCRIPTION_EVENTS = new Set([
  'checkout.session.completed',
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
    return !object?.subscription;
  }
  if (event.type === 'checkout.session.completed') {
    return object?.mode !== 'subscription';
  }
  return false;
}

export async function POST(request) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({error: 'PREVIEW_ONLY'}, {status: 403, headers: NO_STORE});
  }
  try {
    assertTestModeKey(process.env.STRIPE_SECRET_KEY);
  } catch {
    return NextResponse.json({error: 'TEST_MODE_ONLY'}, {status: 503, headers: NO_STORE});
  }
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

  if (!SUBSCRIPTION_EVENTS.has(event.type)) {
    return NextResponse.json({received: true, type: event.type, handled: false}, {status: 200, headers: NO_STORE});
  }

  if (isNonSubscriptionEvent(event)) {
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
    const result = await handleStripeEvent(event, createMembershipStore({url, serviceKey}));
    return NextResponse.json({received: true, type: event.type, ...result}, {status: 200, headers: NO_STORE});
  } catch (error) {
    // Any failure returns 503 so Stripe retries the event later.
    return NextResponse.json({error: 'RETRY', reason: String(error?.message || 'UNKNOWN')}, {status: 503, headers: NO_STORE});
  }
}
