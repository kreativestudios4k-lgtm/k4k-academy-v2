# K4K APP gap analysis — 2026-11-08

Branch: `integration/k4k-billing-checkout-20261107`. Nothing here is merged to `main`, deployed to production, or billable.

## Verified

- **Academy data intact** (Supabase, read-only checks): 31 Academy students, 3 orders, 3 entitlements, 11 memberships, 110 cohorts, 13 subscription claims.
- **Test suite:** 81 of 81 pass on commit `5470dbb` (run in a clean clone).
- **Webhook route (direct, signed requests, no database):**
  - Manual invoice without subscription → 200 `NOT_SUBSCRIPTION`.
  - Wrong signing secret → 400 `INVALID_SIGNATURE`.
  - Subscription invoice with no database key → 503 `NOT_PROCESSING_YET`.
  - Invalid JSON → 400 `INVALID_PAYLOAD`.
- **Genjutsu validation module:** billing off by default, adapter never called while disabled, limits enforced per model.
- **Production build** compiles, including the new `/k4k-app/tools` page.
- **Security advisor:** the two pilot functions are no longer executable by signed-in users or anonymous visitors. Admin functions check the admin email inside the function.

## Not verified

- **Real Stripe retest** of `invoice.paid` through the Preview deployment. Blocked on the local retest on the owner's Mac.
- **Subscription path end to end** (checkout links the customer, subscription writes membership, renewal grants credits). Not exercised against Supabase.
- **Higgsfield Genjutsu Lite and standard endpoint paths and prices.** Public docs do not list them. The API console is needed.
- **Provider pricing for Kling, Wan, Seedance.** Kling rates come from a third-party page, not kling.ai. Wan rates on Alibaba's own pricing page were not visible. Seedance 2.5 has no flat published rate.
- **Vercel Preview env** for `HF_API_KEY` and `HF_API_SECRET`: not set.

## Gaps in the code

- The webhook route comment says subscription events are refused "until the database migration is approved". The migrations are applied; the comment is stale.
- Billing tables (`stripe_webhook_events`, `k4k_credit_grants`, `memberships_plan_snapshot_20261107`, `academy_checkout_registrations`, `academy_subscription_claims`) have RLS enabled with no policies. That is intended for server-only access, but it has not been reviewed against every caller.
- Admin access is checked against a hard-coded email. Works, but brittle. Should move to `k4k_admins`.
- Generation pipeline (job queue, provider adapter, refunds, duplicate prevention) is not built. The `studio_generation_jobs` table exists with zero rows.
- Creator platform, administrator dashboard, languages and feature flags: not started.

## Needs approval before proceeding

- Adding `HF_API_KEY` and `HF_API_SECRET` to Vercel Preview.
- Any billable provider call, with a spending cap set.
- Turning on leaked-password protection in Supabase Auth (dashboard setting).
- Any change to Supabase schema or grants on the shared project.
- Rotating the Vercel Blob token that appeared in chat.

## Next steps (in order)

1. Owner runs the webhook retest on the Mac and reports the status line.
2. Owner reads Genjutsu Lite and standard endpoint paths and prices from the Higgsfield API console.
3. Build the Genjutsu adapter against the verified endpoint, keeping the flag off.
4. Build the subscription end-to-end test with a linked test customer.
5. Continue the front-end tool pages behind the existing Preview protection.
