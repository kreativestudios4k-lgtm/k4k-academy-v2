import {NextResponse} from 'next/server';
import {verifyStripeSignature} from '../../../../lib/server/stripe-billing.mjs';

export const runtime = 'nodejs';

const NO_STORE = {'Cache-Control': 'no-store'};

// Events that will change access or billing records. They are refused with 503
// until the database writes are approved, so Stripe keeps retrying them.
const PENDING_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

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

  if (PENDING_EVENTS.has(event.type)) {
    return NextResponse.json({error: 'NOT_PROCESSING_YET', type: event.type}, {status: 503, headers: NO_STORE});
  }
  return NextResponse.json({received: true, type: event.type, handled: false}, {status: 200, headers: NO_STORE});
}
