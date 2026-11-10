# Generation connection preview

Implemented on `integration/k4k-generation-connect-20261110`.

## Customer flow

Upload reference media, save a draft, review a non-generating provider estimate,
then explicitly confirm the signed credit quote. Quotes expire after five minutes
and bind the authenticated owner, draft contents, model, resolution and price.
The server inspects owned media, obtains a fresh provider estimate, reserves
credits through `k4k_generation_reserve_draft`, submits once with the job UUID as
provider idempotency key, and records the provider request ID.

`POST /api/generation/jobs/refresh` reads the verified provider state. Confirmed
failed, moderated and canceled jobs use the existing atomic finish/refund RPC.
Documented synchronous rejection codes also refund. Network failures, malformed
acceptance receipts and 5xx outcomes retain reservations for reconciliation.
No automatic resubmission or ambiguous-outcome refund is implemented.
Successful jobs return `awaiting_output`; private output ingestion remains a
separate launch requirement. This change is not a full production launch.

## Non-generating authentication check

Preview-only `GET /api/generation/provider-auth-check` estimates a fixed public
sample with the saved server credential. It does not submit a generation or
use private customer media. Results are cached for one minute per worker.
An accepted, validated USD estimate verifies authentication. Errors expose only
sanitized categories and HTTP status. The owner Admin panel uses this check.

## Configuration required before any paid preview test

All switches remain disabled unless separately configured after owner approval:

- `K4K_ENABLE_TEST_GENERATION=true`
- `HIGGSFIELD_GENJUTSU_ENABLED=true`
- `K4K_GENERATION_TEST_USERS=<approved test user's UUID>`
- `K4K_CUSTOMER_CREDIT_PRICING_APPROVED=true`
- `K4K_PROVIDER_USD_PER_CREDIT=<approved provider-cost allowance per credit>`
- `K4K_GENERATION_MAX_USD=<approved per-job cap, maximum 5>`

No numerical credit conversion has been approved or configured by this change.
Example for review only: an allowance of USD 0.10 per credit charges a verified
USD 1.21 quote as 13 credits. This is an allowance calculation, not an exchange
rate or a change to any subscription price.

Read-only inspection confirmed that reserve/finish functions exist, browser
roles cannot execute them, output paths bind to the exact job, and customers
have INSERT-draft and SELECT-own-job policies with no UPDATE policy.
No hosted schema changes, credit mutations, Stripe changes, or paid calls are
part of this implementation.

## Sources checked

- https://docs.higgsfield.ai/docs/authentication.md
- https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md
- https://docs.higgsfield.ai/docs/concepts/errors.md
- https://docs.higgsfield.ai/docs/concepts/idempotency.md
- https://docs.higgsfield.ai/docs/models/genjutsu/motion-transfer.md
- https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl

The Pro schema was verified against the model documentation. Lite uses the
pre-existing endpoint contract; its model-specific documentation was not
accessible during this change. A successful authenticated estimate is still
required, and Lite should remain disabled until its contract is reviewed.
