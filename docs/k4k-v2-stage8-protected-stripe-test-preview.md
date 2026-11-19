# K4K V2 — Stage 8: protected Vercel Preview, Stripe TEST-only HTTP routes

**Review only. Public/LIVE checkout is disabled.**

## Isolated Preview infrastructure (19 Nov 2026)
- Vercel team `KreativeStudios4k`, project `k4k-nextjs-isolated-preview` (`prj_A9w3O0qv3vQ42cBZxjRmTdX9U1UI`).
- Vercel Authentication enabled for Preview, git fork protection enabled.
- Preview-only environment variables point to TEST Supabase `yhbhrkyihiyyfzqogyri`:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `K4K_V2_SANDBOX_PROJECT_REF`, `K4K_V2_SANDBOX_PROJECT_ISOLATED=true`.
- `K4K_V2_SANDBOX_ADAPTER_ENABLED=false`, `K4K_V2_SANDBOX_WEBHOOK_ENABLED=false`,
  `K4K_LIVE_PAYMENTS_ENABLED=false`, `K4K_ENABLE_PRODUCTION_GENERATION=false`.
- All settings are for Preview only. Original Academy Vercel project is untouched because some of its shared Preview keys refer to live services.
- **No service_role secret, Stripe secret or webhook signing secret has been copied or inserted by this operation.**

## Draft routes and tests
- `app/api/v2/sandbox/checkout/route.js`: strict TEST JWT authentication, exact TEST product offer selection and test-user allowlist. Correct TEST Stripe key required; private database key required; no client-supplied Price ID, redirect origin or currency accepted.
- `lib/server/v2-sandbox-checkout-create.mjs`: server creates a TEST customer, TEST Checkout Session, then persists a pending server-owned authenticated checkout binding. On database failure, attempts to expire the unbound session. The dedicated **compile-time** switch `V2_SANDBOX_CHECKOUT_READY=false` cannot be enabled by environment alone.
- `app/api/v2/sandbox/webhook/route.js`: separately signed TEST-only webhook with dedicated `STRIPE_V2_TEST_WEBHOOK_SECRET`, strict no-LIVE checks, 1 MiB request limit, and a separate Preview-only switch. Never falls back to the original Academy billing handler.
- `lib/server/v2-sandbox-webhook-dispatch.mjs`: paid Checkout activation, verified TEST invoice grant, one-time 140-credit grant, verified full refunds, with idempotent TEST account ledger. Unknown disputes explicitly block instead of crediting customers.
- `lib/server/v2-sandbox-payment-adapter.mjs`: now supports server-only `insertPendingBinding`, `findSessionBinding`, `activatePendingBinding` on the isolated TEST Supabase project with auth ownership guard.
- `tests/v2-sandbox-preview-checkout.test.mjs`: TEST-only Price ID, Stripe request construction, zero side effects behind hard-off gate, wrong-user/origin/secret/production isolation, webhook event rejection and route source guard assertions.

## Critical prerequisites for real paid TEST E2E
1. Create an **actual Supabase TEST user** via TEST auth and explicitly allowlist their user UUID with Preview-only `K4K_V2_SANDBOX_ALLOWED_TEST_USERS`.
2. In **the isolated Vercel project only**, set encrypted or sensitive Preview-only:
  - `SUPABASE_SERVICE_ROLE_KEY` for **TEST** project `yhbhrkyihiyyfzqogyri`, not production.
  - `STRIPE_V2_TEST_SECRET_KEY` beginning `sk_test_`, never LIVE.
  - `STRIPE_V2_TEST_WEBHOOK_SECRET` beginning `whsec_` from a dedicated Stripe TEST webhook endpoint.
  Set secrets in the Vercel dashboard or secure vault, **never paste into chat, GitHub, code or logs**.
3. Configure a Stripe TEST webhook URL that can reach the Vercel-Authentication-protected Preview. This may require an independently reviewed Vercel automation bypass; **do not disable Preview protection globally** to make webhooks work.
4. Verify a real paid TEST invoice and signed webhook can atomically credit exactly once in the TEST project before changing the compile-time gate. Exercise 3 TEST price cases: GBP Starter, BRL Creator, GBP one-time 140.
5. Confirm signature rejection, duplicate deliveries, refund/reversal, subscription test clock renewals, failure, cancel and out-of-order events. Reconcile TEST wallet independently with Stripe TEST receipts.
6. Only then seek separate authorization to change hard-off switches on the isolated protected Preview. All production Checkout and provider release gates remain OFF.

## Known limits
- This branch does not yet include a fully passing **real** Stripe TEST card-payment E2E, signing secret or a registered webhook endpoint.
- The original production K4K/Academy credit ledger is never used for TEST V2 receipts.
- Existing users' Stripe Price IDs and 80/160/340/700 old credit balances remain untouched.
- Option B: 175 V2 credits for the example 30-second Standard Motion Saver; the one-time 140-credit purchase does NOT guarantee that duration.
- Black Friday Creator coupon, FX/Tax/Pix, provider USD funding and audit sign-off are still separate blockers.
