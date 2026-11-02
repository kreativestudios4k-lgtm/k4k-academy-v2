# K4K APP — pay-first launch (preview-only)
Status: NOT LIVE. No Stripe products, customer credits, account data, migrations or provider requests changed.

## Intended user path
1. Sign in, choose K4K Create/Motion Lite/Motion Pro and view a trusted server quote.
2. If insufficient credits, open a Stripe Checkout Session in a dedicated sandbox.
3. Grant credits only after verified Stripe webhook, never from success redirects.
4. Verify a paid entitlement and sufficient customer credits. Verify provider prefund, monthly cash cap, and in-flight budget.
5. In one atomic database transaction reserve quoted credits and durable idempotent job; then submit the provider operation.
6. Poll provider, save output under owner-only storage, settle or refund only on documented final status.
7. If provider funds are unavailable, **do not accept a new paid generation promise**; show a disabled purchase/generation state rather than silently queue indefinitely.

## Required before activation
- Dedicated Stripe sandbox product/price for new K4K APP £9.99/month and credit packs. Existing £7.99 Academy subscribers untouched.
- Subscription lifecycle, payment, refund, dispute and fraud webhook coverage, verified signatures, event idempotency, reconciliation and tax review.
- Authenticated provider/media input; server-inspected duration; per-model pricing including reference-video duration; current FX and transaction costs; never trust client-computed credits.
- SQL credit ledger reviewed and tested with concurrent reservations; ownership RLS and service role isolation; no browser permissions to spend/grant.
- Provider account balance and model entitlement verified; API budget and cutoff; alert on depletion. Higgsfield requires prepaid API Units under its standard terms.
- Charge only after verified delivery capacity; handling for payment but unavailable capacity must clearly define fulfilment or refund timing.
- Release gate false in preview/production until approved explicit live smoke test, monitoring and rollback.
