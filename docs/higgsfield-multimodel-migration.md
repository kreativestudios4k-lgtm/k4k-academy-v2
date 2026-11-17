# K4K APP — Higgsfield Multi-Model Migration

## Requested target
Retain the existing K4K customer-facing choices, but ultimately route Wan 3.0 Prime, Seedance 2.5, Kling 4.0, Nano Banana 2.1 and FLUX 3 Image through the Higgsfield developer API.

**Current production remains on fal.ai for these five model pathways.** Higgsfield Genjutsu Motion is already a separate live integration. The read-only candidate registry `lib/server/higgsfield-multimodel-migration.mjs` exists for integration development but cannot authorize any paid request. Changing a provider name alone does not migrate a model.

| K4K ID | Official Higgsfield REST model path | Readiness |
|---|---|---|
| `wan-prime` | `alibaba/wan-3.0-prime/reference-to-video` | Documented; reference upload/roles and job lifecycle require QA |
| `seedance_2_5` | `bytedance/seedance-2.5/text-to-video` | Documented; needs verified 5s/480p silent pricing and output |
| `kling4_0` | `kling-video/v4.0/text-to-video` | Documented; needs verified 5s/720p pricing and output |
| `nano_banana_2` | **Not verified** | Present in connected Higgsfield catalogue, but no authoritative public REST path/pricing/input contract established |
| `flux_3_image` | **Not verified** | Present in connected Higgsfield catalogue, but no authoritative public REST path/pricing/input contract established |

Official docs: [Wan Prime](https://open.higgsfield.ai/models/alibaba/wan-3.0-prime/reference-to-video/api-reference), [Seedance 2.5](https://open.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/api-reference), [Kling 4](https://open.higgsfield.ai/models/kling-video/v4.0/text-to-video/api-reference).

## Migration gates before first real customer

1. Confirm the developer account's `HF_CREDENTIALS`/server credential can access each exact REST endpoint. Do not confuse the connected Higgsfield ChatGPT model catalogue with API access granted to K4K's Vercel server.
2. Confirm the **precise billable input contract**, price, expected output and maximum cost for every customer mode. For Wan, preserve the current *reference-video* use case; text-to-video is not equivalent.
3. Write a new server-owned provider adapter using `lib/server/higgsfield-platform-api.mjs` and a provider-specific allowlist. Never put credentials in client bundles, logs or `NEXT_PUBLIC_` variables.
4. Add provider-aware owned job storage, request-id validation, status reconciliation, output integrity checks and allowlisted HTTPS download/ingest into the existing private Supabase buckets. The current `app/api/creative/customer/route.js` explicitly assumes provider `fal` in ownership, polling, result fetching and refund evidence; it **must not** be blindly changed to a Higgsfield URL.
5. Preserve signed quotes, fixed customer credits and upper-bound provider budgets. A supplier switch must **not** silently alter existing subscriptions or advertised credit prices.
6. Retain atomic credit reservations, exactly-once dispatch and safe ambiguous-timeout handling. Never automatically resubmit a billed request when its outcome is unknown.
7. Test a non-customer-funded owner job for each model end-to-end: quote → reserve → submit once → poll → verify actual output → private Library → download → settle once; also test terminal failure and refund.
8. Use per-model opt-in flags, default **off**, with a separate switch-back to the existing fal.ai pathway after verified jobs are reconciled. Never auto-fail-over a possibly paid job across providers.
9. Only then enable Higgsfield for paying customers one model at a time. Run the GitHub quality gate, Vercel preview and safe production route smoke after every cutover.

## Release boundary

The staging registry is purposely not imported by a public route or the customer paid API. It provides audited model IDs and an explicit fail-closed dispatch guard so no environment variable can turn on a half-built migration. Existing working customer generation and the two paid memberships stay intact.
