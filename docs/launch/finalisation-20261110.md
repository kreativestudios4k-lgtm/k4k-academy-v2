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

- Activate Stripe Tax in the Stripe dashboard, then create and verify UK VAT registration in TEST mode. Do not set tax readiness merely to bypass this error. All four K4K monthly TEST products now use the owner-selected AI personal-use category (canonical Stripe tax code verified before applying).
- The K4K TEST webhook now targets candidate c144c920a246435f5f8a0d06009ceee14d9b8994 and includes asynchronous top-up fulfilment, refunds and disputes. Other Supabase/Academy webhook endpoints were preserved. Reachability verified (GET returns expected 405). Actual signed delivery and payment acceptance remain pending.
- Approve one bounded billable acceptance generation after TEST checkout works. Prior operator authorization has already been consumed.
- Obtain written Higgsfield permission for this business model, verify/fund the API balance (USD100 was proposed), and separately approve live configuration and production release.

These are release blockers, not completed work. No production launch claim should be made from these tests alone.

## Follow-up account checks

Stripe TEST tax settings remain configured, but active registrations are empty. The dashboard requires sign-in. The owner selected Google in the secure sign-in flow; automatic browser review then blocked observation of accounts.google.com because Google-origin authorization is required separately. No alternate sign-in workaround attempted. No passwords or codes were read.

The connected Higgsfield workspace balance was read, but it does not establish the separate prepaid API balance. A focused connected-mail search found no business-use permission reply. Current official API terms sections 4.1–4.2 still restrict pass-through/similar generation services absent written consent: https://open.higgsfield.ai/terms-of-service . The prepared permission request was sent after owner approval on 10 November 2026; Gmail SENT message/thread 1a1c6a22e7817e30. Provider permission remains pending.

Hosted preview status READY; 11 HTTP checks passed, including credit packs/terms pages, unauthenticated billing and generation rejection, and unsigned webhook rejection. Billing readiness returns TEST / TAX_SETUP_REQUIRED. No live Stripe operation or production release occurred.

Owner approved continuing Google sign-in. Automatic browser review again rejected the Google authentication origin despite that approval. No workaround attempted. Stripe Tax activation remains blocked in the agent browser; the owner can make the account-level activation in their dashboard, then the connected Stripe API can verify registration/calculation without depending on shared browser authentication. Customer paid acceptance and production release remain incomplete.
