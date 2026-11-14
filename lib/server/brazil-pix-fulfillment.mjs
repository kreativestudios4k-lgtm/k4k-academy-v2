import {PLAN_PRICES} from '../k4k-plan-prices.mjs';
import {PLAN_CREDITS} from './stripe-membership.mjs';

// Only call after verifying Stripe's signature and matching the environment.
// Store must atomically claim the payment intent, extend access and grant credits.
export async function fulfillBrazilPix(event, store) {
  if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event?.type)) return {handled:false,reason:'IGNORED'};
  const s=event.data?.object;
  if (s?.metadata?.payment_flow !== 'brazil_pix_30d') return {handled:false,reason:'OTHER_FLOW'};
  if (s.mode !== 'payment' || s.currency !== 'brl' || s.metadata.currency !== 'BRL' ||
      !Array.isArray(s.payment_method_types) || s.payment_method_types.length !== 1 || s.payment_method_types[0] !== 'pix') throw new Error('INVALID_PIX_SESSION');
  if (s.payment_status !== 'paid') return {handled:false,reason:'PENDING'};
  const plan=s.metadata.plan_key;
  if (!Object.hasOwn(PLAN_PRICES,plan) || s.amount_total !== PLAN_PRICES[plan].BRL ||
      typeof s.client_reference_id !== 'string' || !s.client_reference_id ||
      typeof s.payment_intent !== 'string' || !s.payment_intent.startsWith('pi_') ||
      !Number.isSafeInteger(event.created) || event.created <= 0) throw new Error('INVALID_PIX_PAYMENT');
  return store.applyPaidPixAtomically({paymentId:s.payment_intent,sessionId:s.id,userId:s.client_reference_id,plan,credits:PLAN_CREDITS[plan],paidAt:new Date(event.created*1000).toISOString()});
}
