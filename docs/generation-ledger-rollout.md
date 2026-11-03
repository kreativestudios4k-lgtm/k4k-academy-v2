# Credit ledger implementation — staged, not activated

`db/proposals/generation-credit-ledger.sql` is a review proposal, not an applied migration. No production records or balances have been changed. The SQL creates new private job/ledger tables and service-role-only SECURITY INVOKER RPCs, using the existing credit account table only when a reservation/refund is explicitly invoked.

Implemented:
- Account row lock before job row lock for every mutation; reserve debit and ledger entry in the same transaction.
- Stable per-user request key; reusing it with a different payload or price is rejected.
- Two active jobs per user. This is a staged concurrency ceiling, not an approved pricing policy or provider currency-spend cap.
- Persisted provider IDs and validated polling URLs; same durable job ID for submission retries.
- Server-only completion and one refund per failed/moderated/canceled job. Terminal conflicts are rejected.
- Timeout/unknown outcome remains reserved. No false automatic refund. Polling failure also leaves state intact.
- New tables are isolated from the old user-callable pilot completion function.
- The coordinator + store adapter connect reserve, submit, durable handle persistence, polling and settlement. No HTTP route imports them yet.

Validation uses an isolated PGlite PostgreSQL runtime with synthetic roles and accounts. This exercises SQL privileges, transactions and state transitions but DOES NOT prove multi-connection concurrency/locking behavior. Real concurrent PostgreSQL testing remains required before release.

Reproduce (outside application dependencies):
```sh
npm install --prefix /tmp/k4k-ledger-validation --ignore-scripts --save-exact @electric-sql/pglite@0.3.14
K4K_PGLITE_MODULE=/tmp/k4k-ledger-validation/node_modules/@electric-sql/pglite/dist/index.js node --test tests/*.test.mjs
npm run build
```

Remaining activation work:
1. Turn the reviewed SQL into a migration using the Supabase CLI, validate with real concurrent connections in an isolated database and run advisors. Verify service_role has SELECT/UPDATE on existing credit accounts. Do not apply to the shared live database as a test.
2. Confirm approved model price and provider monetary budget caps. Derive price on the server; never trust a browser credit amount. No credits are minted by this SQL.
3. Implement authenticated HTTP routes: validate user with Supabase getUser, derive user ID from that result, check paid access, validate owned storage paths and server-inspected media, and create a separate service-role client only on the server. Never return credentials.
4. Wire private upload/status/history UI, approved media origins and safe retention of output in owned storage. Signed media URLs must remain the same on ambiguous retries; their lifetime must cover queue/reconciliation, not just upload.
5. Implement bounded retries/reconciliation and administrative recovery for reserved/submitting jobs. Definitive provider rejection before acceptance needs a reviewed release path; this version deliberately keeps unresolved reservations for reconciliation rather than guessing.
6. Apply only after the live database change is explicitly reviewed; verify migrations/advisors, then run one authorized provider smoke test. Do not change existing subscriptions or payments.
