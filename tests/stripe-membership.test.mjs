import {test} from 'node:test';
import assert from 'node:assert/strict';
import {membershipFromSubscription, planForPrice, isStale} from '../lib/server/stripe-membership.mjs';
import {handleStripeEvent} from '../lib/server/stripe-webhook-handler.mjs';
import {PLAN_PRICES} from '../lib/k4k-plan-prices.mjs';

const CREATOR_GBP = PLAN_PRICES.creator.stripePriceIds.GBP;

function subscription(overrides = {}) {
  return {
    id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: false,
    current_period_end: 1800000000,
    items: {data: [{price: {id: CREATOR_GBP}}]},
    ...overrides,
  };
}

function memoryStore({customers = {}, memberships = {}} = {}) {
  const processed = new Set();
  const granted = new Set();
  const log = [];
  return {
    log, processed, customers, memberships, granted,
    async grantCredits({userId, invoiceId, credits}) {
      if (granted.has(invoiceId)) return {granted: false};
      granted.add(invoiceId);
      return {granted: true, credits, userId};
    },
    async hasProcessedEvent(id) { return processed.has(id); },
    async markProcessed({eventId}) { processed.add(eventId); },
    async linkCustomer({userId, stripeCustomerId}) { customers[stripeCustomerId] = userId; return {handled: true}; },
    async userIdForCustomer(cus) { return customers[cus] ?? null; },
    async applyMembership({userId, membership, eventCreated}) {
      const last = memberships[userId]?.last_event_created;
      if (isStale(last, eventCreated)) return {handled: false, reason: 'STALE_EVENT'};
      memberships[userId] = {...membership, last_event_created: eventCreated};
      return {handled: true};
    },
    async applyInvoiceStatus({userId, stripeSubscriptionId, status, eventCreated}) {
      const current = memberships[userId];
      if (!current) return {handled: false, reason: 'SUBSCRIPTION_NOT_LINKED'};
      if (current.stripe_subscription_id !== stripeSubscriptionId) {
        if (Number.isFinite(current.last_event_created) && Number.isFinite(eventCreated) && current.last_event_created > eventCreated) {
          return {handled: false, reason: 'STALE_EVENT'};
        }
        return {handled: false, reason: 'SUBSCRIPTION_NOT_LINKED'};
      }
      if (isStale(current.last_event_created, eventCreated)) return {handled: false, reason: 'STALE_EVENT'};
      memberships[userId] = {...current, status, last_event_created: eventCreated};
      return {handled: true};
    },
  };
}

test('every approved price maps back to its plan and currency', () => {
  for (const [plan, entry] of Object.entries(PLAN_PRICES)) {
    for (const [currency, priceId] of Object.entries(entry.stripePriceIds)) {
      assert.deepEqual(planForPrice(priceId), {plan, currency});
    }
  }
});

test('unknown price is rejected', () => {
  assert.throws(() => planForPrice('price_unknown'), /UNKNOWN_PRICE/);
});

test('subscription maps to a membership row with period end as ISO time', () => {
  const m = membershipFromSubscription(subscription());
  assert.equal(m.plan, 'creator');
  assert.equal(m.currency, 'GBP');
  assert.equal(m.stripe_subscription_id, 'sub_1');
  assert.equal(m.current_period_end, new Date(1800000000 * 1000).toISOString());
});

test('period end is read from the item when the subscription lacks it', () => {
  const sub = subscription({current_period_end: undefined, items: {data: [{price: {id: CREATOR_GBP}, current_period_end: 1800000000}]}});
  assert.equal(membershipFromSubscription(sub).current_period_end, new Date(1800000000 * 1000).toISOString());
});

test('duplicate event is ignored after the first delivery', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}});
  const event = {id: 'evt_1', type: 'customer.subscription.created', created: 100, data: {object: subscription()}};
  assert.equal((await handleStripeEvent(event, store)).handled, true);
  assert.equal((await handleStripeEvent(event, store)).reason, 'DUPLICATE');
});

test('out-of-order older update does not overwrite a newer one', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}});
  const newer = {id: 'evt_new', type: 'customer.subscription.updated', created: 200, data: {object: subscription({status: 'past_due'})}};
  const older = {id: 'evt_old', type: 'customer.subscription.updated', created: 100, data: {object: subscription({status: 'active'})}};
  await handleStripeEvent(newer, store);
  assert.equal((await handleStripeEvent(older, store)).reason, 'STALE_EVENT');
  assert.equal(store.memberships.user_1.status, 'past_due');
});

test('subscription that arrives before checkout is retried, not dropped', async () => {
  const store = memoryStore();
  const event = {id: 'evt_early', type: 'customer.subscription.created', created: 100, data: {object: subscription()}};
  await assert.rejects(handleStripeEvent(event, store), /UNKNOWN_CUSTOMER/);
  assert.equal(store.processed.has('evt_early'), false);
});

test('deletion marks the membership canceled', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}});
  const event = {id: 'evt_del', type: 'customer.subscription.deleted', created: 300, data: {object: subscription()}};
  await handleStripeEvent(event, store);
  assert.equal(store.memberships.user_1.status, 'canceled');
});

test('failed payment marks past_due and a later paid invoice restores active', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}, memberships: {user_1: {status: 'active', stripe_subscription_id: 'sub_1', last_event_created: 100}}});
  const failed = {id: 'evt_fail', type: 'invoice.payment_failed', created: 200, data: {object: {customer: 'cus_1', subscription: 'sub_1'}}};
  const paid = {id: 'evt_paid', type: 'invoice.paid', created: 300, data: {object: {customer: 'cus_1', subscription: 'sub_1'}}};
  await handleStripeEvent(failed, store);
  assert.equal(store.memberships.user_1.status, 'past_due');
  await handleStripeEvent(paid, store);
  assert.equal(store.memberships.user_1.status, 'active');
});

test('checkout links the Stripe customer to the signed-in user', async () => {
  const store = memoryStore();
  const event = {id: 'evt_co', type: 'checkout.session.completed', created: 50,
    data: {object: {mode: 'subscription', client_reference_id: 'user_9', customer: 'cus_9', metadata: {plan_key: 'pro'}}}};
  await handleStripeEvent(event, store);
  assert.equal(store.customers.cus_9, 'user_9');
});

test('unrelated events are acknowledged without changing anything', async () => {
  const store = memoryStore();
  const result = await handleStripeEvent({id: 'evt_x', type: 'charge.refunded', created: 1, data: {object: {}}}, store);
  assert.equal(result.reason, 'IGNORED_EVENT');
});

function paidInvoice(id, reason, priceId = CREATOR_GBP) {
  return {id, customer: 'cus_1', subscription: 'sub_1', billing_reason: reason,
    lines: {data: [{price: {id: priceId}, period: {end: 1800000000}}]}};
}

test('same-second paid invoice is accepted after its subscription event', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}, memberships: {
    user_1: {status: 'incomplete', stripe_subscription_id: 'sub_1', last_event_created: 200},
  }});
  const event = {id: 'evt_same_second_invoice', type: 'invoice.paid', created: 200,
    data: {object: paidInvoice('in_same_second', 'subscription_create')}};
  const result = await handleStripeEvent(event, store);
  assert.equal(result.credits.granted, true);
  assert.equal(store.granted.has('in_same_second'), true);
});


test('invoice delivered before subscription creation remains retryable and grants after linkage', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}, memberships: {user_1: {status: 'incomplete', last_event_created: 10}}});
  const invoiceEvent = {id: 'evt_invoice_early', type: 'invoice.paid', created: 20,
    data: {object: paidInvoice('in_early', 'subscription_create')}};

  await assert.rejects(handleStripeEvent(invoiceEvent, store), /SUBSCRIPTION_NOT_LINKED/);
  assert.equal(store.processed.has(invoiceEvent.id), false);
  assert.equal(store.granted.has('in_early'), false);

  const subscriptionEvent = {id: 'evt_subscription_later', type: 'customer.subscription.created', created: 15,
    data: {object: subscription()}};
  await handleStripeEvent(subscriptionEvent, store);
  const replayed = await handleStripeEvent(invoiceEvent, store);
  assert.equal(replayed.credits.granted, true);
  assert.equal(store.granted.has('in_early'), true);
});

test('older invoice for a replaced subscription is acknowledged as stale, not retried forever', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}, memberships: {
    user_1: {status: 'active', stripe_subscription_id: 'sub_new', last_event_created: 300},
  }});
  const event = {id: 'evt_old_sub_invoice', type: 'invoice.paid', created: 200,
    data: {object: {...paidInvoice('in_old_sub', 'subscription_cycle'), subscription: 'sub_old'}}};
  const result = await handleStripeEvent(event, store);
  assert.equal(result.reason, 'STALE_EVENT');
  assert.equal(store.processed.has(event.id), true);
  assert.equal(store.granted.has('in_old_sub'), false);
});

test('first payment and each renewal grant that plan credits', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}, memberships: {user_1: {status: 'incomplete', stripe_subscription_id: 'sub_1', last_event_created: 1}}});
  const first = {id: 'evt_p1', type: 'invoice.paid', created: 10, data: {object: paidInvoice('in_1', 'subscription_create')}};
  const renewal = {id: 'evt_p2', type: 'invoice.paid', created: 20, data: {object: paidInvoice('in_2', 'subscription_cycle')}};
  assert.equal((await handleStripeEvent(first, store)).credits.credits, 160);
  assert.equal((await handleStripeEvent(renewal, store)).credits.credits, 160);
});

test('a retried invoice does not grant credits twice', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}, memberships: {user_1: {status: 'incomplete', stripe_subscription_id: 'sub_1', last_event_created: 1}}});
  const once = {id: 'evt_r1', type: 'invoice.paid', created: 10, data: {object: paidInvoice('in_9', 'subscription_cycle')}};
  const again = {id: 'evt_r2', type: 'invoice.paid', created: 11, data: {object: paidInvoice('in_9', 'subscription_cycle')}};
  await handleStripeEvent(once, store);
  const second = await handleStripeEvent(again, store);
  assert.equal(second.credits.granted, false);
});

test('plan changes and manual invoices grant no credits', async () => {
  const store = memoryStore({customers: {cus_1: 'user_1'}, memberships: {user_1: {status: 'active', stripe_subscription_id: 'sub_1', last_event_created: 1}}});
  const change = {id: 'evt_c1', type: 'invoice.paid', created: 10, data: {object: paidInvoice('in_c', 'subscription_update')}};
  const result = await handleStripeEvent(change, store);
  assert.equal(result.credits, undefined);
  assert.equal(store.granted.size, 0);
});
