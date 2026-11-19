> **Status update — 19 November 2026, Stage 4:** The distinct Starter GBP £15.99 monthly Stripe LIVE Price ID is NOW CREATED and verified: `price_1UdblmL7fmdMaK0kyknLHpoV` (420-credit V2 entitlement metadata). The old `price_1UbQB0L7fmdMaK0kr3CRE9bd` remains the original Starter product default and is still used by an existing 80-credit subscriber. Any older statements below saying the new Starter price has not been created are superseded. Checkout stays disabled: atomic V2 SQL proposals and credit ledger are only in draft CI; provider unit economics, funded budget, Single video redemption semantics, Black Friday coupon and real payment E2E QA remain unapproved.

# K4K APP Stage 3: Versioned Credits — draft engineering review
**19 November 2026. Not deployed. Do not execute SQL against LIVE.**

## Why we need this
The live K4K APP ledger uses `public.k4k_live_credit_accounts.balance` without credit-version identity. The live `k4k_launch_paid_claims_credits_check` constraint accepts **only 80, 160, 340 and 700**. New V2 plans propose **420, 840, 1680, 3360**. Editing the old SQL check or global generation credit cost would cause migrations and legacy customer wallet dilution.

We will retain legacy accounts and grants exactly as-is, with their current $0.10/provider-cost-per-credit pricing, Stripe price mappings, renewals, refunds and signing. New V2 purchases require a completely new denomination, wallet and quote pipeline.

## Draft files (not connected to checkout)
- `db/proposals/k4k-v2-credit-wallet-schema-review.sql`: Four segregated, RLS-on, service-role-only tables. Not in `supabase/migrations`.
- `lib/server/v2-credit-ledger-contract.mjs`: Pure simulation of new V2 credit grants, reserves, settles, releases, refunds and full-reversal debt. Existing wallets are immutable snapshots. Does not connect to Stripe or Supabase.
- `tests/v2-credit-ledger-contract.test.mjs`: duplicate events, repeated payment intents, job ownership, overdraw, failed jobs, chargeback hold, reversal debt and four-currency one-time purchase validation.
- `tests/v2-credit-wallet-schema-postgres.test.mjs`: Runs SQL only in disposable local PGlite, confirms RLS, constraints and no shared balances.
- `src/billing/v2-wallet-display-contract.mjs` in companion website PR #19: pure view model, never combines V2 and legacy credit balances.

## Draft database entities (no DB writes performed)
1. `k4k_v2_credit_accounts`: user ID + V2 available, reserved, reversal debt, billing hold. Never backfill legacy balances by conversion.
2. `k4k_v2_credit_receipts`: immutable source ID (invoice or payment intent) keyed to owner, exact Stripe price, amount in currency minor units, paid status and credits. Prevent duplicate credit grant on Stripe webhook + return reconciliation.
3. `k4k_v2_generation_reservations`: unique generation job, owner, signed quote digest, verified provider estimate, reserved credits, settled/released status. No double job reservations.
4. `k4k_v2_credit_events`: immutable append-only double-entry-style delta audit (available/reserved/debt) keyed by stable event and payload hash; no direct browser SQL writes.

## Required atomic production implementation — next reviewed work only
Future service-role-only RPCs MUST run payment receipt insertion, wallet update and credit event insertion in the **same database transaction**. They must lock account rows with `FOR UPDATE`, handle unique conflict replays with exact payload comparison, reject cross-account Stripe receipts, and reject reused job IDs or mismatched amount. A return-page reconciliation must reuse the same underlying receipt ID, never invent a second grant identity.

For generation:
- Quote is computed from a versioned provider/model/resolution/duration rate card.
- Source video and content permission are validated server-side; quote includes expiration and HMAC signature.
- Server reserves V2 credits atomically before provider submission, without touching legacy wallets.
- Only a verified provider outcome settles or releases a reservation exactly once.
- A paid generation's output path must be verified private storage belonging to that user.
- Refund/dispute first reduces available V2 credits; if already spent, create reversal debt and billing hold, without making a balance negative or touching legacy credits.

## One-time Single video
Stripe LIVE product `prod_VeuCjnhyUlZL59` has four prices but NO public checkout/fulfillment. New 140-credit purchase must use a separate signed `kind=k4k_v2_single_video` paid-session verification: auth user matches client_reference_id and metadata owner, product and exact Price ID, currency, quantity=1, tax complete, and succeeded nonrefunded payment intent.

**Offer conflict:** Candidate A ($0.015 per V2 credit) can produce the 30s Standard Saver estimated quote of **140** credits. Candidate B ($0.012) produces **175**, which exceeds the purchased 140 credits. Until the model/rate decision is approved, do not advertise the 140-credit purchase as one complete 30-second video or enable it for purchase.

## Release blockers (still unresolved)
- New Starter GBP £15.99 Price ID has not been created: legacy subscriber on old £15.99 receives 80, V2 Starter proposes 420.
- Creator BRL R$224.90 regular approved, but BF three-month TEST coupon remains R$80 instead of the intended R$65; no LIVE promotional coupon active.
- V2 exchange rate, provider costs, margin (minimum proposal 25% net-of-tax), 10% affiliate partner commissions, Stripe Tax and Pix costs require actual QA.
- Current live launch cap 1,600 has 320 old-version committed; never compare old and V2 credit quantities directly as funding units. Reserve V2 capacity in provider USD under separate funded cap.
- SQL transactional RPCs, app API routes, webhook and reconciliation wiring, partial refund proration, escrow/chargeback disputes, pending payments and end-to-end processing remain **not implemented**.
- Maintain all existing legacy Stripe prices, subscriptions, wallet balances and old Academy webhook.

## Verification and approvals
This stage is pure code and disposable PGlite tests. No Stripe API write, no Supabase SQL DDL/DML, no production env change, no Vercel deployment, no merge.

**Next development stage**: design and test versioned, service-role-only transactional functions in disposable Postgres with synthetic payments before proposing any LIVE schema migration. Only after independent owner approval may a new Starter GBP price be created, financial denomination chosen and V2 checkout/credits activated.
