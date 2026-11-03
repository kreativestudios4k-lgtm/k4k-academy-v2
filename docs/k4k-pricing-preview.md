# K4K APP balanced pricing — preview proposal

This branch contains a public **preview page**, not an offer or live checkout. The legacy Academy £7.99 payment link and existing subscriber records are not modified. The site-wide pricing display utility for the existing Academy is deliberately untouched.

| New plan | Proposed monthly GBP | Credits/month |
|---|---:|---:|
| Starter | £7.99 | 100 |
| Creator | £14.99 | 250 |
| Pro | £29.99 | 600 |
| Studio | £59.99 | 1,400 |

Optional packs: 100 / £6.99, 300 / £17.99, 750 / £39.99. Packs are shown but have NO checkout endpoint yet.

## Unit economics / model costs

Assumptions pending confirmation: payment fee 3% + £0.20 per monthly charge; allow a maximum **35% of post-fee receipts** for provider generation expense. This reserves at least 65% of post-fee receipts for storage, refunds, support, infrastructure, taxes and profit (not a guaranteed net profit).

| Tier | Max provider budget/month | Max provider cost per credit |
|---|---:|---:|
| Starter | £2.64 | 2.64p |
| Creator | £5.01 | 2.004p |
| Pro | £10.11 | 1.685p |
| Studio | £20.29 | 1.449p |

Use a conservative **1.4p provider-cost ceiling per K4K credit** across all tiers while this pricing proposal is evaluated. A verified provider request costing £0.50 in GBP requires at least ceil(50/1.4)=36 K4K credits. This is an illustrative cost, **not** a verified Genjutsu quote. Get contract/API charges per model, length, resolution, fees, FX, output storage and retry loss. Never derive credits from client-supplied model cost, and never permit a model with unknown cost into paid generation. Establish per-user and global spending caps and update this math after real invoices.

## Stripe integration staging

`POST /api/pricing/preview-checkout` is OFF by default and refuses to run unless ALL are satisfied:
- Vercel `VERCEL_ENV=preview` and `K4K_STRIPE_PREVIEW_ENABLED=true`.
- Dedicated `K4K_STRIPE_TEST_SECRET_KEY` starts with `sk_test_` (never a live secret).
- `K4K_PRICING_PREVIEW_URL` is the HTTPS preview origin; request Origin must match exactly.
- Supabase `auth.getUser()` resolves an authenticated user whose **app_metadata** includes `k4k_pricing_tester: true`; normal students cannot use the test route.
- An allowlisted `K4K_STRIPE_TEST_PRICE_STARTER|CREATOR|PRO|STUDIO` references a Stripe **test-mode** recurring price. Before creating any session, the server retrieves the actual Stripe Price and checks `livemode=false`, active status, GBP amount matching the selected plan, monthly licensed/per-unit recurring billing, and no quantity transformation or trial period. Any mismatch fails closed.

All plan IDs and Stripe Price IDs are resolved server-side. No billing-related frontend button is enabled. No live Stripe products, prices, subscriptions, webhooks, payment links, checkout sessions or Supabase balances were created/changed by this PR.

**Not yet ready for live commerce**: Validate true fee schedules, VAT/taxes, API unit costs, account-based plan migration/duplicate subscription policy, cancellation/refunds, verified Stripe webhook signature and idempotent credit fulfilment, credit expiry/rollover, purchased-credit liability and fraud controls. Add owner-approved live Stripe price IDs and a separate production-safe checkout endpoint only after those checks and explicit approval.

## Verification

`node --test tests/k4k-app-pricing.test.mjs tests/stripe-preview-guard.test.mjs`

The two guard tests were run locally with Node 22 using synthetic Stripe responses. No Stripe API request or checkout session was made. Run `npm run build` in CI or an isolated writable worktree. Test both the disabled endpoint and test-mode authenticated cohort on a protected preview URL. Do not use a real card or billable provider calls.
