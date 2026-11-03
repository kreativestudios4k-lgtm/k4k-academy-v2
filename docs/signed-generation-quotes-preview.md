# Signed generation quote tokens (preview only)

This change adds a small, server-only HMAC-SHA256 token primitive for a quote produced by the existing fail-closed model quote calculator. Tokens expire in two minutes by default (maximum five minutes), bind to an authenticated Supabase user UUID, and protect the model, resolution, duration, quoted credits, estimated provider cost and catalog quoteVersion from browser tampering.

**Not a payment authorization or a usable generation endpoint.** Nothing imports this primitive into a route yet. No secret is configured by this PR. A 32+ character high-entropy secret must be stored in preview server secrets, not shipped to the client. Rotate secrets and invalidate old quotes as needed.

## Required integration before enabling Generate
1. Authenticate user with Supabase getUser; use the server-returned user.id, never a client-supplied user ID.
2. Generate the quote using a *verified, server-side* model catalog; issue token on the server.
3. On reservation, verify token against authenticated user, then **recompute current server quote**. Require identical model/duration/resolution, credits, cost and quoteVersion; reject changes or expired catalogs. Never trust a token alone as proof of entitlement.
4. Check account entitlement, owned uploaded media bytes, provider limits and global spend ceiling.
5. Atomically reserve credits in the reviewed PostgreSQL ledger with a separate idempotency key. Token replay is not prevented by HMAC: idempotency and rate limits remain mandatory.
6. Reconcile provider failures and refund exactly once; do not activate until independent PostgreSQL concurrency tests pass.

## Verification
Local Node test command: `node --test tests/generation-quote-token.test.mjs`. Three tests passed locally against this module (signature tampering, user mismatch, expiration, malformed values). CI/Vercel build and integration remain separate gates.

Do not merge or deploy to production without authorization. No Stripe or billable provider call is performed here.
