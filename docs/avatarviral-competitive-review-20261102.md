# AvatarViral public-site review → K4K APP preview plan

Reviewed 2 November 2026: https://avatarviral.com.br/ and https://avatarviral.com.br/inicio

## Publicly observable experience

- Landing page: short hero claim, stacked motion examples, before/after illustration, examples grid, character-sheet examples, five-step explainer, FAQs and a CTA into the app.
- App dashboard: left navigation, masonry/multi-column trend cards, shortcuts for create, ready characters, avatar creator, pet replacement, downloaded videos and a monetisation area.
- Reference-driven character flow: select or upload motion video; identify person to replace; upload reference character; optional wardrobe change; review before generation.
- Public prices are not a reliable operating-cost source. The landing mentions a R$9.99/30-day access offer; the app page exposes different checkout and verification messages. Do not import these claims into K4K.
- Public copy and sample videos are their own assets. Do **not** reuse proprietary branding, reference media, testimonials, illustrations or source code.

## API-provider finding

**Not verified.** Public pages do not name a reliable video-generation API vendor. No direct Higgsfield, Seedance, Wan, Kling, Replicate, RunPod or fal.ai attribution was found in the accessible app page's inline scripts or external links. External frontend assets were not accessible for further checking; even a visible frontend request cannot conclusively reveal a hidden server-side model. Do not describe AvatarViral as “powered by Higgsfield” without independent evidence.

## K4K preview implementation

- Original mint-and-charcoal creator layout, editorial reference stack, ten existing K4K motion cards, searchable category vault.
- One-click template selection opens a Character Swap workflow with the reference preloaded; no second upload.
- Separate Text to Video, Image to Video and Character Swap modes with distinct model choices.
- Optional uploaded video reference for original swaps, replacement character photos, identity-selection notes and wardrobe direction.
- All gallery and studio previews silent, without sound-toggle controls.
- Explicit £0 simulation labels: no paid provider calls, actual AI render, checkout, database writes or credit deduction.

## Gaps before genuine launch

1. Confirm contractual/provider API access and billable unit costs for exact model, resolution and duration.
2. Set conservative credit prices for £9.99/100 credits, with enough margin for fees, refunds, retries and abuse.
3. Enforce credits server-side with atomic reservation, idempotency keys, webhook confirmation, provider-spend ceiling, failed-job refunds and per-account caps.
4. Add secure storage, media lifecycle and job history; connect a real provider adapter and test with a small authorized spend.
5. Verify consent/rights for face and character replacements; never assume permission to download or remix third-party Reels.
6. Build any future character library or pet tools using licensed media and explicit support from the selected model.

**Release gate:** Do not enable live API calls, Stripe billing changes or production deployment until explicit checks and user approval.
