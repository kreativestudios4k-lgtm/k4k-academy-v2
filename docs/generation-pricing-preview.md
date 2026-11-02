# K4K APP generation pricing — preview proposal (2026-11-02)

- Membership target: **£9.99 per month / 100 generation credits**. This is a product proposal; Stripe prices and existing subscriptions have NOT been changed.
- Standard Genjutsu Motion Transfer, 720p: **10 K4K credits per rounded-up source second**.
  - 4 seconds = 40 credits; 5 seconds = 50 credits; 10 seconds = 100 credits.
  - Above 10 seconds currently fails the **USD $7.00 provider-request ceiling** rather than submitting.
  - Undiscounted API list price of **USD $0.681 per started second**: 10 seconds = USD $6.81. This estimate excludes payment processing, VAT, foreign-exchange fluctuations, retries, storage, and provider pricing changes.
- No exchange-rate conversion is assumed by this module. A separate operating budget must use a conservative live FX rate and include VAT/payment fees before activation.
- Genjutsu Light is deliberately **not enabled or priced** by this server quote: its separate model requires its own tested adapter, actual account rate, request bounds and cost ceiling.
- Maximum provider cost is a **per-request bound only**, not a complete account-level spending limit. Monthly/provider account budgets, paid entitlement, insufficient-credit rejection, reconciliation, rate changes, and concurrency gates must still be enforced.
- Duration MUST come from trusted server media inspection. The browser must never supply the billable duration, approved model, or credit amount directly to the ledger.
- No API route imports the pricing module; no billable provider calls, migrations, credit grants, payment changes, or production deployment.

Reference pages (rates may change; recheck at release):
- https://open.higgsfield.ai/models/workflows/genjutsu/playground
- https://open.higgsfield.ai/models/higgsfield/genjutsu/object-swap/v1.0/api-reference

Activation prerequisites:
1. Verify exact provider model/720p charges using the authenticated account's current quote and contractual discount.
2. Set conservative server-side monthly cash spend, global in-flight spend, and per-user limits; reject requests when any cap is exhausted.
3. Validate SQL ledger in isolated real PostgreSQL with concurrent connections and security advisors.
4. Bind validated quote to the durable job and idempotency key, then add authenticated generation routes with ownership-verified media.
5. Validate completed media, retention and refund semantics with synthetic jobs; request approval for one real paid smoke test.
