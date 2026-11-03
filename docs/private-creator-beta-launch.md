# K4K APP private creator beta — launch checklist

## Audience and invitation policy
- First cohort: 5–10 invited AI video creators; no public registration to the generator.
- Verify each invitee's Supabase-authenticated user ID server-side against the UUID allowlist.
- Preserve existing student subscriptions and entitlements; beta enrollment must not modify Stripe subscriptions.
- Collect consent to receive beta communications and to use submitted feedback. Do not publish creator work or testimonials without permission.

## Safe creator workflow
1. Sign in; check server-side invitation allowlist and active beta state.
2. Browse approved templates (template video already provided; no redundant reference-video upload).
3. Upload owned replacement-character images, or create from scratch with approved media.
4. Validate file signatures, media ownership, duration and model access on the server.
5. Derive an immutable server-side credit quote and cost ceiling before reservation.
6. Atomically reserve credits and submit the saved job using one provider idempotency key.
7. Show status, bounded polling, failure handling and owned output download.
8. Collect creator feedback linked to a job ID, without exposing other users' work.

## Hard launch gates
- Execute isolated PostgreSQL concurrency suite; no skipped tests accepted as a pass.
- Integrate authenticated API endpoints; enforce owner checks on every job/media operation.
- Confirm provider result authenticity, callback/status origin and durable reconciliation.
- Complete non-billable integration tests and an explicitly approved, cost-capped provider smoke test.
- Confirm preview deployment and test from a creator account, a non-invited account and an admin account.
- Disable public signups, affiliate payouts and live customer billing until separately approved.

## Affiliate programme: later phase
- Collect opt-in creator interest and suggested referral codes only.
- No affiliate commission, attribution payouts, referral-based pricing or live Stripe changes during beta.
- Design payout rules, fraud checks, attribution windows and disclosure requirements for separate review.

## Rollback
- Disable `K4K_GENERATION_BETA_ENABLED` to block new generator requests.
- Keep persisted in-flight jobs reconciled; do not silently refund ambiguous provider submissions.
- Do not remove existing customer access or alter balances as a rollback action.

This is a rollout plan, not proof that any route, database migration, provider call or deployment is live.
