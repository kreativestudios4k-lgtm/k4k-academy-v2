// Applies one Stripe event to K4K memberships. Storage is injected so the logic
// can be tested without a database. Throwing makes the route return 503, so Stripe retries.
import {membershipFromSubscription, planForPrice, PLAN_CREDITS, CREDIT_GRANT_REASONS} from './stripe-membership.mjs';

import {verifiedTopup} from './credit-packs.mjs';
import {invoiceSubscriptionId,invoiceLinePriceId} from './stripe-invoice-shape.mjs';

export async function handleStripeEvent(event, store,{liveMode=event?.livemode===true,env=process.env}={}) {
  if(typeof event?.livemode==='boolean'&&event.livemode!==liveMode)throw Error('BILLING_MODE_MISMATCH');
  const priceOptions={liveMode,env};
  if (await store.hasProcessedEvent(event.id)) return {handled: false, reason: 'DUPLICATE'};

  let result;
  switch (event.type) {
    case 'checkout.session.expired': {
      const session=event.data.object;
      if(session.livemode===true&&session.mode==='subscription'&&session.metadata?.k4k_launch_claim)result=await store.launchOutcome(session,'expired');
      else result={handled:false,reason:'NOT_LAUNCH_CHECKOUT'};
      break;
    }
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object;
      if(session.mode==='payment'&&session.metadata?.kind==='k4k_credit_pack'){
        const payment=verifiedTopup(await store.checkoutSession(session.id),priceOptions);
        if(!payment)throw Error('INVALID_TOPUP_SESSION');
        if(payment.pending){result={handled:false,reason:'PAYMENT_PENDING'};break;}
        if(payment.reversed){result={handled:false,reason:'PAYMENT_REVERSED'};break;}
        return store.applyTopupEvent({p_event:event.id,p_type:event.type,p_session:payment.sessionId,p_user:payment.userId,p_intent:payment.intentId,p_pack:payment.pack.id,p_credits:payment.pack.credits,p_amount:payment.pack.amount,p_currency:payment.pack.currency,p_total:payment.total});
      }
      if(event.type==='checkout.session.async_payment_succeeded'&&session.mode!=='subscription'){result={handled:false,reason:'NOT_TOPUP'};break;}
      if (session.mode !== 'subscription') {
        result = {handled: false, reason: 'NOT_SUBSCRIPTION'};
        break;
      }
      if(session.livemode===true&&session.metadata?.k4k_launch_claim&&session.payment_status==='paid')await store.launchOutcome(session,'paid');
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
      const membership = membershipFromSubscription(sub,priceOptions);
      if (event.type === 'customer.subscription.deleted') membership.status = 'canceled';
      result = await store.applyMembership({userId, membership, eventCreated: event.created});
      break;
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId=invoiceSubscriptionId(invoice);
      if (!subscriptionId) {
        result = {handled: false, reason: 'NOT_SUBSCRIPTION'};
        break;
      }
      const userId = await store.userIdForCustomer(invoice.customer);
      if (!userId) throw new Error('UNKNOWN_CUSTOMER');
      // Validate the billed price before mutating membership state. An unknown
      // price must fail without marking the invoice as applied, so Stripe can retry.
      const creditPlan = event.type === 'invoice.paid' && CREDIT_GRANT_REASONS.includes(invoice.billing_reason)
        ? planForPrice(invoiceLinePriceId(invoice.lines?.data?.[0]),priceOptions).plan
        : null;
      // The database owns the entire membership/credit/event transaction.
      return store.applyInvoiceEvent({eventId:event.id,eventType:event.type,eventCreated:event.created,userId,stripeCustomerId:invoice.customer,stripeSubscriptionId:subscriptionId,invoiceId:invoice.id,status:event.type==='invoice.paid'?'active':'past_due',periodEnd:invoice.lines?.data?.[0]?.period?.end??null,credits:creditPlan?PLAN_CREDITS[creditPlan]:0});
      break;
    }
    case 'charge.refunded':
    case 'charge.dispute.created': {
      const charge=event.data.object;
      const intent=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
      if(!intent){result={handled:false,reason:'IGNORED_EVENT'};break;}
      const reversed=await store.reverseTopup({p_event:event.id,p_type:event.type,p_intent:intent,p_refunded_amount:event.type==='charge.refunded'?charge.amount_refunded:0});
      if(reversed.reason==='NOT_TOPUP'){
        if(charge.metadata?.kind==='k4k_credit_pack')throw Error('TOPUP_RECEIPT_NOT_READY');
        if(charge.customer)return store.holdBilling({p_event:event.id,p_type:event.type,p_customer:typeof charge.customer==='string'?charge.customer:charge.customer.id});
      }
      return reversed;
    }
    default:
      result = {handled: false, reason: 'IGNORED_EVENT'};
  }

  await store.markProcessed({eventId: event.id, type: event.type});
  return result;
}
