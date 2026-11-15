# Brazilian Pix: immediate one-time payment and manual renewal

## Behavior

When `K4K_MANUAL_PIX_ENABLED=true` and `K4K_MANUAL_PIX_SCHEMA_READY=true`, the BRL plans page offers Pix (one-time, manual renewal) and the existing recurring card checkout. Card checkout excludes new Pix Automático mandates in this mode. Existing card/Pix subscriptions and already-open checkout sessions remain untouched.

Pix uses Checkout `mode=payment`, Pix only, the existing verified product and the approved BRL plan amount as a one-time tax-inclusive inline price. There is no recurring price, subscription, `setup_future_usage`, saved mandate or automatic debit. Stripe Tax remains enabled; provider-disclosed cross-border IOF remains separate. Discount/referral attribution is not enabled for manual Pix; coupons remain available on the existing card path.

The user must authenticate, be in the trusted Brazilian region and have no conflicting live subscription or checkout. A reserved order, stable Stripe idempotency key and provider re-read protect retries. Expired sessions are released only after Stripe reports expiry. Ambiguous submissions keep their reservation and require reconciliation; they never create a fresh payment automatically.

The webhook re-reads the session with expanded line items and successful PaymentIntent/charge. It validates owner, order, Test/Live, source-price snapshot, product, quantity, exact amount, inclusive tax and actual Pix funds. The SQL transaction records the real session/intent, credits and event together, once per order. Reconciliation uses an explicitly named internal marker, the same verification and the same transaction. A redirect, unpaid QR code, bank authorization or pending intent cannot grant credits.

Live purchases credit only `k4k_live_credit_accounts`; Test purchases credit only `studio_credit_accounts`. No manual purchase writes subscription memberships or fabricates a subscription/invoice. Refunds remove only verified cumulative deltas; spent-credit debt or disputes block generation for review. A refund detected before fulfillment prevents automatic delivery and requires review; it is not treated as a clean paid purchase. Dispute closure/reversal does not automatically release holds.

A paid period is one calendar month from the successful charge timestamp (UTC). A second manual purchase is refused while that period remains active. Account shows the period end and renewal link once due. Unused credits carry over. Reminders are in-app only; no email scheduler or email delivery has been configured.

## Funding and preservation

Manual and card admission share the same Postgres advisory lock, seat count and credit commitment cap. Paid manual commitments remain counted conservatively, including consumed/refunded credits, until funding is explicitly reallocated. Monthly repurchase can fail closed if capacity is not funded. Do not sell more credits by increasing caps without provider funds. Existing renewal funding holds remain unchanged.

## Rollout

1. Review `docs/sql/brazil-manual-pix-review.sql`. Apply to an isolated database and run `tests/manual-pix-postgres.test.mjs` first. The SQL adds a new RLS-protected order table and service-only RPCs; it also updates card admission to count manual commitments. No existing row is deleted, converted or credited by the schema change.
2. Apply the additive schema to the intended Supabase project only after those checks. Keep production manual Pix flags disabled. Set the schema-ready flag only where the schema is actually applied.
3. Enable the two manual Pix flags only on a dedicated Preview branch with a Test Stripe key, the correct Test webhook secret, existing Test tax setup and public production-generation/payment switches left unchanged.
4. Subscribe the K4K endpoint to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, and `charge.dispute.created`, preserving all existing subscriptions/events and Academy endpoints. The handler keeps processing previously paid orders when new purchases are disabled.
5. Complete an authenticated sandbox test with Pix simulation: buy once, verify exact wallet delta, replay and reconcile without duplicate grant, test failure and expiry, test wrong-owner rejection, inspect account manual-renewal date and confirm no Stripe subscription or mandate was created. Do not re-use or charge existing paid QA transactions.
6. Review Preview and obtain owner approval for a production code release and manual-Pix flag activation. Do not convert/cancel existing customer subscriptions or pending payments. Production rollout and real bank payment acceptance are separate from local tests.

Rollback: disable `K4K_MANUAL_PIX_ENABLED` to close new Pix purchases. Retain schema, order records, event receipts and existing payment processing. Do not roll back to a webhook version that ignores already-created manual Pix orders.

## Dedicated Test webhook

The manual-Pix Preview uses `K4K_MANUAL_PIX_TEST_ONLY=true` and its own Test endpoint/signing secret. After signature verification, unrelated Academy, subscription and QA events return 200 without changing any receipt or financial row. Disputes resolve their actual Test charge before checking the manual-Pix marker. The existing QA endpoint is preserved and must not be repointed or disabled for this flow. Production never uses this Test-only filter.
