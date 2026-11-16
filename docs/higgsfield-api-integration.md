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
