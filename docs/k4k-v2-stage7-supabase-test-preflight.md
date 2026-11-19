# K4K V2 Stage 7 — Preflight and authenticated Stripe TEST binding lifecycle

**Status: DRAFT / NOT DEPLOYED.** No production Supabase SQL, LIVE Stripe writes, customer credit modifications, production Vercel deployments, or checkout activation.

## Supabase TEST capacity check (19 Nov 2026)

Only one Supabase organisation was connected: `kreativestudios4k-lgtm's Org` (Pro) with one project `tqlvfqjvfqfigsauqjtl` currently used by K4K/Academy production.

Authoritative Supabase quoted new **project** cost: **$10/month**, billed monthly; alternative separate **branch**: **$0.01344/hour**, but branch inheritance/customer data risks make a clean test project preferable.

**No resource was created; user cost and organisation approval is required before creation.** The sandbox adapter must not be run against the production project.

## Safety gap fixed in draft

A Stripe Checkout Session for a subscription may exist before Stripe issues a subscription ID. Prior sandbox binding SQL required `stripe_subscription_id` at insert time, making a genuine first-Checkout path impossible.

- `db/proposals/k4k-v2-sandbox-checkout-bindings.sql`: adds `pending` session state, permits null subscription ID **only while pending**, retains service-role-only SQL and RLS.
- `lib/server/v2-sandbox-checkout-binding-flow.mjs`: always freshly fetches current Stripe TEST Checkout Session, checks server-authenticated Supabase user UUID against `client_reference_id`, exact whitelisted TEST Price ID, correct mode and product metadata. It first records pending session, then activates **only after** Stripe returns completed/paid with a verified subscription ID. Single video is still one-time and requires no subscription ID.
- `tests/v2-sandbox-checkout-binding-flow-postgres.test.mjs`: disposable PostgreSQL tests cover pending→active transition, idempotent completion, wrong-user/price rejections, replay attacks, and direct `authenticated` SQL denial.

Only server-held verified identities can persist bindings; browser-supplied customer ID or user metadata cannot determine ownership. No public API endpoint exists yet for this flow.

## Next approval and execution stages

1. Obtain explicit owner approval for the **$10/month project in the selected Supabase organisation**.
2. Provision a clean TEST project; confirm ID is distinct from `tqlvfqjvfqfigsauqjtl` and wait until healthy.
3. Apply sandbox proposal SQL *only* to TEST project, run RLS advisor and read-only smoke checks; create synthetic test users, never clone production customers.
4. Integrate auth-server Checkout binding writer and protected TEST webhook with true Stripe TEST credentials (never `NEXT_PUBLIC_` secret).
5. Complete actual Stripe TEST hosted-card purchases for GBP Starter, BRL Creator, GBP one-time 140 credits; test duplicate delivery, subscription renewal with test clock, failed charges, refunds and credit grant balance.
6. Review taxes, country mapping, Pix, provider funding and margin, actual model cost quotes, invoice/tax adjustments and session expiration.
7. Separately authorize any LIVE migration, deployment or opening of public checkout only after all tests and budget/security gates are approved.

**Do not remove either compile-time V2 checkout guard.**
