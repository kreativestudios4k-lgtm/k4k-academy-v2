# Higgsfield API integration — K4K APP

This is a **transport-only, server-side adapter**. The existing Wan/fal customer journey remains unchanged.
No Higgsfield model is enabled for customers by this commit; no API generation or paid live test is performed.

## Configuration

- Set a **server-only** `HF_API_KEY` to the **complete copied credential** from https://open.higgsfield.ai/api-keys (not prefixed with `Key `).
- The transport sends `Authorization: Key <complete credential>` to `https://api.higgsfield.ai`.
- For an isolated **preview** developer pilot, set `K4K_HIGGSFIELD_API_PILOT=true`.
- There is deliberately **no production enable switch** yet.
- Keep the existing `FAL_KEY`, Wan model, customer credits, billing and job ownership untouched.

## Current state

The official model catalog lists Higgsfield Genjutsu for motion-preserving character swaps. The *model-specific request JSON schema and model path* must be verified from https://open.higgsfield.ai/explore before any paid submit. The connected Higgsfield model-search interface did not return a Genjutsu model, and no `HF_API_KEY` exists in K4K Vercel variables at the time of preparation. This means neither commercial entitlement nor API access has been verified.

The adapter supports server-side submit, status, cancellation, and signed image upload initialization. It does **not** expose a browser credential form or any public route, or persist returned request IDs. To make this a full model integration, use a server-owned key and add model-specific input validation, authenticated user/job attribution, quote and price checks, atomic credit reservation/refund, authenticated output collection and a signed upload route. Do not trust client-supplied request IDs or URLs and never re-submit an uncertain paid request.

Higgsfield docs: https://docs.higgsfield.ai/docs/llms.txt

## Verified Genjutsu model

The supplied Genjutsu documentation identifies the exact model endpoint `higgsfield/genjutsu/motion-transfer/v1.0` and body `{video_url,image_urls,prompt,resolution}`. The adapter implements those constraints, with 4–30 second input duration and 1–8 reference images. Published rates per source second (rounded up): 480p $0.154; 720p $0.3446; 1080p $0.8346. At 720p a 15-second clip costs $5.169, above the current K4K $5/job guard. This model is **not** connected to public generation endpoints.

Example future server-only pilot: validate private Supabase source media; issue short-lived signed download URLs; use `createGenjutsuProvider` from `lib/server/higgsfield-genjutsu-motion.mjs`; call estimate before any user reservation; submit only after atomic credit reservation; persist user-owned request ID; reconcile and privately store the completed MP4; refund confirmed failed or moderated jobs. Require preview `K4K_HIGGSFIELD_API_PILOT=true` and `K4K_HIGGSFIELD_RATE_CARD_APPROVED=true`, funded/authorized API access and a cap within the quoted amount. Do not replay uncertain submissions.

The model's ability to produce celebrity-likeness edits is subject to provider moderation and relevant rights; model schema verification is not a guarantee of authorization or successful generation.
