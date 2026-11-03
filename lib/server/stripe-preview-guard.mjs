// Test-mode-only Stripe price/session validation. Never trust a Price ID alone:
// a misconfigured test Price can have the wrong amount or billing cadence.
export function isExpectedStripeTestPrice(price, plan, configuredPriceId) {
  return Boolean(
    price && plan &&
    typeof configuredPriceId === 'string' && configuredPriceId.startsWith('price_') &&
    price.id === configuredPriceId &&
    price.livemode === false &&
    price.active === true &&
    price.currency === 'gbp' &&
    price.type === 'recurring' &&
    price.billing_scheme === 'per_unit' &&
    price.unit_amount === plan.gbpPence &&
    price.recurring?.interval === 'month' &&
    price.recurring?.interval_count === 1 &&
    price.recurring?.usage_type === 'licensed' &&
    (price.transform_quantity == null) &&
    (price.recurring?.trial_period_days == null)
  );
}

export function isSafeStripeTestCheckoutSession(session) {
  if (!session || session.livemode !== false || session.mode !== 'subscription' ||
      session.status !== 'open' || typeof session.url !== 'string') return false;
  try {
    const url = new URL(session.url);
    return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' &&
      url.username === '' && url.password === '';
  } catch { return false; }
}
