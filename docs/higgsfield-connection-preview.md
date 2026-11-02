# K4K APP API connection — PREVIEW ONLY

- Vercel preview currently has a server-side `HF_CREDENTIALS` configuration entry. Its value was never read or copied.
- Model router covers K4K Create, K4K Motion Lite and K4K Motion Pro with official Higgsfield path IDs.
- There is no live generation route, no request submitted to the provider, and no funds deducted. Pure tests use no network.
- Provider request bodies require trusted origin URLs and inspected duration supplied by a server; browser-supplied duration is untrusted.
- **Do not use this router directly from a client endpoint.** First validate owner identity and media, obtain authenticated and immutable server cost quote, reserve credits in audited atomic ledger, verify paid entitlement, sufficient provider balance and monthly provider cash cap.
- `HF_CREDENTIALS` must remain Preview-only, private, and not exposed in any `NEXT_PUBLIC_` variable.
- Confirm exact media parameter limits and provider account-specific pricing before a paid smoke test. For Wan, reference video seconds increase billing.
- Higgsfield API standard billing is prepaid; customer payment through Stripe does not automatically fund Higgsfield.

Official docs:
- https://open.higgsfield.ai/models/alibaba/wan-3.0-prime/reference-to-video/api-reference
- https://open.higgsfield.ai/models/higgsfield/genjutsu-light/motion-transfer/v1.0/playground
- https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/playground
