# K4K APP — EUR/USD .99 price revision for owner review (19 November 2026)

**STATUS: PROPOSAL ONLY. No new EUR/USD LIVE prices created, no approved new Stripe Price IDs, no subscriptions migrated, no customer credits touched, no public checkout.** GBP and Brazilian regular prices remain fixed.

## Commercial decision staged (not authorized to charge)

| Product | GBP fixed | EUR current LIVE | EUR .99 proposal | USD current LIVE | USD .99 proposal | BRL fixed | Credits | Billing |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Starter | £15.99 | €19.09 | **€18.99** | $20.95 | **$20.99** | R$119.90 | 420 | monthly |
| Creator | £29.99 | €35.80 | **€35.99** | $39.30 | **$39.99** | R$224.90 | 840 | monthly |
| Pro | £59.99 | €71.62 | **€71.99** | $78.61 | **$78.99** | R$449.90 | 1680 | monthly |
| Studio | £119.99 | €143.25 | **€143.99** | $157.24 | **$157.99** | R$899.90 | 3360 | monthly |
| Single video | £5.99 | €7.15 | **€6.99** | $7.85 | **$7.99** | R$44.90 | 140 | one-time |

### FX reference and conversion working

European Central Bank 19 November 2026 (information only; not an execution rate):
- **1 EUR = 0.83581 GBP**, **1 EUR = 1.0992 USD**
- Hence **1 GBP = 1/0.83581 = 1.19644417 EUR**, and **1 GBP = 1.0992/0.83581 = 1.31513143 USD**.
- GBP price × rate, rounded to 2 decimal places:
  - Starter £15.99 → €19.13 / $21.03 → proposed €18.99 / $20.99
  - Creator £29.99 → €35.88 / $39.44 → proposed €35.99 / $39.99
  - Pro £59.99 → €71.77 / $78.89 → proposed €71.99 / $78.99
  - Studio £119.99 → €143.56 / $157.80 → proposed €143.99 / $157.99
  - Single £5.99 → €7.17 / $7.88 → proposed €6.99 / $7.99
- Source: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html
- Recheck FX, tax-inclusive VAT, card fees, refunds, commissions and local customer-facing totals before authorizing new prices.

## Critical historical overlap

- **Proposed Starter EUR €18.99 matches an ORIGINAL legacy Starter price** (`price_1UbQBCL7fmdMaK0kAmHSt8oc`) that grants **80 old-version credits**. The new proposed Starter EUR must get its **own new Stripe LIVE Price ID**, even though the monetary amount is identical.
- **Proposed Starter USD $20.99 likewise matches ORIGINAL legacy** `price_1UbQBAL7fmdMaK0k2PtIGUDU`, also **80 old-version credits**. Must create a distinct new Price ID for **420 V2 credits**.
- The already-created new Starter GBP `price_1UdblmL7fmdMaK0kyknLHpoV` remains a 420-credit V2 Price ID; legacy GBP Starter `price_1UbQB0L7fmdMaK0kr3CRE9bd` remains the 80-credit contract.
- **Do not repurpose any historical Price ID, product default, legacy customer subscription or credit ledger.** Credits must be linked to verified Stripe Price IDs, payment receipts and versioned wallets—not plan names or amounts.

## Ten immutable LIVE Price IDs would need to be created AFTER explicit commercial authorization

| Product | EUR existing (preserve) | USD existing (preserve) |
|---|---|---|
| Starter | `price_1UdaMfL7fmdMaK0kqWMennAm` | `price_1UdaN2L7fmdMaK0kHJO5BRFg` |
| Creator | `price_1UdaNAL7fmdMaK0k3i1tog2r` | `price_1UdaNCL7fmdMaK0k760pW6Ru` |
| Pro | `price_1UdaNNL7fmdMaK0kYtOCZ3M3` | `price_1UdaNPL7fmdMaK0kWUbY9EMm` |
| Studio | `price_1UdaNTL7fmdMaK0kwUBoqHuY` | `price_1UdaNVL7fmdMaK0ki3bcblsG` |
| Single video | `price_1UdaOCL7fmdMaK0kfOyMORbz` | `price_1UdaOEL7fmdMaK0kxjtFqgtE` |

For a future separately approved creation:
1. On existing four K4K APP subscription products and the existing one-time product, create **ten additional** tax-inclusive LIVE Price objects (eight monthly recurring + two one-time); do not create or change products or defaults.
2. For each object verify `livemode=true`, exact product, currency, minor-unit amount, monthly interval or one-time mode, `active=true`, `tax_behavior=inclusive` and metadata `entitlement_version=v2`, `credits_per_period` or `credits`, and a unique lookup key. Read back actual Price ID; **never invent it**.
3. Keep all historical and current Price IDs recognized indefinitely for old subscriptions and successful retry/reconcile events.
4. Only after versioned V2 wallet, source-of-truth country routing, TEST invoice/refund/retry E2E and funded provider limit QA pass: update both backend and frontend Price ID maps together. Historical subscription renewals must keep their existing Price ID and credit amount. The original checkout remains **hard off** for V2 until separately approved.
5. Validate all four currencies including locked GBP and BRL, Black Friday renewal/coupon R$65 issue, and the 140-credit one-time product disclosure (30s standard Option B ≈175 credits).
6. Check existing BRL website display snapshots: some display the **older legacy amounts**, which must not be confused with approved new V2 BRL renewal prices while checkout remains disabled.

### Code and test status
- `lib/server/v2-eur-usd-99-review.mjs` is a read-only specification with **no replacement Price IDs** and `EUR_USD_99_NEW_PRICE_IDS_APPROVED_AND_VERIFIED=false`.
- `tests/v2-eur-usd-99-review.test.mjs` checks all ten .99 endings, FX rounding, GBP/BRL invariants, ordering, historical Starter collisions and fail-closed checkout.
- The existing payment/credit/reconciliation maps are **not modified** by this proposal.

**Explicit approval still needed** before creating the ten new LIVE Stripe Price IDs, even though a general next-step direction has been given. Existing customers remain on unchanged recurring prices and wallets.
