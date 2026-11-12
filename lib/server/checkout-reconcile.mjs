// Completing a paid subscription without waiting for the webhook.
//
// Stripe's own guidance is to handle both the redirect back from Checkout and
// the webhook, because either can be delayed or fail. Until 12 November 2026
// K4K relied on the webhook alone, so a customer could pay and receive nothing.
//
// Nothing here trusts the browser. The caller supplies only a session id; this
// module re-reads the session, subscription and invoice from Stripe with the
// server's secret key, refuses any session that is not the signed-in user's own
// completed and paid subscription, and then applies exactly the same store
// operations the webhook handler applies. Credits cannot be granted twice:
// k4k_apply_invoice_event ignores a repeated event id and the credit grant is
// keyed on the invoice id, so a later webhook delivery is a no-op.
import {membershipFromSubscription, planForPrice, PLAN_CREDITS} from './stripe-membership.mjs';

const SESSION_ID = /^cs_[A-Za-z0-9_]{8,250}$/;
// A reconciled invoice gets its own stable event id so it can never collide
// with the real Stripe event id that the webhook would use.
export const reconcileEventId = invoiceId => 'reconcile_' + invoiceId;

export class ReconcileError extends Error {
  constructor(code, status) { super(code); this.name = 'ReconcileError'; this.code = code; this.status = status; }
}

function stripeGet(secret, fetchImpl) {
  return async function get(path) {
    let response;
    try {
      response = await fetchImpl('https://api.stripe.com/v1/' + path, {
        headers: {Authorization: 'Bearer ' + secret}, signal: AbortSignal.timeout(12000),
      });
    } catch { throw new ReconcileError('STRIPE_UNREACHABLE', 502); }
    if (!response?.ok) throw new ReconcileError(response?.status === 404 ? 'SESSION_NOT_FOUND' : 'STRIPE_ERROR', response?.status === 404 ? 404 : 502);
    try { return await response.json(); } catch { throw new ReconcileError('STRIPE_ERROR', 502); }
  };
}

const idOf = value => (typeof value === 'string' ? value : value?.id) || null;

// The customer's own completed subscription session, or nothing.
function usable(session, userId, liveMode) {
  return session?.mode === 'subscription' && session.status === 'complete' && session.payment_status === 'paid'
    && session.client_reference_id === userId && session.livemode === liveMode && !!idOf(session.customer);
}

export async function reconcileCheckout({userId, sessionId = null, secret, store, liveMode = false, fetchImpl = globalThis.fetch} = {}) {
  if (typeof window !== 'undefined') throw new Error('Server only');
  if (!userId || !secret || !store) throw new ReconcileError('UNAVAILABLE', 503);
  const get = stripeGet(secret, fetchImpl);

  let session;
  if (sessionId) {
    if (!SESSION_ID.test(sessionId)) throw new ReconcileError('INVALID_SESSION_ID', 400);
    session = await get('checkout/sessions/' + encodeURIComponent(sessionId));
    // Someone else's session id must never reconcile onto this account.
    if (!usable(session, userId, liveMode)) throw new ReconcileError('SESSION_NOT_PAYABLE', 409);
  } else {
    // Sessions created before the success URL carried an id, and any customer
    // who lost the return page. Stripe cannot filter by client_reference_id,
    // so scan one recent page and keep only this user's own paid session.
    const list = await get('checkout/sessions?limit=100');
    const mine = (list?.data ?? []).filter(item => usable(item, userId, liveMode));
    if (!mine.length) throw new ReconcileError('NO_PAID_SESSION', 404);
    session = mine.reduce((newest, item) => (item.created > newest.created ? item : newest));
  }

  const subscriptionId = idOf(session.subscription);
  if (!subscriptionId) throw new ReconcileError('SESSION_NOT_PAYABLE', 409);
  const subscription = await get('subscriptions/' + encodeURIComponent(subscriptionId));
  if (idOf(subscription?.customer) !== idOf(session.customer)) throw new ReconcileError('STRIPE_ERROR', 502);

  // Link the Stripe customer to this account, then record the subscription.
  // Both are what checkout.session.completed and customer.subscription.created do.
  await store.linkCustomer({userId, stripeCustomerId: idOf(session.customer), plan: session.metadata?.plan_key, eventCreated: session.created});
  const membership = membershipFromSubscription(subscription);
  await store.applyMembership({userId, membership, eventCreated: subscription.created});

  const invoiceId = idOf(subscription.latest_invoice);
  if (!invoiceId) return {reconciled: false, reason: 'NO_INVOICE_YET'};
  const invoice = await get('invoices/' + encodeURIComponent(invoiceId));
  if (invoice?.status !== 'paid') return {reconciled: false, reason: 'INVOICE_NOT_PAID'};
  if (idOf(invoice.customer) !== idOf(session.customer)) throw new ReconcileError('STRIPE_ERROR', 502);

  // Credits come from the billed price, never from anything the browser said.
  const {plan} = planForPrice(invoice.lines?.data?.[0]?.pricing?.price_details?.price ?? invoice.lines?.data?.[0]?.price?.id);
  const result = await store.applyInvoiceEvent({
    eventId: reconcileEventId(invoiceId), eventType: 'invoice.paid', eventCreated: invoice.created,
    userId, stripeCustomerId: idOf(invoice.customer), stripeSubscriptionId: subscriptionId, invoiceId,
    status: 'active', periodEnd: invoice.lines?.data?.[0]?.period?.end ?? null, credits: PLAN_CREDITS[plan] ?? 0,
  });
  return {reconciled: true, plan, invoiceId, result};
}
