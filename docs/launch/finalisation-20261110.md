# K4K finalisation — 10 November 2026

## Result

1. Payment → credits retry reliability: implemented and installed additive database RPCs. Membership invoice update, credit grant and receipt commit together; injected credit-write failure rolls back everything. Repeat invoice/event grants once. Modern Stripe invoice fields supported.
2. Extra credits: implemented authenticated one-time Checkout, signed verified webhook fulfilment, 20/50/100 packs in GBP/EUR/USD/BRL, automatic tax, refunds and dispute holds. Twelve one-time TEST prices created. Purchases remain gated pending Stripe Tax setup.
3. Pricing: owner instruction applied to preview: USD0.10 estimated provider cost per credit, monthly allocations 80/160/340/700; packs have fixed regional prices. Final generation quote is checked server-side against media duration/model/resolution. These are not fixed videos-per-plan promises.
4. Customer acceptance: local automated journey coverage and build pass. A new signed-in real Stripe TEST payment → credits → paid provider generation → private download acceptance run is NOT complete. Stripe refused TEST VAT registration because account-level Stripe Tax activation is required. The earlier operator generation succeeded, but is not evidence of the complete paid customer journey. No new billable provider call made.
5. Production preparation: explicit live key/price and provider permission gates, configuration handoff and provider permission-request draft prepared. No main merge, production deployment, live payment activation, API funding purchase or provider business approval occurred.

## Validation

`npm run build`: 304 tests passed, zero failed, optimized Next.js build passed. Includes eight real Postgres/PGlite atomic billing tests with failure injection, duplicates, role permissions, refunds and generation billing hold enforcement. Includes production/payment gates and top-up price, owner, payment and tax validation.

Hosted database before/after: 32 auth users, one generation job, no credit-account rows; membership fingerprint unchanged (4c8d03cbd2ee3ce20a258bb47bbadc93). Additive schema/functions only; no existing subscriber/account reset.

## Remaining external steps

- Activate Stripe Tax in the Stripe dashboard, then create and verify UK VAT registration in TEST mode. Do not set tax readiness merely to bypass this error. Monthly product tax category must also be reviewed against the owner-selected AI personal-use category.
- Confirm the TEST webhook destination targets this candidate before a real Checkout acceptance run. The existing destination still targets an older integration preview; no destination settings were changed.
- Approve one bounded billable acceptance generation after TEST checkout works. Prior operator authorization has already been consumed.
- Obtain written Higgsfield permission for this business model, verify/fund the API balance (USD100 was proposed), and separately approve live configuration and production release.

These are release blockers, not completed work. No production launch claim should be made from these tests alone.
