// Applies one Stripe event to K4K memberships. Storage is injected so the logic
// can be tested without a database. Throwing makes the route return 503, so Stripe retries.
import {membershipFromSubscription, planForPrice, PLAN_CREDITS, CREDIT_GRANT_REASONS} from './stripe-membership.mjs';

export async function handleStripeEvent(event, store) {
  if (await store.hasProcessedEvent(event.id)) return {handled: false, reason: 'DUPLICATE'};

  let result;
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription') {
        result = {handled: false, reason: 'NOT_SUBSCRIPTION'};
        break;
      }
      const userId = session.client_reference_id;
      if (!userId || !session.customer) throw new Error('MISSING_CHECKOUT_FIELDS');
      result = await store.linkCustomer({
        userId,
        stripeCustomerId: session.customer,
        plan: session.metadata?.plan_key,
        eventCreated: event.created,
      });
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = await store.userIdForCustomer(sub.customer);
      // Subscription arrived before checkout linked the customer: retry later.
      if (!userId) throw new Error('UNKNOWN_CUSTOMER');
      const membership = membershipFromSubscription(sub);
      if (event.type === 'customer.subscription.deleted') membership.status = 'canceled';
      result = await store.applyMembership({userId, membership, eventCreated: event.created});
      break;
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (!invoice.subscription) {
        result = {handled: false, reason: 'NOT_SUBSCRIPTION'};
        break;
      }
      const userId = await store.userIdForCustomer(invoice.customer);
      if (!userId) throw new Error('UNKNOWN_CUSTOMER');
      result = await store.applyInvoiceStatus({
        userId,
        stripeSubscriptionId: invoice.subscription,
        status: event.type === 'invoice.paid' ? 'active' : 'past_due',
        periodEnd: invoice.lines?.data?.[0]?.period?.end ?? null,
        eventCreated: event.created,
      });
      if (event.type === 'invoice.paid' && CREDIT_GRANT_REASONS.includes(invoice.billing_reason)) {
        const {plan} = planForPrice(invoice.lines?.data?.[0]?.price?.id);
        const grant = await store.grantCredits({userId, invoiceId: invoice.id, credits: PLAN_CREDITS[plan]});
        result = {...result, credits: grant};
      }
      break;
    }
    default:
      result = {handled: false, reason: 'IGNORED_EVENT'};
  }

  await store.markProcessed({eventId: event.id, type: event.type});
  return result;
}
