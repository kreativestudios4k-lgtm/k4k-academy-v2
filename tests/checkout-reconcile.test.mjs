// A paid customer must receive their membership and credits even when the
// Stripe webhook never arrives, and no one must be able to claim someone
// else's payment. No network call is made in this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reconcileCheckout, reconcileEventId, ReconcileError} from '../lib/server/checkout-reconcile.mjs';

const USER = '0ef1af08-4df8-4858-967b-eac1a16f9f2c';
const OTHER = '11111111-1111-4111-8111-111111111111';
const PRICE = 'price_1UZ9OgL7fmdMaK0kcN2JJFOa'; // Starter GBP, 80 credits
const SESSION = 'cs_test_a0sTnUUFtMdFbf1QCv46ImSfuPcsywDaf7lWvH4eTvowYT7HWuIQ7e5135';

const session = (over = {}) => ({id: SESSION, object: 'checkout.session', mode: 'subscription', status: 'complete',
  payment_status: 'paid', client_reference_id: USER, livemode: false, customer: 'cus_VcAgctjuIpRYT6',
  subscription: 'sub_1UawKrL7fmdMaK0kWyaLbJM7', created: 1794483445, metadata: {plan_key: 'starter'}, ...over});
const subscription = (over = {}) => ({id: 'sub_1UawKrL7fmdMaK0kWyaLbJM7', customer: 'cus_VcAgctjuIpRYT6', status: 'active',
  created: 1794483512, current_period_end: 1797075512, cancel_at_period_end: false,
  latest_invoice: 'in_1UawKqL7fmdMaK0k157SYU4u', items: {data: [{price: {id: PRICE}, current_period_end: 1797075512}]}, ...over});
const invoice = (over = {}) => ({id: 'in_1UawKqL7fmdMaK0k157SYU4u', status: 'paid', created: 1794483512,
  customer: 'cus_VcAgctjuIpRYT6', lines: {data: [{period: {end: 1797075512}, pricing: {price_details: {price: PRICE}}}]}, ...over});

function harness({sessions = [session()], sub = subscription(), inv = invoice(), fail = null} = {}) {
  const calls = {paths: [], link: [], membership: [], invoice: []};
  const reply = body => ({ok: true, status: 200, json: async () => body});
  const fetchImpl = async (url, init) => {
    const path = url.replace('https://api.stripe.com/v1/', '');
    calls.paths.push(path);
    assert.match(init.headers.Authorization, /^Bearer sk_test_/, 'must use the server secret key');
    if (fail === path) return {ok: false, status: 404, json: async () => ({})};
    if (path.startsWith('checkout/sessions?')) return reply({data: sessions});
    if (path.startsWith('checkout/sessions/')) {
      const hit = sessions.find(s => s.id === decodeURIComponent(path.split('/')[2]));
      return hit ? reply(hit) : {ok: false, status: 404, json: async () => ({})};
    }
    if (path.startsWith('subscriptions/')) return reply(sub);
    if (path.startsWith('invoices/')) return reply(inv);
    throw new Error('unexpected path ' + path);
  };
  const store = {
    async linkCustomer(args) { calls.link.push(args); return {handled: true}; },
    async applyMembership(args) { calls.membership.push(args); return {handled: true}; },
    async applyInvoiceEvent(args) { calls.invoice.push(args); return {handled: true, credits: 80}; },
  };
  return {calls, store, fetchImpl};
}
const run = (h, over = {}) => reconcileCheckout({userId: USER, secret: 'sk_test_x', store: h.store, fetchImpl: h.fetchImpl, ...over});
const rejects = (promise, code, status) => assert.rejects(promise, error => {
  assert.ok(error instanceof ReconcileError, 'expected ReconcileError, got ' + error?.message);
  assert.equal(error.code, code); if (status) assert.equal(error.status, status); return true;
});

test('a paid session grants the membership and the plan credits', async () => {
  const h = harness();
  const outcome = await run(h, {sessionId: SESSION});
  assert.deepEqual({reconciled: outcome.reconciled, plan: outcome.plan}, {reconciled: true, plan: 'starter'});
  assert.deepEqual(h.calls.link[0], {userId: USER, stripeCustomerId: 'cus_VcAgctjuIpRYT6', plan: 'starter', eventCreated: 1794483445});
  assert.equal(h.calls.membership[0].membership.stripe_subscription_id, 'sub_1UawKrL7fmdMaK0kWyaLbJM7');
  const applied = h.calls.invoice[0];
  assert.equal(applied.credits, 80);           // from the billed price, not the browser
  assert.equal(applied.userId, USER);
  assert.equal(applied.invoiceId, 'in_1UawKqL7fmdMaK0k157SYU4u');
  assert.equal(applied.eventType, 'invoice.paid');
  assert.equal(applied.status, 'active');
  // A stable id, distinct from any real Stripe event id, so a later webhook is a no-op.
  assert.equal(applied.eventId, reconcileEventId('in_1UawKqL7fmdMaK0k157SYU4u'));
  assert.doesNotMatch(applied.eventId, /^evt_/);
});

test('with no session id it finds the customer\'s own most recent paid session', async () => {
  const h = harness({sessions: [
    session({id: 'cs_test_theirs', client_reference_id: OTHER, created: 1794483999}),
    session({id: 'cs_test_older', created: 1794480000}),
    session({id: 'cs_test_unpaid', payment_status: 'unpaid', created: 1794483998}),
    session({id: SESSION, created: 1794483445}),
  ]});
  await run(h);
  assert.ok(h.calls.paths.some(p => p.startsWith('checkout/sessions?limit=100')));
  assert.equal(h.calls.invoice.length, 1);
});

for (const [name, over, code, status] of [
  ['another account\'s session', {client_reference_id: OTHER}, 'SESSION_NOT_PAYABLE', 409],
  ['an unpaid session', {payment_status: 'unpaid'}, 'SESSION_NOT_PAYABLE', 409],
  ['an incomplete session', {status: 'open'}, 'SESSION_NOT_PAYABLE', 409],
  ['a one-off payment session', {mode: 'payment'}, 'SESSION_NOT_PAYABLE', 409],
  ['a live-mode session while in test mode', {livemode: true}, 'SESSION_NOT_PAYABLE', 409],
])
  test('refuses ' + name + ', granting nothing', async () => {
    const h = harness({sessions: [session(over)]});
    await rejects(run(h, {sessionId: SESSION}), code, status);
    assert.deepEqual([h.calls.link.length, h.calls.membership.length, h.calls.invoice.length], [0, 0, 0]);
  });

test('refuses a malformed or unknown session id without calling Stripe for it', async () => {
  const h = harness();
  for (const bad of ['sub_123', '../subscriptions/sub_1', 'cs_test_<script>', 'cs_short']) await rejects(run(h, {sessionId: bad}), 'INVALID_SESSION_ID', 400);
  assert.equal(h.calls.paths.length, 0);
  // An empty id means the browser simply had none; fall back to the scoped scan.
  await run(h, {sessionId: ''});
  assert.ok(h.calls.paths.some(path => path.startsWith('checkout/sessions?limit=100')));
  await rejects(run(harness({sessions: []}), {sessionId: SESSION}), 'SESSION_NOT_FOUND', 404);
});

test('a customer with no paid session gets nothing, not an error page', async () => {
  const h = harness({sessions: [session({client_reference_id: OTHER})]});
  await rejects(run(h), 'NO_PAID_SESSION', 404);
  assert.equal(h.calls.invoice.length, 0);
});

test('an unpaid or missing invoice records the membership but grants no credits', async () => {
  const unpaid = harness({inv: invoice({status: 'open'})});
  assert.deepEqual(await run(unpaid, {sessionId: SESSION}), {reconciled: false, reason: 'INVOICE_NOT_PAID'});
  assert.equal(unpaid.calls.invoice.length, 0);
  assert.equal(unpaid.calls.membership.length, 1);
  const none = harness({sub: subscription({latest_invoice: null})});
  assert.deepEqual(await run(none, {sessionId: SESSION}), {reconciled: false, reason: 'NO_INVOICE_YET'});
  assert.equal(none.calls.invoice.length, 0);
});

test('mismatched Stripe objects are refused rather than credited', async () => {
  await rejects(run(harness({sub: subscription({customer: 'cus_someone_else'})}), {sessionId: SESSION}), 'STRIPE_ERROR', 502);
  await rejects(run(harness({inv: invoice({customer: 'cus_someone_else'})}), {sessionId: SESSION}), 'STRIPE_ERROR', 502);
});

test('an unknown billed price fails instead of guessing the credits', async () => {
  const h = harness({inv: invoice({lines: {data: [{period: {end: 1}, pricing: {price_details: {price: 'price_not_ours'}}}]}})});
  await assert.rejects(run(h, {sessionId: SESSION}), /UNKNOWN_PRICE/);
  assert.equal(h.calls.invoice.length, 0);
});

test('Stripe being unreachable is reported, not treated as payment', async () => {
  const h = harness(); h.fetchImpl = async () => { throw new Error('socket hang up'); };
  await rejects(reconcileCheckout({userId: USER, sessionId: SESSION, secret: 'sk_test_x', store: h.store, fetchImpl: h.fetchImpl}), 'STRIPE_UNREACHABLE', 502);
});

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('the route authenticates the caller and never trusts browser-supplied identity or credits', () => {
  const route = read('app/api/billing/reconcile/route.js');
  assert.match(route, /auth\.getUser\(token\)/);
  assert.match(route, /userId: user\.id/);
  assert.match(route, /assertBillingKey\(secret\)/);
  assert.doesNotMatch(route, /body\.(userId|credits|plan|customer|invoiceId|amount)/);
  assert.doesNotMatch(route, /STRIPE_SECRET_KEY[^;]*json|console\.log/);
  // Only the session id may come from the browser.
  assert.match(route, /sessionId: typeof body\.sessionId === 'string'/);
});
test('checkout sends the session id back so the return page can complete the purchase', () => {
  assert.match(read('lib/server/stripe-billing.mjs'), /success_url.*session_id=\{CHECKOUT_SESSION_ID\}/);
  const ret = read('app/k4k-app/CheckoutReturn.js');
  assert.match(ret, /\/api\/billing\/reconcile/);
  assert.match(ret, /asked=true/); // asks once, not on every poll
});
