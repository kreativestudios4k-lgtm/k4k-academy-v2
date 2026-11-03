# Safe model quote gate (preview only)

The new pure server-only `quoteGeneration` helper returns the credit cost for an allowlisted model, duration and resolution. Its default catalog is empty: all models are unavailable until a verified, server-owned catalog is supplied. The illustrative 50p Genjutsu cost in tests is NOT a real quote.

A verified catalog must be approved after obtaining actual provider rates, GBP conversion, retry/failure allowance, storage and bandwidth, and must include an immutable quote version. The quote is informational only: it does not debit a balance or call an API. Before enabling checkout/generation, server routes must authenticate, validate owned uploaded media, check paid entitlements, reserve credits atomically using the SQL ledger, enforce user/global spending limits, and bind the quote version and cost to a durable job. Reject unknown/expired quotes; do not trust browser-supplied credits or costs.

Run `node --test tests/generation-quote.test.mjs` and `npm run build` in CI. This branch deliberately does not modify production, payment links, or customer data.
