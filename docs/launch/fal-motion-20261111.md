# K4K Motion on fal — implementation and activation

## Product mapping

Both tiers use `alibaba/wan-3.0-prime/reference-to-video`.

| Tier | Output | Reference duration | Output duration |
| --- | --- | --- | --- |
| Motion Lite | 720p | 2–15 seconds | source duration rounded up |
| Motion Pro | 1080p | 2–15 seconds | source duration rounded up |

The tiers differ by resolution, not by underlying model. The API supports up
to 30 seconds of output, but this implementation deliberately follows the
verified source duration. Longer input references are rejected, never silently
trimmed. Up to eight character images use the existing studio workflow.

## Price policy

The configured conservative rate card is USD0.14/second at 720p and
USD0.28/second at 1080p. Both reference and output duration count; both are
rounded up for the reservation estimate. These are local budget estimates,
not authenticated fixed provider quotes. Fal's connected pricing response
returned USD0.05/second without resolution rules, so it cannot establish the
final configured price. Do not label estimates as verified or final charges.

At the existing USD0.10 provider allowance per K4K credit:

| Reference/output | Lite estimate | Lite credits | Pro estimate | Pro credits |
| --- | --- | --- | --- | --- |
| 5s / 5s | $1.40 | 14 | $2.80 | 28 |
| 10s / 10s | $2.80 | 28 | $5.60 | 56 |
| 15s / 15s | $4.20 | 42 | $8.40 | 84 |

The existing $5 per-request hard cap is preserved. Pro references longer than
8 seconds exceed that cap after rounding and remain blocked. A higher cap
requires a separate reviewed change; this release does not increase spending.
Subscription amounts, paid credit allocations and Stripe settings are unchanged.

## Server configuration — not applied

Create a fal API key for the funded Kreative Studios4k account. Put the complete
value in Vercel **Preview** as server-only `FAL_KEY` (never NEXT_PUBLIC_FAL_KEY).
Connecting fal to ChatGPT does not provide this credential to the website.
Use an independent high-entropy `K4K_GENERATION_QUOTE_SECRET` when possible.

The new provider is off unless `K4K_FAL_WAN_ENABLED=true`.
The local rate policy is off unless `K4K_FAL_RATE_CARD_APPROVED=true`.
Existing `K4K_CUSTOMER_CREDIT_PRICING_APPROVED`, `K4K_PROVIDER_USD_PER_CREDIT`,
`K4K_GENERATION_MAX_USD`, preview user allowlist and test-generation flags also
apply. The waitlist-only flag continues to block paid generation. Do not turn
off the public waitlist or enable production generation as part of key setup.

## Job lifecycle

New creator drafts carry `provider=fal`. Quote signatures bind that provider,
tier, resolution, prompt and owned media. The server verifies media signatures
and duration, signs private references, reserves customer credits atomically,
then dispatches one fal request. There is no paid POST retry or assumption that
fal honors an idempotency header. Uncertain submissions retain reservations for
reconciliation. Definitive submission rejection or verified failed result refunds.

Fal queue URLs are constructed only from the fixed owner/app and validated
request ID. A COMPLETED queue state alone does not qualify as a successful
video. The authenticated result is inspected before private ingestion. Only
explicit approved fal CDN hosts may be downloaded; media byte/MP4 checks and
owner/job-scoped private storage are reused before settling completed credits.
The existing library and short-lived download links then serve the video.
Older Higgsfield jobs keep their provider; no migration or reset is needed.

## Evidence and remaining verification

- External fal MCP test succeeded: five-second single-character replacement.
  Request `01a1cb35-4df6-7810-97c2-3debd04546d8`, 1108×832 MP4, 150 frames.
  This is not a website or customer-credit acceptance test.
- Database inspection confirmed draft INSERT and owner SELECT policies, no
  customer UPDATE policy and no constraint restricting the provider column.
- Unit/integration mocks cover tier locks, reference duration, payload roles,
  billing guards, provider binding, queue/result handling, credit reservation
  and private library ingestion.
- Still required after secure key setup: website sign-in → owned media → Lite
  quote/confirmation → one paid request → private library/download → credit
  settlement. Repeat for Pro and a verified provider failure. Check billed
  amounts in the fal account before approving the final credit rate policy.
- No production deployment, Stripe mutation, live-payment activation, hosted
  environment-variable change or additional paid generation was performed.

## Official references

- https://fal.ai/models/alibaba/wan-3.0-prime/reference-to-video/api
- https://fal.ai/models/alibaba/wan-3.0-prime/reference-to-video
- https://fal.ai/docs/documentation/model-apis/inference/queue
- https://fal.ai/legal/terms-of-service
