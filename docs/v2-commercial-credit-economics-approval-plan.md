# K4K V2 pricing and credit-economics implementation plan — REVIEW ONLY
Approved commercial decision: **Creator Brazil regular R$224.90/month**, 19 November 2026.
Status: draft PRs only. No production changes, new Stripe Price, coupon, payment, subscription, wallet write, SQL migration, env flag or deployment.

## A. Final commercial map and the one missing Stripe Price

- Creator BRL regular: **R$224.90/month**, current LIVE Price ID `price_1UdaNDL7fmdMaK0kGnfYnT0n`, product `k4k_app_creator_2026`. Reuse it; do not create another Creator BRL LIVE price.
- Creator BF intro: **R$159.90/month** for first **three** paid months, only if the earlier campaign is subsequently approved, with **R$65.00/month** discount and regular renewal at R$224.90 thereafter. Existing TEST coupon `K4KBF26CREATOR3M_TEST` discounts **R$80** and must not be used. Any new test/live coupon and promotion code requires separate authorization and QA. Do not stack an affiliate coupon.
- Starter GBP V2: create **one separate LIVE recurring monthly, tax-inclusive £15.99 GBP price** on EXISTING `k4k_app_starter_2026` only AFTER specific authorization. Proposed unique lookup key `k4k_app_starter_gbp_monthly_v2_2026`, metadata `plan_key=starter`, `product_line=k4k_app`, `entitlement_version=v2`, `monthly_credits=420`, `market=GB`. Exact new ID must be read back from Stripe. Do not change product default, old prices, existing subscription prices, customer balances or credit fulfilment by creating this price.
- Existing Starter GBP Price ID `price_1UbQB0L7fmdMaK0kr3CRE9bd` is in use by an active **80-credit** subscriber. This ID must NEVER become a 420-credit entitlement merely because the new price has the same amount. Leave historical renewals and the old price intact.
- Continue using the other new LIVE price IDs already created on the four existing products. No replacements, no archiving, and do not attach new checkout paths until automated end-to-end QA passes.

## B. Provider cost and credit calibration — proposals, not approvals

Current production: `K4K_PROVIDER_USD_PER_CREDIT=0.10` and `generationCredits(usd)=ceil(usd/rate)`. Under this policy, full usage of proposed new Starter/Creator/Pro/Studio allowances (420/840/1680/3360) could cost **$42/$84/$168/$336** in provider charges, more than proposed USD prices of **$20.95/$39.30/$78.61/$157.24**. The 140-credit Single video at $0.10/credit represents a maximum $14 provider-budget equivalent against its **$7.85** price.

Verified public fal price **Kling 2.6 Standard Motion Control $0.07/sec**, Pro **$0.112/sec**; 30-second standard cost ≈**$2.10**, Pro ≈**$3.36** for video-orientation reference, before failed requests, retries, media storage and payment costs. The provider API permits up to 30s only with `character_orientation=video` (image orientation max 10s). Do not promise all K4K models support 30 seconds.

Candidate **A — 140 credits for 30s Standard**: one new V2 credit finances **$0.015** verified provider cost; 30s Standard costs `ceil(2.10/.015)=140`; 30s Pro ≈224. Full plan-allowance provider costs: $6.30/$12.60/$25.20/$50.40. This may still fail Brazilian Black Friday downside margins.

Candidate **B — more conservative**: one V2 credit finances **$0.012**; 30s Standard costs **175** credits and 30s Pro **280**; full-plan provider costs $5.04/$10.08/$20.16/$40.32. This lowers promised video quantities, so all UI examples and consent disclosures must be revised.

**Illustrative stress test only**: use 6.0 BRL/USD, 20% embedded tax, payment fee 3.5% of gross + $0.30 fixed, 10% of gross partner commission and 10% extra provider usage for retries. This is not a quote, actual exchange rate or tax determination. Under this test, Candidate A BF net-of-tax contribution margins fall to roughly **18.6/20.0/16.5/16.9%** across Starter/Creator/Pro/Studio; Candidate B yields roughly **31.1/32.5/29.8/30.2%**. Actual country-specific VAT, Pix/card fees, settlement FX, Brazil affiliate arrangements and provider invoices must replace these assumptions in the final validation. **No option is approved for release yet.**

## C. Critical architecture requirement: versioned credit units

Do NOT change the existing global USD-per-credit conversion in production. Legacy accounts already have 80/160/340/700-credit entitlements and balances. Redenominating the global unit from $0.10 to $0.012 or $0.015 would reduce existing customers' purchasing power without changing their balances.

Before new grants:
1. Introduce a versioned entitlement mapping keyed by immutable Stripe LIVE Price ID, credit version and verified currency/price. Keep all pre-existing legacy IDs and historical GBP launch prices recognized. New Starter GBP uses its NEW Price ID. Do not rely on plan name alone.
2. Ensure old balance and V2 balance have explicit, independently accounted credit unit versions (e.g. separate subledgers or a rigorously audited conversion process requiring separate owner and customer approval). Never silently convert, merge or overwrite old balances. Track free-generation entitlements separately.
3. Generation quotes must bind the wallet version, provider/model/quality/duration, verified provider USD cost, billable credits, expiry, job and owner; use atomic reservation and exactly-once settlement/refund. Hard fail if the wrong denomination is supplied or quoted provider cost exceeds risk limits.
4. Version the SQL admission logic in `k4k_app_launch_claim_paid` and the Pix reservation RPCs. Preserve existing invoices/orders and their original reserved amount; never recalculate historical claims on replay. The new version must safely include both subscription/Pix commitments under the shared transaction lock.
5. Current cap is 1600 credits; **240 subscription + 80 Pix = 320 committed**, leaving 1280 current-version credits. Separate new V2 budget capacity in USD from historical credits rather than comparing different units as if fungible. A new V2 Studio grant is 3360, so the current legacy limit cannot authorize it; an increase without provider funding is unsafe.
6. Treat Single video (140 V2 credits) as a separate ONE-TIME payment: ownership-verified Checkout, signed Stripe paid-event, unique payment-intent/invoice ledger, exact-once grant and refund/reversal safeguards. Do not reuse unrelated historical top-up pack prices.

## D. Acceptance gates before any public checkout activation

- Existing users' old Stripe Price IDs, renewal amounts, credit entitlements and current balances are unchanged.
- All planned new Price IDs exist, are active, monthly or one-time as intended, tax inclusive and belong to the correct existing product; verify new Starter GBP after separately approved creation.
- Pricing shown in GBP/EUR/USD/BRL exactly matches checkout totals; Creator BRL regular R$224.90. Any BF-specific display shows R$159.90 then R$224.90, only after validating three discounted renewals and fourth regular invoice.
- Automatic country selection cannot be spoofed by browser request; independent server checks, RLS and customer ownership work; Stripe Tax and payment fees are tested per jurisdiction/payment method.
- Exactly one confirmed paid invoice grants exactly one **correctly versioned** credit entitlement; failures, cancellations, out-of-order webhook events, retries, refunds and disputes are idempotent and safe.
- One-time 140-credit checkout is independently tested with the new product, without subscription or Academy grant contamination.
- All available models have verified provider price/duration/rate-card constraints; enforce minimum approved net contribution margin (proposed initial safety gate >=25%) using **actual** transaction/tax/FX/cost assumptions with conservative stress bounds.
- No automatic launch on 27 November; all six K4K V2 release gates and original billing bridge gates remain OFF. Require final written owner approval after TEST/sandbox or supervised isolated QA.

## E. Implementation sequence (requires later approvals)

1. **Now:** price confirmation, draft code/docs and pure financial/reservation tests in existing draft PRs. Current BF Creator display-only regular amount updated to R$224.90 *in draft*, no checkout changes.
2. **Approval A:** create the single new Starter GBP LIVE Price on existing product (separate owner authorization), check its ID and preserve default and legacy subscriptions.
3. **Approval B:** choose credit policy A/B or a revised rate using real fal/provider costs and minimum-margin acceptance; decide how to handle legacy wallets and every advertised duration/video estimate.
4. **Approval C:** prepare and execute reviewed, reversible Supabase migration for versioned credit subledgers, atomic reservation and Single video exactly-once grants in a nonproduction environment first. No LIVE SQL writes before explicit approval.
5. **QA:** test UK/US/eurozone/Brazil, renewal/coupon/invoice/refunds, source video seconds, motion mode, provider price ledger, Pix and affiliate rules. Confirm no double charges and no customer balance changes.
6. **Separate release approval:** publish changes and activate country-specific checkout only after all gates and monitoring/funded budgets are satisfied.

## Reference sources
- fal pricing: https://fal.ai/models/fal-ai/kling-video/v2.6/standard/motion-control
- fal API input duration: https://fal.ai/models/fal-ai/kling-video/v2.6/standard/motion-control/api
- UK Stripe fees (actual account/region may differ): https://stripe.com/gb/pricing
- Stripe recurring discounts: https://docs.stripe.com/api/discounts

**Immutable boundary:** these draft PRs are for review and CI only; no LIVE payments, Stripe object changes, Supabase DML/DDL, customer balance updates, Vercel environment changes, checkout activation or production deployments are authorized.
