# K4K APP — verified EUR/USD .99 V2 price IDs in draft catalogues

**19 November 2026. Price creation was separately owner-approved and completed in Stripe LIVE.** This update is **draft-code integration only**; no Stripe write, production database change, subscriber migration, merge, production deploy or public checkout activation.

## New intended EUR/USD prices

| Plan | EUR | EUR Stripe LIVE Price ID | USD | USD Stripe LIVE Price ID | V2 credits |
|---|---:|---|---:|---|---:|
| Starter | €18.99 | `price_1UddzFL7fmdMaK0kzN2sF4mq` | $20.99 | `price_1UddzcL7fmdMaK0khce6RBqF` | 420 |
| Creator | €35.99 | `price_1UddzeL7fmdMaK0k3IQHJbl1` | $39.99 | `price_1UddzhL7fmdMaK0kiA3ZSb62` | 840 |
| Pro | €71.99 | `price_1UddzjL7fmdMaK0kCPzo3pQv` | $78.99 | `price_1Ude03L7fmdMaK0kuN8hI153` | 1680 |
| Studio | €143.99 | `price_1Ude05L7fmdMaK0kszKPnctk` | $157.99 | `price_1Ude07L7fmdMaK0kQlPm0v1c` | 3360 |
| Single video (one-time) | €6.99 | `price_1Ude0AL7fmdMaK0kTJW2vvLv` | $7.99 | `price_1Ude0CL7fmdMaK0klngx62PZ` | 140 |

GBP regulars stay £15.99/£29.99/£59.99/£119.99/£5.99. Brazil regulars remain R$119.90/R$224.90/R$449.90/R$899.90/R$44.90. Single video is **a 140 V2 credit purchase**, not a guaranteed 30s completion; 30s Standard Saver example costs 175 V2 credits (35-credit shortfall).

## Previous V2 EUR/USD prices must remain payable and verifiable forever for renewals/reconciliation

| Product | Prior V2 EUR ID, amount | Prior V2 USD ID, amount |
|---|---|---|
| Starter | `price_1UdaMfL7fmdMaK0kqWMennAm` €19.09 | `price_1UdaN2L7fmdMaK0kHJO5BRFg` $20.95 |
| Creator | `price_1UdaNAL7fmdMaK0k3i1tog2r` €35.80 | `price_1UdaNCL7fmdMaK0k760pW6Ru` $39.30 |
| Pro | `price_1UdaNNL7fmdMaK0kYtOCZ3M3` €71.62 | `price_1UdaNPL7fmdMaK0kWUbY9EMm` $78.61 |
| Studio | `price_1UdaNTL7fmdMaK0kwUBoqHuY` €143.25 | `price_1UdaNVL7fmdMaK0ki3bcblsG` $157.24 |
| Single video | `price_1UdaOCL7fmdMaK0kfOyMORbz` €7.15 | `price_1UdaOEL7fmdMaK0kxjtFqgtE` $7.85 |

Legacy **Starter** EUR `price_1UbQBCL7fmdMaK0kAmHSt8oc` and USD `price_1UbQBAL7fmdMaK0k2PtIGUDU` are **not** new 420-credit prices. They have the same amounts as the new prices but legacy credit entitlements (80 credits). Never infer entitlement from the amount, product name or currency; use exact Price ID and ledger version.

## Where integration changes live (no Checkout enabling)
- Backend `lib/server/v2-live-price-policy.mjs`: 16 current V2 plan IDs, 4 current one-time IDs, immutable historical plan and one-time maps. `v2SubscriptionPriceTerms` and `v2SingleVideoPriceTerms` return exact amount and credit version by Stripe Price ID.
- Backend `lib/server/v2-stripe-paid-evidence.mjs` and `lib/server/v2-credit-ledger-contract.mjs`: validate a re-fetched paid invoice or one-time session using **its original Price ID and original amount**. Do not reroute earlier paid EUR/USD receipts through current .99 amounts.
- Backend `db/proposals/k4k-v2-credit-atomic-rpcs-review.sql`: 20 original V2 current-price identities plus 10 new EUR/USD identities, exact amount/currency/grant kind matching. Proposal only. The production Supabase project is never migrated or modified.
- Frontend `src/billing/v2-live-price-manifest.mjs`: new current EUR/USD IDs and amounts, fixed GBP/BRL rows, and read-only old V2 mappings. Frontend pricing bridge remains shut.
- Tests: new price/amount authenticity, 80-credit legacy price collisions, current and old V2 receipt validation, synthetic paid Invoice/Single video, atomic grant and duplicate replay, rejection of cross-version or wrong amount, Option B credit shortfall, blocked checkout.

## Sandbox QA and remaining release blockers
- Isolated TEST Supabase project: `yhbhrkyihiyyfzqogyri`. Its TEST payment allowlist is deliberately **separate** from these LIVE-price records. Never grant any LIVE receipt with the TEST-only RPC.
- CI and disposable PostgreSQL exercise draft LIVE grant proposal without executing it in production. Actual Stripe TEST payments, signed test webhook, renewal and refund end-to-end, funded USD provider cap, Stripe Tax/fees/Pix/FX, Black Friday R$65 × 3 discount and security QA remain required.
- `V2_TRANSACTIONAL_CREDIT_LEDGER_PRESENT=false` and `V2_CHECKOUT_WIRED_AND_VERIFIED=false`; frontend unresolved commerce blockers remain. Do not merge or deploy. Existing subscriptions and balances are immutable.
