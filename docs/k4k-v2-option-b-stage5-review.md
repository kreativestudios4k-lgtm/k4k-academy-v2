# K4K APP V2 — Stage 5: Option B and payment integration review

**Status: REVIEW ONLY — not production-ready.** Owner approved Option B on 19 Nov 2026. Nothing in this branch authorizes a Stripe charge, public release, Vercel production change or Supabase migration.

## Approved commercial and credit contract
- New V2 denomination: **$0.012 provider-cost budget per 1 V2 credit** (12,000 USD micro-units), independent of original customer's credits and locked old wallets.
- Existing subscriptions: Starter 420, Creator 840, Pro 1,680, Studio 3,360 **V2** credits / paid month; legacy renewal 80/160/340/700 remains unchanged.
- Distinct Starter GBP LIVE £15.99 Price ID `price_1UdblmL7fmdMaK0kyknLHpoV`; old `price_1UbQB0L7fmdMaK0kr3CRE9bd` stays the original default for existing customers.
- Creator BRL regular **R$224.90** LIVE monthly. Black Friday discounts/coupons have **not** been changed or approved for activation.
- One-time **Single video**: the existing four LIVE prices and Stripe product remain unchanged. Purchase entitles **140 V2 credits**, tracked separately by `source_kind=single_video_payment`. It is **not** a guaranteed 30-second or premium generation. Do not claim that the purchase always yields precisely one finished video; the product title and copy require a truthful prelaunch disclosure and possibly a separate naming review. A 30-second Standard example requires **175**, so if the user holds just 140 credits, generation must not start and a **35-credit shortfall** must be shown.

## Model-specific, conservative illustration
Verified price snapshot for Kling 2.6 Standard Motion Control: **$0.07 / second** with video orientation up to 30 s, image orientation up to 10 s. Estimated credit charges are 10 s → 59; 15 s → 88; 24 s → 140; 30 s → 175. Other models and resolutions require separately verified rate cards. Server must retrieve current provider rate, validate upload duration/orientation, sign expiring quote bound to authenticated user, and atomically reserve credits before calling the provider.

## Prepared stage-5 code and synthetic tests
- `lib/server/v2-option-b-policy.mjs`: integer-microdollar cost conversion, strict reference model durations, one-time 140-credit disclosure and verified-quote requirement.
- `lib/server/v2-checkout-intent.mjs`: exact server-derived country → Stripe LIVE Price ID, authenticated identity check, coupon rejection, no duplicate active subscriptions, one-time `mode=payment`, and **compile-time hard disabled** real Checkout sessions.
- `lib/server/v2-stripe-paid-evidence.mjs`: validates freshly fetched paid invoice/session, Stripe price, amount, identity, currency, quantity, tax, refund/discount flags and source type. Paid evidence must come from server-side Stripe key and separately verified Supabase customer ownership.
- Draft webhook route refuses V2 subscription invoices and Single video unless **both the fetched Stripe verifier and the V2 atomic ledger adapter** exist. It never falls back to legacy credits.
- Existing proposed RLS-only V2 tables and service-role SQL atomic functions remain in `db/proposals/` and are **NOT** Supabase migrations.
- Regression tests: `tests/v2-option-b-policy.test.mjs`, `tests/v2-checkout-intent.test.mjs`, `tests/v2-stripe-paid-evidence.test.mjs`, `tests/v2-live-price-cutover.test.mjs`, `tests/v2-credit-atomic-rpcs-postgres.test.mjs`. Isolated synthetic Stripe/PGlite only, **no live purchases or webhooks triggered**.

## Do NOT remove the release gates yet
1. Implement actual versioned V2 service-role database adapter and irreversible-proof payment receipt linkage, with independent security review, isolated TEST system and rollback plan; only then propose a supervised LIVE migration.
2. Verify current provider pricing and funded USD budgets under realistic FX/tax/card/Pix/commission/retry scenarios at the agreed minimum-margin threshold. The $0.012 credit budget is not a provider purchase commitment and does not prove profitability.
3. Test full Stripe TEST purchase, return-page reconciliation, multi-country tax, Black Friday coupon (R$65 × 3 for Creator if separately approved), 4th renewal invoice, failed payment, duplicate and out-of-order events, full/partial refund, chargebacks, customer ownership and subscription cancellations.
4. Decide whether public product naming/copy for **Single video** is truthful enough before it is offered; it is one-time credit entitlement, not an output guarantee.
5. All existing live Academy, original K4K subscriptions, default prices, historic Price IDs, wallet balances and generation quotes retain prior behavior.

**Public K4K V2 checkout must stay disabled.** `V2_TRANSACTIONAL_CREDIT_LEDGER_PRESENT=false` and `V2_CHECKOUT_WIRED_AND_VERIFIED=false` are intentionally compiled into draft code; enabling environment variables must not bypass them.
