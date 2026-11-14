import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {PLAN_PRICES, PLAN_CURRENCIES} from '../lib/k4k-plan-prices.mjs';
import {assertTestModeKey, buildCheckoutForm, resolvePrice, verifyStripeSignature} from '../lib/server/stripe-billing.mjs';

const SECRET = 'whsec_test_secret';
const PAYLOAD = '{"id":"evt_1","type":"invoice.paid"}';

function sign(payload, timestamp, secret = SECRET) {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

test('all 16 approved plan and currency pairs resolve to their Stripe price IDs', () => {
  const seen = new Set();
  for (const plan of Object.keys(PLAN_PRICES)) {
    for (const currency of PLAN_CURRENCIES) {
      const id = resolvePrice(plan, currency);
      assert.equal(id, PLAN_PRICES[plan].stripePriceIds[currency]);
      seen.add(id);
    }
  }
  assert.equal(seen.size, 16);
});

test('invalid plans and currencies are rejected', () => {
  assert.equal(resolvePrice('premium', 'GBP'), null);
  assert.equal(resolvePrice('starter', 'JPY'), null);
  assert.equal(resolvePrice('__proto__', 'GBP'), null);
  assert.equal(resolvePrice('constructor', 'GBP'), null);
  assert.equal(resolvePrice(undefined, undefined), null);
});

test('only test-mode keys are accepted', () => {
  assert.doesNotThrow(() => assertTestModeKey('sk_test_abc'));
  assert.throws(() => assertTestModeKey('sk_live_abc'), /test key/);
  assert.throws(() => assertTestModeKey('rk_live_abc'), /test key/);
  assert.throws(() => assertTestModeKey(undefined), /test key/);
});

test('a correctly signed, fresh webhook verifies', () => {
  const now = 1_800_000_000;
  assert.equal(verifyStripeSignature({payload: PAYLOAD, header: sign(PAYLOAD, now), secret: SECRET, now}), true);
});

test('tampered payloads, wrong secrets and stale timestamps are rejected', () => {
  const now = 1_800_000_000;
  const header = sign(PAYLOAD, now);
  assert.equal(verifyStripeSignature({payload: PAYLOAD + ' ', header, secret: SECRET, now}), false);
  assert.equal(verifyStripeSignature({payload: PAYLOAD, header, secret: 'wrong', now}), false);
  assert.equal(verifyStripeSignature({payload: PAYLOAD, header: sign(PAYLOAD, now - 1000), secret: SECRET, now}), false);
  assert.equal(verifyStripeSignature({payload: PAYLOAD, header: sign(PAYLOAD, now + 1000), secret: SECRET, now}), false);
});

test('a valid signature among several v1 values is accepted, and malformed headers are rejected', () => {
  const now = 1_800_000_000;
  const good = sign(PAYLOAD, now).split(',')[1].slice(3);
  const header = `t=${now},v1=deadbeef,v1=${good}`;
  assert.equal(verifyStripeSignature({payload: PAYLOAD, header, secret: SECRET, now}), true);
  assert.equal(verifyStripeSignature({payload: PAYLOAD, header: 'v1=abc', secret: SECRET, now}), false);
  assert.equal(verifyStripeSignature({payload: PAYLOAD, header: null, secret: SECRET, now}), false);
  assert.equal(verifyStripeSignature({payload: PAYLOAD, header: `t=${now},v1=zz`, secret: SECRET, now}), false);
});

test('checkout form carries the mode, price, user and plan, and never an amount', () => {
  const form = buildCheckoutForm({
    priceId: 'price_x',
    userId: 'user-1',
    origin: 'https://example.test',
    plan: 'starter',
    currency: 'GBP',
  });
  assert.equal(form.get('mode'), 'subscription');
  assert.equal(form.get('line_items[0][price]'), 'price_x');
  assert.equal(form.get('client_reference_id'), 'user-1');
  assert.equal(form.get('metadata[plan_key]'), 'starter');
  // The session id lets the return page complete the purchase if the webhook is late.
 assert.equal(form.get('success_url'), 'https://example.test/k4k-app/creator?checkout=success&session_id={CHECKOUT_SESSION_ID}');
  assert.equal(form.get('cancel_url'), 'https://example.test/k4k-app/credits?plan=starter&checkout=cancelled');
  assert.equal(form.get('line_items[0][quantity]'), '1');
  assert.equal(form.get('subscription_data[metadata][plan_key]'), 'starter');
  assert.equal(form.has('line_items[0][price_data][unit_amount]'), false);
});
