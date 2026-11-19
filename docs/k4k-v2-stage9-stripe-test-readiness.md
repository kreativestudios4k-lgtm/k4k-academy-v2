## Post-transaction TEST installation verified

- The corrected `public.k4k_v2_finish_generation` function was installed **only** in TEST Supabase project `yhbhrkyihiyyfzqogyri`. Independent readback confirmed the debt-first statement is present, `service_role` can execute, and `anon`/`authenticated` cannot.
- Readback immediately after installation confirmed `0` test Auth users, V2 wallets and Stripe receipts. The earlier refund-during-reservation exercise was **transactional and rolled back**; installation of the reviewed function itself remains in the TEST project for later end-to-end QA.
- Production Supabase `tqlvfqjvfqfigsauqjtl` and LIVE Stripe were not changed.

# Stage 9 — Stripe TEST E2E readiness and refund/reservation safety

**Review branch only; 19 November 2026. Do not merge, deploy production, enable LIVE checkout or touch legacy credit balances.**

## Current verified infrastructure
- Dedicated Supabase `K4K APP TEST`: `yhbhrkyihiyyfzqogyri`, London, **not** production `tqlvfqjvfqfigsauqjtl`.
- Dedicated Vercel **backend-only** protected Preview project `k4k-nextjs-isolated-preview`, `prj_A9w3O0qv3vQ42cBZxjRmTdX9U1UI`. This is **NOT the K4KAPP frontend**; the actual app frontend belongs to `k4k-v2-no-customer-api-popup`.
- Existing TEST Price IDs: Starter GBP £15.99/420 `price_1UdcNHL7fmdMaK0kLEIj5I1W`, Creator BRL R$224.90/840 `price_1UdcNUL7fmdMaK0kHJd1aMUZ`, Single video GBP £5.99/140 `price_1UdcNeL7fmdMaK0kied8fy2S`. These **TEST** prices are independent from the 10 newly created EUR/USD `LIVE` prices.
- Verified on 19 November that Preview env list is missing server credentials `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_V2_TEST_SECRET_KEY`, `STRIPE_V2_TEST_WEBHOOK_SECRET` and tester allowlist `K4K_V2_SANDBOX_ALLOWED_TEST_USERS`. `K4K_V2_SANDBOX_ADAPTER_ENABLED=false` and `K4K_V2_SANDBOX_WEBHOOK_ENABLED=false`. Compile-time `V2_SANDBOX_CHECKOUT_READY=false` stays off.
- A real Stripe-hosted TEST card purchase, signed webhook delivery, test-clock subscription renewal, failure/cancel and refund E2E **have not been demonstrated**.

## Changes in this stage
1. **Refund during an in-flight generation:** the atomic `k4k_v2_finish_generation` SQL proposal and JS simulation now send released reserved credits first to `reversal_debt`, making only any remainder available. They preserve `billing_hold` for manual reconciliation even when debt becomes zero. This prevents a refunded generation later creating spendable credits.
2. Disposable PostgreSQL regression tests cover refund while 140 credits are reserved, debt repayment on failed generation, duplicate finish, blocked new spending and unchanged grandfathered credit balances.
3. A transaction-scoped **direct check in Supabase TEST** with a temporary updated function passed: grant 140 → reserve 140 → refund in full → release 140 → zero available, zero reserved, zero debt, billing hold true. Changes and user rows were **rolled back**.
4. Known Stripe TEST failure/cancellation webhook events that were not implemented (`invoice.payment_failed`, `checkout.session.expired`, `customer.subscription.deleted`) now fail closed / respond retryably, rather than returning 200 despite not updating financial state.
5. `lib/server/v2-sandbox-setup-readiness.mjs` and protected Preview `GET /api/v2/sandbox/readiness` are staged. The endpoint reveals **only booleans and missing setting names**, never key contents or tester IDs. A complete set of keys is **not** proof of any real paid test. This is draft-only until separately deployed to the isolated backend Preview.

## Secure next steps to finish true E2E

1. In Vercel project `k4k-nextjs-isolated-preview` → Settings → Environment Variables → **Preview only**, supply TEST project `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_V2_TEST_SECRET_KEY` (`sk_test_`), and `STRIPE_V2_TEST_WEBHOOK_SECRET` (`whsec_`) using the provider dashboards. Do not put keys in GitHub/chat, do not copy production keys and do not create `NEXT_PUBLIC_` secrets. Add a real TEST Supabase auth user and only their UUID to `K4K_V2_SANDBOX_ALLOWED_TEST_USERS`.
2. For Stripe TEST webhook delivery to Vercel Authentication-protected Preview, Vercel documents **Protection Bypass for Automation**: `x-vercel-protection-bypass` header or query parameter. Stripe webhooks generally require the query variant. This token grants access to the protected deployment, so secure it, keep the URL private, and review the risk before generating a token. Do **not** turn off Preview Authentication broadly.
3. Configure the TEST-only Stripe webhook subscribed to `checkout.session.completed`, `invoice.paid` and `charge.refunded`. Confirm wrong signatures and LIVE-mode payloads reject. The known failure/cancellation events require explicit ledger/account lifecycle handling before accepting them as reconciled.
4. After the readiness and delivery prerequisites are verified, separately review a **TEST-only code switch** permitting one allowlisted authenticated TEST user to create card Checkout sessions. Checkout is currently still hard-off; environment variables alone cannot enable it.
5. Complete card success, failed card, replay, webhook-first/return-page-first, subscription renewal via TEST Clock, cancel, whole/partial refund and chargeback cases. Verify Supabase TEST wallet receipts idempotently and compare to Stripe TEST evidence.
6. Verify pricing/local taxes/funding, Black Friday coupon and actual Option B provider cost before any separate LIVE release authorization. A 140-credit one-time purchase does not guarantee the 175-credit 30-second Standard Motion example.

**No source of TEST readiness can authorize changing LIVE Price IDs, existing subscriptions or production wallets.**
