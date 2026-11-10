# K4K APP final verification — 10 November 2026

**Decision: NO-GO for public paid generation.** Continue on Preview. No production deploy, merge, live payment activation, Stripe setting changes, database writes, or new billable provider call was made during this audit.

## Scope and baseline

Audited the READY Preview deployment for remote commit `3dc43b5a0b64e3c8e20b04bb4a1c75ec18b36535` on `feature/k4k-studio-library-20261110`. Customer story: register/sign in → choose plan → Stripe payment → verified monthly credit grant → upload/reference template → quote and reserve credits → provider generation → private library playback/download.

The account used for Stripe inspection was KreativeStudios4k Academy, TEST mode only. The audit did not replay Stripe events against the database or create purchases/accounts.

## Confirmed evidence

| Check | Result | Evidence and scope |
|---|---|---|
| Baseline automated suite and build | Pass | 284/284 tests; Next.js build completed |
| Fix candidate automated suite and build | Pass | 288/288 tests after four new invoice-shape regressions; build completed |
| Deployed routes and negative access checks | Pass | 15/15 HTTP probes on baseline Preview |
| Customer entry pages | Pass (HTTP only) | Home, studio, library, credits, register, login and pricing returned 200 |
| Private downloads | Pass (negative) | Unauthenticated request for known completed job returned 401; private/no-store |
| Generation/billing authentication | Pass (negative) | Unauthenticated quote, submit, refresh, template import and checkout POST returned 401 |
| Webhook signature gate | Pass | Unsigned webhook returned 400 INVALID_SIGNATURE |
| Wrong-method generation submission | Pass | GET returned 405 |
| Configured plan prices | Pass | All 16 GBP/EUR/USD/BRL monthly TEST IDs, amounts, currencies and intervals matched repository configuration |
| Provider authentication | Pass | Read-only readiness endpoint reported providerConfigured=true and providerAuthenticated=true; no generation submitted |
| Existing operator result | Pass (record inspection) | One completed job; no processing jobs. This is the earlier operator test, not a customer billing test |
| Private storage | Pass | studio-references, studio-videos and studio-generations all public=false |
| Owner protections | Pass (schema inspection) | RLS enabled on account/student/membership/job tables inspected; owner predicates exist |
| Financial function permissions | Pass (inspection) | reserve_draft, finish and subscription-credit grant callable by service_role, not anon/authenticated |
| Negative balances | Pass (snapshot only) | Zero negative studio credit balances |
| Runtime error log lookup | Limited | No error/fatal log records returned for baseline deployment in the last two hours; this does not prove a complete user journey |

## Fixes prepared in this isolated candidate

1. **Current Stripe invoice format:** recent TEST invoice events use API version `2026-08-26.dahlia`, with `parent.subscription_details.subscription` and line `pricing.price_details.price`. The baseline route/handler expected legacy `subscription` and `price.id`, so it could classify a paid subscription invoice as non-subscription. Added compatible parsing to both layers, retaining legacy support and rejecting conflicting identifiers. Four new regression cases pass. No existing event was replayed and no balance was altered.
2. **Regional public pricing:** baseline `/pricing` always displayed/submitted GBP while checkout derives currency from the trusted edge country. Applied the existing reviewed pricing implementation to this candidate, with GBP/EUR/USD/BRL display, refreshed prices on region mismatch, a safe Stripe checkout destination validator, and explicit TEST-mode labels. No Git branches were merged and no Stripe prices were changed.

## Launch blockers

### P0 — Subscription credit retry is not recoverable after a partial write

A local mock failure injection reproduced this sequence:

1. Membership update succeeds and records the invoice event timestamp.
2. Credit grant fails transiently; webhook responds for retry.
3. Retry sees that same timestamp as stale, skips the credit grant, then marks the event processed.

Observed simulation: one grant attempt; retry result `STALE_EVENT`; event marked processed; credits not delivered. No database or Stripe state was used for this simulation.

**Required fix:** process membership eligibility/update, invoice-deduplicated credit grant and processed-event recording atomically, or implement a durable, independently retryable credit-grant state machine. Preserve owner/subscription checks, stale-event protection and unique invoice grants. Test failure between every write and concurrent retries. Do not resolve this by blindly granting stale invoices or resetting event timestamps.

### P0 — Customer generation remains intentionally disabled and preview-only

Runtime readiness reported generationEnabled=false, customerPricingApproved=false, previewTestConfigured=false. Submission code requires VERCEL_ENV=preview and a TEST-user allowlist; refresh and template import also remain preview-only. This requires reviewed production-path implementation, not merely toggling an environment flag.

### P0 — Production configuration and release approval absent

Project metadata has Preview credentials for Higgsfield, Supabase service role and Stripe key/webhook secret, but no corresponding Production variables. Customer credit approval/value, generation enablement and spending-cap variables were absent for the audited branch. Existing checkout explicitly rejects live keys. Public generation, live billing, production secrets and deployment must be separately prepared and approved.

### P0 — Signed-in customer acceptance remains unverified

No fresh test checkout → webhook → credits → reservation → generation → library/download customer journey was completed in this audit. The earlier successful operator generation bypassed customer credit charging and cannot substitute for this test. Registration/email confirmation, existing-student access, password recovery, two-user isolation, paid-invoice retries, failed-generation refunds and library playback must be exercised using isolated test accounts and a correctly routed TEST webhook before sign-off. A further billable generation needs explicit approval.

### P1 — TEST webhook points to a different integration preview

The active billing TEST webhook targets the integration/billing preview alias, not this audited library/release candidate. Its API version is not pinned on the endpoint. Actual event payloads were inspected without changing settings. Final acceptance needs the approved candidate and a corresponding TEST webhook configuration; never retarget automatically or print the bypass-bearing webhook URL in reports.

### P1 — Extra-credit purchase flow incomplete

20/50/100-credit packs remain proposal-only, with disabled purchase buttons. No matching new TEST pack prices or Checkout/payment webhook fulfillment exists. Required before offering packs: approved amounts, paid-only one-time Checkout, asynchronous-payment success handling, atomic grants unique by Checkout Session, and refund/dispute/expiry policies.

### Commercial confirmation and funding

The proposed credit rule and pack amounts are not approved/activated. The proposed USD100 API funding and available API balance were not verified. The previously identified provider-use permission question for K4K's paid generation model remains unresolved; technical API authentication does not establish commercial permission.

## Security advisory review

Supabase reported six INFO findings for RLS-enabled tables with no user policies; the financial/event/admin tables are server-only and deny direct customer access by design. Four callable SECURITY DEFINER helpers were inspected and contain authenticated admin/owner checks; no open access was established. Leaked-password protection is disabled: recommended hardening before broader public registration. Remediation reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Release sequence

1. Fix atomic billing/credit retry recovery and validate it under injected failures.
2. Obtain provider-use confirmation and approve the commercial credit rules; finish top-ups or exclude them clearly from initial launch.
3. Prepare the production-capable customer path while retaining explicit deployment/live-payment gates.
4. Route a TEST webhook to the approved candidate with explicit owner approval; run the complete signed-in customer acceptance matrix, including separate-user isolation.
5. Confirm API funding/spend limits and obtain approval for a bounded final generation test.
6. Review all evidence, then request the separate production merge/deploy/live-billing approval. Do not launch on the basis of a passing unit suite alone.
