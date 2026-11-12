# K4K APP public-launch readiness — 12 November 2026

**Target repository:** `kreativestudios4k-lgtm/k4k-academy-v2`  
**Target branch:** `integration/k4k-billing-checkout-20261107`  
**Latest verified application source/test commit:** `9c9f98f7cb9e7bf2dd7d91fc201df36a37904dcb`  
**Verified application-code Preview deployment (source/test commit above):** READY — `https://kreativestudios4k-site-8a36q1wox-kreative-studios4k.vercel.app`  
**Launch verdict:** NOT READY — payment, credit, and provider-generation end-to-end checks remain unverified.

## Product and customer journey

K4K APP is the primary product. K4K Academy is an optional learning feature. The public route is self-service; it does not require an invitation or waitlist.

Implemented on the target branch:

- `/signup` creates a Supabase email/password account without granting a subscription or credits.
- Signup preserves a strict allowlisted return path through email confirmation and password/Google sign-in, landing on `/pricing` or `/k4k-app/credits`.
- Pricing CTAs route unauthenticated customers to public signup rather than the Academy membership gate.
- `/pricing` derives the displayed/checkout currency from the trusted Vercel country header.
- Pricing copy identifies AI video creation as the core product and Academy as optional learning.
- Existing Academy routes and legacy paid-registration flow were not removed.

The legacy `public.k4k_launch_waitlist` and `public.k4k_waitlist_rate_limits` tables still exist in Supabase. The read-only snapshot showed zero launch-waitlist rows. No database deletion or schema change was made.

## Build and route verification

At application source/test commit `9c9f98f7cb9e7bf2dd7d91fc201df36a37904dcb`:

- Vercel Preview deployment state: `READY`.
- Build logs show `npm run test:all` invoked by the `prebuild` hook, followed by `Build Completed`; no failing test or compile error appeared in the returned build events.
- Deployed `/signup`, `/pricing`, and `/k4k-app/credits` each returned HTTP 200.
- Deployed `/api/generation/provider-readiness` returned HTTP 200 and explicitly reported generation disabled, provider authentication unverified, provider quote unverified, customer credit pricing unapproved, preview test generation not configured, and end-to-end provider testing incomplete.
- These are route/build checks, not browser-based account creation, payment, webhook, mobile, or accessibility acceptance tests.

## Higgsfield documentation and cost-safety correction

Official documentation and model-specific API references were checked:

- Authentication: `Authorization: Key <credential>`, with the current shared docs describing a key ID and secret.
- REST origin: `https://api.higgsfield.ai`.
- Genjutsu Light endpoint/model ID: `higgsfield/genjutsu-light/motion-transfer/v1.0`.
- Genjutsu endpoint/model ID: `higgsfield/genjutsu/motion-transfer/v1.0`.
- Genjutsu Light published rates: USD 0.05 / 0.10 / 0.20 per second for 480p / 720p / 1080p. Its published billing formula includes output duration plus input reference-video duration.
- Genjutsu published self-serve rates: USD 0.1540 / 0.3446 / 0.8346 per second for 480p / 720p / 1080p; billed duration is the source-video duration rounded up.

The K4K estimate code was corrected to those published rates. The Genjutsu Light estimate now includes the source video as a reference duration, and the lower-level estimate helper requires a measured reference-video duration. Related tests were updated.

**Not verified:** the account-specific estimate/quote, API authentication, model access, actual request/response, webhook signature delivery, output ingestion, or any billable generation. No generation request was submitted. The Preview readiness endpoint currently says `providerConfigured: true` but `providerAuthenticated: false`.

The current K4K billing architecture uses a server-managed shared `HF_CREDENTIALS` secret in Vercel Preview; it is not customer BYOK. The credential helper treats the copied value as opaque and sends it with the `Key` scheme. No provider secret value was decrypted or exposed. A per-customer “Connect API key” flow would be a different billing model and is not implemented in this shared-credit architecture.

## Stripe and credit ledger

Code inspected on the target branch:

- Checkout resolves a plan/currency pair from the server-side price allowlist and rejects non-`sk_test_` secrets.
- Checkout authenticates the Supabase user and fails closed if the existing-membership guard cannot be read.
- Webhooks verify Stripe's signature against the raw body.
- Subscription credits are granted only from qualifying paid subscription invoices.
- `k4k_grant_subscription_credits` is a server-only database function; the unique invoice ID makes the credit grant idempotent.
- The app does not grant credits from a Checkout success URL.

Read-only integration checks:

- The Stripe connector exposed only the K4KAPP live-mode account context. No live account data was read or changed, and no test-mode account context was available through that connection.
- Vercel Preview environment metadata contains the expected Stripe secret/webhook variable names, but secret values were not decrypted. The key mode and the 16 configured plan price IDs were not verified against a Stripe TEST account.
- Supabase `stripe_webhook_events` contained zero rows at inspection time.
- No test Checkout session or signed Stripe test event was created or delivered.

**Blocker:** Stripe TEST checkout, tax configuration, webhook delivery/idempotency, and first-payment/renewal credit provisioning still need an isolated test-mode run. The code being present is not proof that the connected Stripe account and price IDs are correct.

## Current-run verification and billing hardening — 12 November 2026

At source commit `9c9f98f7cb9e7bf2dd7d91fc201df36a37904dcb`:

- Vercel Preview state: `READY`.
- Build events show `npm run test:all` followed by `Build Completed`; no failing test or build error appeared in the returned log window. The exact test count was not exposed in the returned log excerpt.
- Deployed `/signup`, `/pricing`, and `/k4k-app/credits` returned HTTP 200.
- Deployed `/api/generation/provider-readiness` returned HTTP 200 and reported `generationEnabled: false`, `providerAuthenticated: false`, `providerQuoteVerified: false`, `customerPricingApproved: false`, and `testReady: false`.
- GET requests to the POST-only checkout and webhook routes returned HTTP 405, as expected. No authenticated checkout POST or signed webhook event was sent.

### Stripe webhook ordering fix

A concrete race was found in the webhook handler: Stripe can deliver `invoice.paid` after `checkout.session.completed` but before `customer.subscription.created`. The previous code treated the missing `stripe_subscription_id` as stale, then marked the invoice event processed. That could permanently lose first-payment credits.

The Preview branch now:
- Detects an invoice whose subscription has not yet been linked and returns a retryable error instead of marking the event processed.
- Continues to ignore genuinely older invoices for a replaced subscription when a newer membership event is already recorded.
- Accepts equal-second timestamps for a paid invoice when the matching subscription is already linked; Stripe event timestamps have one-second precision, so a strict less-than filter could otherwise drop a legitimate invoice.
- Adds regression coverage for the early-invoice retry/replay path and the replaced-subscription stale path.

### Stripe Preview-only guard

- Checkout and the K4K APP subscription webhook now reject requests outside `VERCEL_ENV=preview`.
- Both require a Stripe `sk_test_` key.
- Checkout success/cancel URLs now derive from Vercel's trusted `VERCEL_URL`, not the inbound Host header; invalid or missing deployment hosts fail closed.
- Unit and customer-journey source tests cover these restrictions.
- These changes do not enable live checkout and do not alter Academy's separate billing flow.

### Higgsfield documentation and model-catalog verification

Official shared docs currently specify `https://api.higgsfield.ai` and `Authorization: Key KEY_ID:KEY_SECRET`. The Genjutsu Light model API reference page also contains a conflicting legacy example using `Bearer` and a different SDK package, while its current Playground sample and shared docs use the Key credential scheme. K4K retains the user-requested `Key` scheme and does not treat the conflicting page as proof of account authentication.

The official Wan 3.0 Prime Reference-to-Video page documents model ID `alibaba/wan-3.0-prime/reference-to-video`, endpoint `https://api.higgsfield.ai/alibaba/wan-3.0-prime/reference-to-video`, prompt, duration, image/video references, resolution, aspect ratio, audio and thinking parameters. This is documented model availability only; access with the K4K API credential is not verified.

The connected Higgsfield application catalog exposes additional video models including Seedance, Kling, Wan, Genjutsu and others. That connector catalog is not proof of the developer API account's entitlements. The current K4K Creator UI still exposes only its two existing Lite/Pro motion-transfer choices; the wider model-catalog requirement remains open. Do not silently map or remove models until each model-specific endpoint/schema and the intended K4K operation are verified.

**No provider request was submitted.** No billable generation, test generation, or credential authentication probe was run in this verification pass.

## Read-only Supabase snapshot

Project: `KreativeStudios4k Academy` (`eu-west-2`). No SQL writes, migrations, account changes, or balance changes were made.

| Table | Rows observed |
|---|---:|
| `academy_students` | 32 |
| `academy_orders` | 3 |
| `memberships` | 11 |
| `academy_subscription_claims` | 13 |
| `academy_entitlements` | 3 |
| `studio_generation_jobs` | 5 |
| `studio_credit_accounts` | 1 |
| `stripe_webhook_events` | 0 |
| `k4k_credit_grants` | 1 |
| `k4k_generation_reservations` | 1 |
| `k4k_launch_waitlist` | 0 |
| `k4k_waitlist_rate_limits` | 1 |

These are point-in-time counts, not a migration or entitlement reconciliation. Existing Academy data was left untouched.

## Security and launch blockers

1. **Stripe TEST account verification:** only a live-mode Stripe connector context was exposed. Confirm the target Preview secret is a test key and validate the current price IDs in Stripe TEST mode.
2. **Webhook acceptance:** deliver signed test events and verify checkout-to-customer linking, subscription status, retries, duplicate events, out-of-order events, and invoice-idempotent credits against isolated test data.
3. **Credit economics:** `customerPricingApproved` is false on the target deployment. Reconcile published/provider-account quotes, per-model cost, customer credit allowances, tax, margins, and refunds before enabling generation.
4. **Higgsfield authentication:** run the protected non-billable admin authentication check with a valid administrator session. The configured secret alone is not proof of authentication or model access.
5. **Generation gates:** the target Preview reports test-generation flags/users missing and `generationEnabled: false`. Keep this disabled until the authoritative quote, verified media durations, spending cap, atomic reservation/settlement/refund, idempotency, polling/cancellation, and private output delivery are tested.
6. **Character mapping and media:** the creator currently saves owned image/video references and drafts; real provider-side character mapping and generated output delivery have not been exercised.
7. **Mobile/accessibility:** automated source tests and route checks ran, but no full mobile browser, keyboard-only, screen-reader, or cross-user manual acceptance pass was performed.
8. **Supabase security advisor:** read-only inspection reported leaked-password protection disabled; nine RLS-enabled tables without policies (including server-only billing/ledger tables); and four `SECURITY DEFINER` functions executable by authenticated users. The inspected function bodies contain caller checks (admin-table, own-membership, or confirmed owner-email checks), but the hard-coded owner-email checks should be consolidated into `k4k_admins` and the advisor findings formally reviewed. No Supabase settings, policies, grants, or schema were changed.
9. **Vercel secret hygiene:** Vercel metadata flags `BLOB_READ_WRITE_TOKEN` with a `readable-secret` security issue. Do not expose it; assess rotation separately because it is shared across environments and rotation could disrupt storage.
10. **Full Higgsfield model catalog:** the connected model catalog includes more video models than the two options currently exposed in K4K Creator. The connector catalog does not prove developer-API entitlements, and model-specific endpoint/schema coverage is incomplete. Preserve catalog entries as pending verification; do not silently map unsupported operations.

### Current read-only security and account inspection

- Supabase project `tqlvfqjvfqfigsauqjtl` remains `ACTIVE_HEALTHY`; no SQL writes, migrations, settings changes, grants, or account changes were made.
- Current table snapshot still shows 32 Academy students, 3 Academy orders, 3 Academy entitlements, 11 memberships, 13 Academy subscription claims, 5 generation jobs, 1 studio credit account, 0 K4K Stripe webhook events, 1 invoice credit grant, 1 generation reservation, 0 launch-waitlist rows and 1 waitlist-rate-limit row.
- Security advisor currently reports 9 RLS-enabled tables without policies (INFO), 4 `SECURITY DEFINER` functions executable by authenticated users (WARN), and leaked-password protection disabled (WARN).
- The four function definitions were read without modification. They contain caller checks: `k4k_admin_summary` uses `k4k_admins`; `k4k_ericm_has_paid_access` checks only the caller's own membership/admin status; the two `k4k_studio_admin_*` functions check the confirmed owner email. The linter findings remain open for formal privilege review; no function grants or bodies were changed.
- Stripe account discovery returned only `K4KAPP` with `livemode=true`. No TEST-mode account context is available in the current Stripe connection, so no test Checkout session or webhook event could be safely exercised.

## Changes made safely in this run

- Fixed the public signup → pricing journey, including email-confirmation and Google/password sign-in return paths.
- Localized the public pricing page and changed the Academy positioning to optional learning.
- Updated customer-facing signup links from the legacy registration route to `/signup`.
- Corrected Genjutsu/Genjutsu Light rate-card estimates and Genjutsu Light reference-video billing.
- Added customer-journey and provider-cost regression tests.
- Fixed the out-of-order Stripe invoice/subscription delivery race, including same-second event timestamps, and added regression tests.
- Restricted K4K APP checkout and subscription webhook routes to Preview plus Stripe test-mode keys, and pinned checkout return URLs to the trusted deployment host.
- Updated the repository README to document K4K APP as the primary product and preserve Academy.

All code changes were committed only to the target Preview branch. No merge to `main`, production deployment, live Stripe action, database mutation, customer contact, or billable AI request occurred.
