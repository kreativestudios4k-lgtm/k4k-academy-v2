// Maps Stripe subscription data onto K4K memberships. Pure functions only.
import {livePrices} from './live-price-config.mjs';
import {PLAN_PRICES} from '../k4k-plan-prices.mjs';

const PRICE_LOOKUP = new Map();
for (const [plan, entry] of Object.entries(PLAN_PRICES)) {
  for (const [currency, priceId] of Object.entries(entry.stripePriceIds)) {
    PRICE_LOOKUP.set(priceId, Object.freeze({plan, currency}));
  }
}

export const ACCESS_STATUSES = Object.freeze(['active', 'trialing']);

// Monthly credit allowance per plan. Confirmed by the owner on 7 Nov 2026.
export const PLAN_CREDITS = Object.freeze({starter: 80, creator: 160, pro: 340, studio: 700});

// Only renewals and the first payment grant credits. Plan changes are handled separately.
export const CREDIT_GRANT_REASONS = Object.freeze(['subscription_create', 'subscription_cycle']);

export function planForPrice(priceId) {
  let hit = PRICE_LOOKUP.get(priceId);
  const live=livePrices('plans');if(live){hit=null;for(const [plan,prices] of Object.entries(live))for(const [currency,id] of Object.entries(prices))if(id===priceId)hit={plan,currency};}
  if (!hit) throw new Error('UNKNOWN_PRICE');
  return hit;
}

// Stripe moved current_period_end between API versions, so read it from either place.
function periodEndSeconds(sub, item) {
  const value = sub.current_period_end ?? item?.current_period_end;
  if (!Number.isFinite(value)) throw new Error('MISSING_PERIOD_END');
  return value;
}

export function membershipFromSubscription(sub) {
  const item = sub?.items?.data?.[0];
  const priceId = item?.price?.id;
  const {plan, currency} = planForPrice(priceId);
  return {
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    plan,
    currency,
    status: ['active','trialing','past_due','canceled'].includes(sub.status) ? sub.status : 'inactive',
    current_period_end: new Date(periodEndSeconds(sub, item) * 1000).toISOString(),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  };
}

// Stripe retries and can deliver out of order, so an event only applies if it is
// at least as new as the last one applied to the same membership.
export function isStale(lastEventCreated, eventCreated) {
  return Number.isFinite(lastEventCreated) && eventCreated < lastEventCreated;
}
