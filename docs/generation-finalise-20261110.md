# Generation pipeline: state on 10 Nov 2026 (Preview only)

Branch `integration/k4k-generation-finalise-20261110`, based on `f9a5152`.
Nothing here has made a provider call, changed the database, or touched Stripe.

## What a customer generation now does

1. Creator Studio uploads the customer's files to their private folders and saves a draft row (unchanged behaviour).
2. `POST /api/generation/jobs/price` reads the stored files, measures the real MP4 duration and returns the credit price and balance. Read-only.
3. `POST /api/generation/jobs/submit` (body: `jobId`, `resolution`, `requestKey` only):
   launch gates, owner check, media inspection, server price, balance check, active-job limit (2),
   signed links to the customer's own files, provider estimate checked against the spend cap,
   `k4k_generation_reserve_draft` (atomic debit, one reservation per job), one provider request with
   `Idempotency-Key` = job ID, provider request ID saved on the job.
4. `GET /api/generation/jobs/{id}` (polled by the page): asks the provider for status server to server. On
   `completed` it downloads the video from an approved host (size-bounded, no redirects, MP4 check), stores it at
   `studio-generations/{user}/{job}.mp4` and calls `k4k_generation_finish(completed)`. On `failed`, `nsfw` or
   `canceled` it calls `k4k_generation_finish(failed)`, which returns the credits.
5. `GET /api/generation/jobs/{id}/download` returns a 60-second signed link to the owner.

Settlement and refund are once-only because the deployed `k4k_generation_finish` locks the reservation and does
nothing unless it is still `reserved`. No schema change was needed.

## Outcomes that keep the reservation (never refunded or resent automatically)

- Provider call timed out, network error, HTTP 5xx, or an idempotency conflict: job stays `queued` with no provider ID.
- Provider accepted the job but the ID could not be saved (logged as `generation.provider_id_unrecorded`).
- Video finished but its host is not approved, storage failed, or settlement failed: job stays `processing`; the next status read retries.

There is no admin screen for the first two yet. They need a person to check the Higgsfield request list.

## Settings (all default to off)

| Variable | Meaning |
|---|---|
| `K4K_GENERATION_SUBMISSION_ENABLED=true` | Master switch for new submissions |
| `HF_CREDENTIALS` | Higgsfield credential, used whole as `Authorization: Key <value>` |
| `K4K_CUSTOMER_CREDIT_PRICING_APPROVED=true` | Confirms the rate table below is approved |
| `K4K_GENERATION_CREDITS_PER_SECOND` | JSON, e.g. `{"lite":{"720p":N},"pro":{"720p":N}}`. Options without a rate cannot be generated |
| `K4K_GENERATION_MAX_PROVIDER_USD` | Highest provider estimate allowed for one video |
| `K4K_HIGGSFIELD_OUTPUT_HOSTS` | Comma-separated hosts finished videos may be downloaded from (`.example.com` allows subdomains) |
| `K4K_GENERATION_TEST_USERS` | Preview only: account IDs approved for the current billable test |
| `K4K_GENERATION_PUBLIC_ENABLED=true` | Production only: launch approval. No per-user list applies in production |
| `K4K_GENERATION_INPUT_URL_TTL_SECONDS` | Optional. Lifetime of signed input links, default 21600 |

`GET /api/generation/submission-readiness` lists whichever of these are missing for the signed-in user.

## Checked against Higgsfield's published documentation on 10 Nov 2026

- Base URL `https://api.higgsfield.ai`, header `Authorization: Key KEY_ID:KEY_SECRET` (docs/authentication).
- Submit `POST /higgsfield/genjutsu/motion-transfer/v1.0` with `video_url`, `image_urls` (1 to 8), optional `prompt` (max 10000), `resolution` 480p/720p/1080p. Source at least 4 s, trimmed at 30 s (docs/models/genjutsu/motion-transfer).
- Genjutsu Light model ID `higgsfield/genjutsu-light/motion-transfer/v1.0`, uses the first 15 s (open.higgsfield.ai model page). Its parameter limits are not published in the API docs.
- Status `GET /requests/{id}/status`; states `queued`, `in_progress`, `completed`, `failed`, `nsfw`, `canceled`; finished video at `video.url` (docs/concepts/requests).
- `Idempotency-Key`: same key and same body returns the original request without a second charge; a different body returns 422 (docs/concepts/idempotency).
- Estimate `POST /estimate/{model}` returns `{"usd": "..."}` and is described as the authoritative amount for the account (docs/concepts/billing-and-retention).
- `failed` and `nsfw` are not charged; a cancelled queued request is refunded (docs/concepts/billing-and-retention, docs/concepts/errors).
- Error codes 400, 401, 403 (insufficient balance), 404, 409, 422, 423, 429, 500, 503 (docs/concepts/errors).
- Outputs are deleted seven days after the request finishes (docs/concepts/requests).

## Not verified

- The credential has never been accepted by the provider in a real call from this app.
- Whether Higgsfield will fetch Supabase signed links as input. The docs ask for a "public HTTPS URL" and offer `POST /files/generate-upload-url` as the alternative. If signed links are refused the submission is rejected and refunded; the fallback is to add the upload step.
- The host name finished videos are served from. The docs only show placeholders.
- Published prices disagree with each other (Genjutsu listed as $0.159 to $0.816 per second in one table and $0.318 / $0.681 on the same site; Light listed as $0.025 to $0.10 and $0.05 / $0.10 / $0.20). The code does not rely on any of them; it uses the estimate endpoint.
- Supabase's project-wide upload size limit. A finished video larger than that limit would not store.
- No browser test of Creator Studio against a real signed-in account.
