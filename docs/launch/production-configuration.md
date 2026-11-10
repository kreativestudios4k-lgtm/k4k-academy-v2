# Production configuration — prepared, not activated

No live keys/prices are inferred from TEST objects. A separate production deploy and owner approval remain necessary.

Server-only credentials: HF_CREDENTIALS (complete copied opaque key), SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY (live only after approval), STRIPE_WEBHOOK_SECRET (matching the production destination).

Required production switches, OFF until approval:
- K4K_LIVE_PAYMENTS_ENABLED=true
- K4K_ENABLE_PRODUCTION_GENERATION=true
- K4K_PROVIDER_USE_APPROVED=true (only after provider confirmation)
- HIGGSFIELD_GENJUTSU_ENABLED=true
- K4K_CUSTOMER_CREDIT_PRICING_APPROVED=true
- K4K_PROVIDER_USD_PER_CREDIT=0.10
- K4K_GENERATION_MAX_USD=5 (initial per-job limit)
- K4K_TOPUPS_ENABLED=true
- K4K_STRIPE_TAX_READY=true (only after active registration and a successful calculation)

K4K_LIVE_PLAN_PRICES_JSON must map starter/creator/pro/studio → GBP/EUR/USD/BRL → live price IDs. K4K_LIVE_PACK_PRICES_JSON must map boost20/boost50/boost100 similarly. Missing maps fail closed. No TEST IDs may be reused for live payment.

Owner confirmed UK VAT registration and VAT added at checkout. Pack products use the owner-selected Cloud AI for Individuals category. Stripe TEST VAT registration was refused until Stripe Tax is activated in the dashboard. Do not enable automatic-tax readiness before that is resolved and verified. No live tax registration was created.

Higgsfield funding: proposed USD100 manual API balance; auto top-up off. Funding/account balance is not verified and no top-up was purchased. Per-job cap does not imply an account-wide monthly budget. Provider prepaid balance is separate from K4K/Stripe credits.

Webhook destination: /api/billing/webhook. Subscribe to checkout.session.completed, checkout.session.async_payment_succeeded, customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed, charge.refunded, charge.dispute.created. The K4K TEST destination was updated on 10 November to candidate c144c920 with these events, following the request to complete customer testing. Other destinations and all live settings remain unchanged. Real signed event delivery still needs verification.

All database additions are additive. Subscription invoice application, credits and processed receipts use one RPC transaction. Top-ups deduplicate by Checkout Session, not merely event ID. Refunds revoke credits once; spent-credit reversals and disputes hold further generation for support review. Existing accounts/subscriptions are not reset.
