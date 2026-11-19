# K4K APP V2 — review-only LIVE pricing bridge (19 November 2026)

## Scope
This PR prepares an explicit LIVE price catalogue, preserves all pre-existing K4K subscription price IDs and selects the intended grant amount based on the actual paid invoice price. The production environment is untouched. No Stripe products, prices, subscriptions, customers, coupons, checkout sessions or Supabase balances are modified.

## No-cutover conditions
The existing `K4K_LIVE_PLAN_PRICES_JSON` remains the authoritative old backend mapping. A proposed map containing any distinct V2 IDs is rejected by `livePrices` unless **all** independent flags are true and the map matches all 16 proposed plan prices. Even with the flags set, the currently proposed mapping is rejected because the Starter GBP price is shared with a legacy 80-credit subscriber.

Four originally recurring subscription prices (each with GBP/EUR/USD/BRL) and all additional historical GBP launch prices remain recognized by the webhook. Legacy invoices retain 80/160/340/700 credits, launch GBP invoices retain 100/220/480/1000, and distinct V2 plan prices are mapped to 420/840/1680/3360. The exact same credit policy is now used by the webhook and return-page reconciler.

## Unresolved blockers: do not change production flags
1. **Starter GBP:** `price_1UbQB0L7fmdMaK0kr3CRE9bd` is used by an existing subscriber with 80 credits, and it was also reused in the V2 proposal for 420 credits. A Price ID alone cannot distinguish the two. Obtain separate approved pricing/entitlement identity (e.g. a distinct recurring LIVE Price ID, subject to owner's authorization) before enabling the new Starter GBP product. Never re-credit legacy subscribers to 420.
2. **Creator Brazil:** the newly created BRL price is R$224.90 while the Black Friday plan lists R$239.90 as the regular renewal. Do not select one implicitly.
3. **Prepayment reservation:** `public.k4k_app_launch_claim_paid` still reserves 80/160/340/700 credits. Funded limits (20 seats, 1600 credits in the inspected Vercel environment) do not cover the new 3360-credit Studio entitlement. Prepare, test and separately approve an atomic SQL migration and launch budget before setting `K4K_V2_LAUNCH_RESERVATION_QA_APPROVED`.
4. **Manual Pix:** `manualPixPlan` uses old BRL amount and credits. Design and test both Pix and card checkout to the same approved commercial contract while preserving existing Pix orders.
5. **Single video 140:** its four one-time LIVE prices are catalogued only; there is no dedicated signed, idempotent fulfillment path. Do not connect the new one-time purchase to the existing unrelated top-up pack flow.
6. **Reviews and QA:** verify exact country routing and 16 Stripe price records, invoice tax, webhook events, renewal holds, refunds, reconciliation and non-stacking coupons. Confirm legacy Academy customers and subscriptions are unaffected.

## Required QA flags (all default unset)
- `K4K_V2_PRICE_AND_CREDIT_QA_APPROVED`
- `K4K_V2_LAUNCH_RESERVATION_QA_APPROVED`
- `K4K_V2_LEGACY_RENEWAL_QA_APPROVED`
- `K4K_V2_BRL_COMMERCIAL_TERMS_QA_APPROVED`
- `K4K_V2_STARTER_GBP_ENTITLEMENT_QA_APPROVED`

## Tests
`node --test tests/v2-live-price-cutover.test.mjs`

This draft is **not** permission to enable the production checkout, amend Stripe records or apply a database migration. Production rollout requires a separate explicit owner approval and successful e2e verification.
