// Approved plan prices, per month, in minor units (cents, pence, centavos).
// Approved 7 Nov 2026. Every plan includes the K4K Academy. The standalone
// Academy price is retired.
// Stripe IDs below are TEST-mode only. Checkout is not connected yet.
// The "pro" display name is still pending.

export const PLAN_PRICES = Object.freeze({
  starter: Object.freeze({
    includesAcademy: true,
    productId: 'prod_VaK2VbZjqew9D9',
    GBP: 1599, EUR: 1899, USD: 2099, BRL: 10999,
    stripePriceIds: Object.freeze({
      GBP: 'price_1UZ9OgL7fmdMaK0kcN2JJFOa',
      EUR: 'price_1UZ9OiL7fmdMaK0krCoFAwHz',
      USD: 'price_1UZ9OkL7fmdMaK0kIClIOYD3',
      BRL: 'price_1UZ9OlL7fmdMaK0kXnGW59Ym',
    }),
  }),
  creator: Object.freeze({
    includesAcademy: true,
    productId: 'prod_VaK2Yk913XdfC8',
    GBP: 3099, EUR: 3699, USD: 4099, BRL: 20999,
    stripePriceIds: Object.freeze({
      GBP: 'price_1UZ9OnL7fmdMaK0kuWfKZXkd',
      EUR: 'price_1UZ9OpL7fmdMaK0kXuyRw6ET',
      USD: 'price_1UZ9OrL7fmdMaK0kQN5zfZ7f',
      BRL: 'price_1UZ9OtL7fmdMaK0kbFSYhe9m',
    }),
  }),
  pro: Object.freeze({
    includesAcademy: true,
    productId: 'prod_VaK2mKUuzUy0Mn',
    GBP: 6599, EUR: 7799, USD: 8499, BRL: 44999,
    stripePriceIds: Object.freeze({
      GBP: 'price_1UZ9OwL7fmdMaK0krk3F8D9e',
      EUR: 'price_1UZ9OyL7fmdMaK0kZT8h0xvk',
      USD: 'price_1UZ9OzL7fmdMaK0ksKoOP6vP',
      BRL: 'price_1UZ9P1L7fmdMaK0ksgljMaq7',
    }),
  }),
  studio: Object.freeze({
    includesAcademy: true,
    productId: 'prod_VaK2it75WTP5RD',
    GBP: 13499, EUR: 15999, USD: 17499, BRL: 89999,
    stripePriceIds: Object.freeze({
      GBP: 'price_1UZ9P3L7fmdMaK0kFeygrSYo',
      EUR: 'price_1UZ9P4L7fmdMaK0kiOD4bllc',
      USD: 'price_1UZ9P6L7fmdMaK0kbHVgOhb7',
      BRL: 'price_1UZ9P8L7fmdMaK0kSv84vxh4',
    }),
  }),
});

export const PLAN_CURRENCIES = Object.freeze(['GBP', 'EUR', 'USD', 'BRL']);

export function getPlanPrice(plan, currency) {
  const entry = PLAN_PRICES[plan];
  if (!entry) throw new Error('Unknown plan');
  if (!PLAN_CURRENCIES.includes(currency)) throw new Error('Currency is not approved');
  return entry[currency];
}
