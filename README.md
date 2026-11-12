# K4K APP

K4K APP is the primary Next.js 16 AI-video creation product for KreativeStudios4K. K4K Academy is an optional learning feature; existing Academy subscribers, accounts, credits, and access must remain intact.

## Public customer journey

1. Create a self-service account at `/signup` (email/password; no invitation or waitlist gate).
2. Choose a paid monthly plan at `/pricing` or `/k4k-app/credits`. Public pricing is derived from the trusted Vercel country header.
3. The authenticated server route resolves a plan/currency pair against the source-controlled Stripe price allowlist and accepts only a Stripe `sk_test_` secret.
4. A signed Stripe webhook links the customer and subscription. Only a verified paid subscription invoice grants monthly credits; the database grant is idempotent by invoice ID.
5. AI generation must authenticate the user, verify owned media, reserve credits atomically, obtain an authoritative provider quote, and store the completed output privately before it is exposed for playback/download.

**Preview status:** self-service signup and pricing routes are deployed. Stripe test checkout and webhook processing have not yet been verified end to end. AI generation remains disabled until provider authentication, pricing, quote, credit-ledger, and delivery gates are verified. Never infer payment or credits from a success URL alone.

## Academy preservation

- Keep `/academy`, existing Academy registration/claim flows, and existing paid entitlements intact.
- Do not convert existing Academy subscribers or balances as part of public K4K APP signup.
- Do not delete legacy Academy tables or waitlist tables without a separately approved migration.
- Do not change K4K Heritage from this repository.

## Key routes

- `/` and `/k4k-app`: public K4K APP template discovery.
- `/signup`: public self-service K4K APP registration.
- `/pricing`: public regional subscription pricing.
- `/login`: sign-in for existing accounts.
- `/k4k-app/account`: account, balance, and recent activity.
- `/k4k-app/credits`: plan selection and credit balance.
- `/k4k-app/creator`: creator workspace and saved references/drafts.
- `/k4k-app/videos`: owner-scoped generation history and private downloads.
- `/academy`: optional learning feature and existing student access.
- `/privacy`, `/terms`: public policy pages.

## Services and credentials

- Vercel hosts Next.js Preview and production deployments.
- Supabase handles authentication, membership claims, private storage, generation records, and the server-only credit ledger.
- Stripe handles monthly subscriptions. Checkout must remain TEST-mode only until separately approved.
- Higgsfield requests run server-side with `Authorization: Key <complete copied credential>`. The Preview server credential is `HF_CREDENTIALS`; never expose it in client code, logs, source control, or customer-visible responses.
- Keep each provider request ID associated with its owning user/job. Verify ownership before polling, returning status/results, cancellation, or download.
- Copy completed media into private K4K storage before Higgsfield's retention expiry; do not expose provider URLs or storage paths to other users.

## Verification

Run `npm run test:all` and `npm run build`. The build's `prebuild` hook runs the full Node test suite. Preview verification must include:

- Public signup, email confirmation, sign-in, and safe return to plan selection.
- Stripe TEST checkout, signed webhook delivery, duplicate delivery, out-of-order delivery, and invoice-idempotent credits.
- Credit reservation, completion settlement, failure/moderation/cancellation refund, and ambiguous-timeout recovery.
- Higgsfield model-specific schema validation, authoritative estimate/quote, authenticated polling/cancellation, private output ingestion, and owner-only download.
- Mobile layout, keyboard navigation, accessible labels/status/errors, and cross-user isolation.

## Operational safety

- Never hardcode Stripe, Supabase, or provider secrets.
- Never grant access from an unverified email, Checkout redirect, or unpaid session.
- Do not enable generation from a local estimate alone. Require verified media duration, provider quote, an explicit spending cap, and atomic credit reservation.
- Do not retry an ambiguous generation POST without the same stable idempotency key.
- Do not merge to `main`, deploy production, activate Stripe live payments, mutate the live database, or change existing subscriber balances/access without explicit approval.
- Review and customise the public privacy/terms pages with verified business/legal details before public launch.
