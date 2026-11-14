import {PLAN_PRICES} from '../k4k-plan-prices.mjs';
import {assertTestModeKey, previewDeploymentOrigin} from './stripe-billing.mjs';

// Preview-only building block; do not expose until paid-event fulfillment is atomic.
export function buildBrazilPixForm({country, plan, userId, secret, vercelEnv, vercelUrl}) {
  assertTestModeKey(secret);
  const origin = previewDeploymentOrigin({vercelEnv, vercelUrl});
  if (country !== 'BR' || !Object.hasOwn(PLAN_PRICES, plan) || !userId) throw new Error('Invalid Brazil Pix checkout');
  const form = new URLSearchParams({
    mode: 'payment', 'payment_method_types[0]': 'pix', locale: 'pt-BR',
    'line_items[0][price_data][currency]': 'brl',
    'line_items[0][price_data][unit_amount]': String(PLAN_PRICES[plan].BRL),
    'line_items[0][price_data][product_data][name]': 'K4K APP ' + plan + ' - 30 dias',
    'line_items[0][quantity]': '1',
    client_reference_id: userId,
    success_url: origin + '/k4k-app/credits?checkout=success',
    cancel_url: origin + '/k4k-app/credits?checkout=cancelled',
    'metadata[plan_key]': plan, 'metadata[currency]': 'BRL',
    'metadata[payment_flow]': 'brazil_pix_30d',
    billing_address_collection: 'auto',
  });
  return form;
}
export function nextBrazilPixExpiry({paidAt, currentExpiry}) {
  const paid = Date.parse(paidAt);
  const expiry = currentExpiry == null ? paid : Date.parse(currentExpiry);
  if (!Number.isFinite(paid) || !Number.isFinite(expiry)) throw new Error('Invalid expiry');
  return new Date(Math.max(paid, expiry) + 30 * 86400000).toISOString();
}
