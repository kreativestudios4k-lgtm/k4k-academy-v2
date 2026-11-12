import {createHmac, timingSafeEqual} from 'node:crypto';
import {PLAN_PRICES, PLAN_CURRENCIES} from '../k4k-plan-prices.mjs';

export const SIGNATURE_TOLERANCE_SECONDS = 300;

// Returns the approved Stripe price ID for a plan and currency, or null.
// Browser input is only ever used as a lookup key into this allowlist.
export function resolvePrice(plan, currency) {
  const entry = Object.prototype.hasOwnProperty.call(PLAN_PRICES, plan) ? PLAN_PRICES[plan] : null;
  if (!entry || !PLAN_CURRENCIES.includes(currency)) return null;
  return entry.stripePriceIds[currency] ?? null;
}

// Live checkout stays off: only test-mode secret keys are accepted.
export function assertTestModeKey(secretKey) {
  if (typeof secretKey !== 'string' || !secretKey.startsWith('sk_test_')) {
    throw new Error('Stripe key must be a test key while live checkout is disabled');
  }
}

// Verifies a Stripe-Signature header against the raw request body.
export function verifyStripeSignature({payload, header, secret, now = Math.floor(Date.now() / 1000), tolerance = SIGNATURE_TOLERANCE_SECONDS}) {
  if (typeof payload !== 'string' || typeof header !== 'string' || !secret) return false;
  const parts = header.split(',').map((part) => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value).filter(Boolean);
  if (!timestamp || signatures.length === 0) return false;
  const issuedAt = Number(timestamp);
  if (!Number.isInteger(issuedAt) || Math.abs(now - issuedAt) > tolerance) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex'), 'hex');
  return signatures.some((signature) => {
    const given = Buffer.from(signature, 'hex');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

// Form body for POST /v1/checkout/sessions. The price comes from resolvePrice only.
export function buildCheckoutForm({priceId, userId, origin, plan, currency}) {
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('line_items[0][price]', priceId);
  form.set('line_items[0][quantity]', '1');
  form.set('client_reference_id', userId);
  // {CHECKOUT_SESSION_ID} lets the return page complete the purchase itself
  // when the webhook is late or fails. Stripe substitutes the real id.
  form.set('success_url', `${origin}/k4k-app/creator?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${origin}/k4k-app/credits?checkout=cancelled`);
  form.set('metadata[plan_key]', plan);
  form.set('metadata[currency]', currency);
  form.set('subscription_data[metadata][plan_key]', plan);
  return form;
}
