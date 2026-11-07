// Approved plan prices, per month, in minor units (cents, pence, centavos).
// Approved 7 Nov 2026. Every plan includes the K4K Academy. The standalone
// Academy price is retired. Not connected to checkout: each entry needs its Stripe
// price ID before any price is shown to customers. The "pro" display name is
// still pending.

export const PLAN_PRICES = Object.freeze({
  starter: Object.freeze({includesAcademy: true, GBP: 1599, EUR: 1899, USD: 2099, BRL: 10999, stripePriceIds: Object.freeze({})}),
  creator: Object.freeze({includesAcademy: true, GBP: 3099, EUR: 3699, USD: 4099, BRL: 20999, stripePriceIds: Object.freeze({})}),
  pro: Object.freeze({includesAcademy: true, GBP: 6599, EUR: 7799, USD: 8499, BRL: 44999, stripePriceIds: Object.freeze({})}),
  studio: Object.freeze({includesAcademy: true, GBP: 13499, EUR: 15999, USD: 17499, BRL: 89999, stripePriceIds: Object.freeze({})}),
});

export const PLAN_CURRENCIES = Object.freeze(['GBP', 'EUR', 'USD', 'BRL']);

export function getPlanPrice(plan, currency) {
  const entry = PLAN_PRICES[plan];
  if (!entry) throw new Error('Unknown plan');
  if (!PLAN_CURRENCIES.includes(currency)) throw new Error('Currency is not approved');
  return entry[currency];
}
