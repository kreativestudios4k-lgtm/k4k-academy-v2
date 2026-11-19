# Update: isolated TEST project activated and SQL verified — 19 Nov 2026

- Owner approved Supabase quoted **$10/month** on existing organisation `tremgwsgohsfhjccwwke`.
- Created **K4K APP TEST** in London `eu-west-2`, project ref `yhbhrkyihiyyfzqogyri`, independent from production `tqlvfqjvfqfigsauqjtl`.
- Installed **five** isolated sandbox tables with RLS on, the TEST-only `k4k_v2_grant_paid_test` function, and TEST reserve/finish/full-refund functions. **Did NOT install the LIVE-price grant function.**
- Verified the four financial functions have **service_role-only EXECUTE**, none for `anon` or `authenticated`. Supabase Security Advisor shows five informational `rls_enabled_no_policy` notices; this is **intentional deny-by-default** for tables with no client access.
- Executed transaction-scoped SQL checks on TEST: unique 420-credit grant/duplicate prevention, 175-credit generation reserve/settle, full-refund debt/hold, and denial of a 175-credit generation to a 140-credit buyer. All passed. Rolled back tests and verified zero persisted Auth users, wallets, receipts, ledger events and checkout bindings.
- Pinned `createV2SandboxSupabaseGateway` in draft code to the **exact TEST project ref**, still rejects production. No Vercel env secrets/deployments, Stripe paid session, real hosted Checkout, webhook or TEST payment was executed yet.
- **Still pending:** safe TEST-only Supabase service credentials in protected Vercel Preview, true authenticated Checkout writer and protected Stripe TEST webhook, real test-card purchase and renewal/refund lifecycle, separate provider-cost funding verification. No public checkout activation is authorized.

---

# K4K APP V2 — Stage 6 Stripe TEST + database adapter

**Review branch only, 19 November 2026. No production rollout.**

## Sandbox resources created in Stripe TEST
- Starter **£15.99/month**, 420 V2 credits: `price_1UdcNHL7fmdMaK0kLEIj5I1W` on existing TEST Starter product.
- Creator Brazil **R$224.90/month**, 840 V2 credits: `price_1UdcNUL7fmdMaK0kHJd1aMUZ` on existing TEST Creator product.
- One-time **140 V2 credits for video creation**, **£5.99**: `price_1UdcNeL7fmdMaK0kied8fy2S` on the new, unambiguous TEST-only product `prod_VewGOPGFDFUj9t`.
- All **livemode=false**, no changes to LIVE catalogue, no change to test product defaults or to old subscriptions.
- Other plan/market price mappings are covered by synthetic validation from Stage 5, **not** real TEST prices in this stage.

## Code ready for integration testing
- `lib/server/v2-stripe-test-reader.mjs`: authenticated GET-only Stripe TEST invoice, session and charge retrieval. It rejects live secret keys or a LIVE response. Never trust webhook JSON as proof of payment; signature checking remains a separate required boundary.
- `lib/server/v2-sandbox-catalog.mjs`: whitelist of three exact TEST Price IDs/amounts/credits, and mandatory environment guard.
- `lib/server/v2-sandbox-payment-adapter.mjs`: test-only adapter checks a server-persisted checkout binding for the authenticated buyer, customer, subscription and price; validates paid invoice or succeeded unrefunded one-time PaymentIntent; calls a dedicated TEST-only grant RPC. Full refunds require a newly retrieved Stripe TEST charge with matching original receipt, 100% refunded amount, and correct ownership. Partial refunds are rejected for review.
- `db/proposals/k4k-v2-sandbox-checkout-bindings.sql`: separate, RLS-protected binding between customer, Checkout Session, subscription, owner UUID and exact price, populated only by an authenticated server after creating a TEST Checkout Session.
- `db/proposals/k4k-v2-sandbox-paid-grant-rpc.sql`: TEST Price ID whitelist only; no LIVE prices permitted. Calls the same transactional V2 account/receipt/event machinery in disposable PostgreSQL.
- `tests/v2-sandbox-payment-adapter-postgres.test.mjs`: database-backed paid receipt, duplicate delivery, correct BRL amount, 140-vs-175 credit limit, cross-owner, unpaid/discounted/wrong-price refusals, whole/partial refund and isolation/role tests.
- Draft LIVE webhook scope now treats an unexpected Single video checkout as a **retryable fail-closed payment event** instead of an unhandled non-subscription success. Real LIVE adapter remains absent, so no customer payment is enabled.

## Hard safety boundaries
1. The only currently connected Supabase project is **`tqlvfqjvfqfigsauqjtl` (production)**. The sandbox gateway explicitly rejects that project reference. NO `apply_migration`, DDL, DML, new table, or secret write was executed on it.
2. TEST adapter requires all three: non-production Vercel environment, `K4K_V2_SANDBOX_ADAPTER_ENABLED=true`, `K4K_V2_SANDBOX_PROJECT_ISOLATED=true`. It also requires separate **non-production** Supabase project ref verification. None of these were enabled on production.
3. `V2_TRANSACTIONAL_CREDIT_LEDGER_PRESENT=false` and `V2_CHECKOUT_WIRED_AND_VERIFIED=false` remain hard-coded release gates. The website stays closed to paid checkout.
4. Real Stripe TEST Checkout **was not completed**: no separate connected test database, authenticated Checkout binding writer, TEST webhook secret/endpoint setup or end-to-end test deployment currently exists. The new Stripe TEST products/prices are setup, not proof of successful paid invoices.
5. Existing K4K/Academy subscriptions, credits and all LIVE Stripe Price IDs stay unchanged. New V2 credits remain $0.012 provider-cost equivalents; old credits remain their original denomination. A 30-second Standard example costs **175 credits**, and the one-time 140-credit purchase must never claim to cover it.
6. Live renewal/refund/chargeback processing, Stripe Tax, Pix, FX, funded provider budget, Black Friday Creator R$65 ×3 months and actual price-per-model quotes still need independent QA.

## Next safe execution gate
Provision or connect a **separate Supabase TEST project** (requires owner authorization if a paid project is involved), apply the reviewed sandbox DDL and RPCs there only, write a server-verified Checkout binding on session creation, deploy a protected Preview test endpoint, configure **Stripe TEST-only** webhook, complete a hosted test-card payment for each test offer, replay webhook, renew subscription using Stripe test clocks, simulate failed invoice and full/partial refund, and inspect TEST balances. Until real tests and security/release review pass, keep all LIVE checkout switches OFF.
