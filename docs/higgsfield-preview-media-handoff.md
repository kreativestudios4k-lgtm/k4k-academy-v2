# Higgsfield customer integration — 17 November 2026

The owner-only preview at `/k4k-app/higgsfield-preview` connects private upload verification, provider reference transfer, signed customer quotes, atomic credit reservation, one-shot Genjutsu dispatch, status reconciliation, confirmed failure refunds, and private playback/downloads.

`POST /api/higgsfield/customer-jobs` supports prepare, submit, status, list and download. It requires preview, a dedicated flag, same origin, verified non-anonymous JWT and the existing owner account. It rejects client billing amounts, identities, verification evidence and provider URLs.

Reference transfer downloads through the user's storage RLS, caches the exact verified bytes, and uploads those bytes to provider-issued signed S3 URLs with returned headers. API credentials go only to the fixed Higgsfield API host. SHA-256 receipts and duration are persisted in the server-only verified_media column. The additive migration was applied without changing balances.

Preparing a quote does not debit or generate. Submit verifies the signed quote, provider configuration and budgets before atomic reservation. An irreversible SQL dispatch claim prevents duplicate paid requests. Network uncertainty never automatically resubmits. SQL permits refunds before a dispatch claim; after a claim it refuses refunds without authenticated terminal-failure evidence.

Status authenticates to Higgsfield and binds the exact provider request. Output is validated, archived privately and settled once. Interrupted settlement can reuse existing private output only if all bytes match authenticated provider output. Failed/nsfw/canceled requests use the terminal-evidence refund RPC. The recent-job library resumes status checks and issues fresh private view/download links.

## Rate and limits

The official model and pricing pages were rechecked on 17 November 2026:
https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/playground
https://open.higgsfield.ai/pricing

Current standard per-second rates: $0.1540 at 480p, $0.3446 at 720p, $0.8346 at 1080p, rounded up to whole source seconds. New quotes use these rates; historical QA records and subscriptions remain unchanged. At the existing $0.10 provider-cost-per-credit ratio, five billed 480p seconds estimate $0.77 / 8 credits. Actual provider billing has not been independently reconciled against a receipt.

Branch-only configuration enables the authenticated owner, with a $1.60 job maximum, $20 daily and $200 cumulative shared-budget ceilings and one active job. No provider request is submitted until Generate is pressed on a signed quote. Production Higgsfield remains disabled.

## Verification and remaining release gate

Tests cover the orchestrated flow with mocked provider/storage and real PGlite ledger checks: duplicates, uncertainty, ownership, malicious upload destinations/headers, changed quotes, budgets and identical-output recovery. Full tests/build are required before publishing.

Before public activation, verify an authenticated owner journey through actual reference upload, quote, debit, provider completion/failure, credit reconciliation and MP4 download. Media-header checks are not full codec decoding or a guarantee of provider acceptance. Do not claim this real journey or provider billing passed from mocks alone. Keep PR #125 draft until that evidence exists.

## Completed real owner test and customer release

On 17 November at 10:35 UTC, job `8ce1eac1-3947-4125-bd7c-ff627a354b7c` completed. Read-only database verification found one dispatch claim, one reservation settled for 8 credits, a matching provider request ID and an MP4 in the private `studio-generations` bucket. Owner balance changed from 44 to 36. The owner confirmed both character quality and mobile download. The $0.77 remains the published estimate, not an independently reconciled provider invoice.

The main `/k4k-app/motion` page uses director slots, template selection or custom upload and signed quotes. `/k4k-app/videos` includes the Motion job library, resumes status polling and provides private playback/download. Existing Wan videos and subscriptions remain available.

Production is independently gated by `K4K_HIGGSFIELD_CUSTOMERS_ENABLED` plus the existing generation, provider-use and credit-isolation gates. `K4K_HIGGSFIELD_DISPATCH_ENABLED` can stop new submissions while preserving existing-job reconciliation. Production uses its own HF_API_KEY (or HF_CREDENTIALS) and a dedicated K4K_HIGGSFIELD_QUOTE_SECRET. A production build probe validates the credential without generating. Existing shared budget ceilings and credit pricing are preserved. Poor balance, billing hold, changed quote, foreign account and anonymous access remain blocked. Five recent quotes per ten minutes trigger a preparation throttle.

Public activation requires a successful production build audit and verified deployment. A passing preview build alone does not establish that production is active.
