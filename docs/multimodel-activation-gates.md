# K4K multi-model activation gate — unchanged subscriptions

Verified on 2026-11-16 using connected fal.ai catalog and model input schemas.

| Customer model | Exact fal endpoint | Billing basis | API work |
|---|---|---|---|
| Kling 4 Flash text-video | kling/v4/flash/text-to-video | $0.094/generated second | Verified adapter contract; guarded lifecycle pending |
| Seedance 2.5 text-video | bytedance/seedance-2.5/us/text-to-video | $0.0214/1000 provider tokens | Variable token quote pending; cannot extrapolate duration-only rate |
| FLUX 3 image | blackforestlabs/flux-3/text-to-image | $0.048/rendered MP | Actual billable dimensions, image storage and settlement pending |
| Nano Banana 2.1 image | google/nano-banana-2.1 | $1/unit | Image storage and settlement pending |

The existing production /api/generation/jobs/quote and /submit accept only owned fal Wan "lite" drafts with 720p reference video and 1–8 image references, and assume video/mp4 output. It is **unsafe** to route these new text-to-video or image types through that path without a typed job schema, media validators, atomic credit reservation, provider-specific reconciliation and private image delivery. Do not enable customer access by flipping catalog statuses or legacy provider flags.

Required release sequence:
1. Add typed job records for image/video model, prompt, duration and output mime with owner-only RLS.
2. For each model provide server-validated quote, signed by the K4K quote secret and bound to immutable job fingerprint, plus a conservative per-model budget.
3. Reuse ledger reserve/reconcile/failed-job refund transaction semantics, recording provider request id exactly once, never resubmit uncertain requests.
4. Verify provider status and store validated bytes privately; adapt image/jpeg/png output handling.
5. Run approved paid preview per model (never using customer balances); deploy production only after end-to-end tests.
6. Leave four existing subscription prices, credit grants and active Stripe subscription objects unchanged.

The new server module provides schema-verified input contracts and quote failures but does not dispatch chargeable jobs or expose paid routes. The preview-only intent is explicit and customerEnabled remains false.
