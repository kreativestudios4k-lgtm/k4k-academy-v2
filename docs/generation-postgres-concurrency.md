# Real PostgreSQL concurrency gate (isolated only)

This adds a **real multi-connection PostgreSQL** test suite for the credit ledger staged in PR #15. PGlite's single-process SQL tests do not prove lock behavior across separate connections.

## Safety

- The suite refuses remote database hosts and requires a **fresh, disposable local** database named `k4k_generation_isolated_<suffix>`.
- It refuses to run unless `K4K_ALLOW_ISOLATED_POSTGRES_TEST=yes` is explicitly set.
- It verifies the credit table and generation schema are absent **before creating anything**. It never drops or truncates tables.
- It uses only synthetic users, provider handles and media. It does **not** call Higgsfield, Stripe, Supabase, or Vercel.
- The PostgreSQL test user must be an administrator able to create test roles. Run in a local disposable PostgreSQL container, not in Supabase.
- Tests leave the disposable database intact for inspection. Destroy the local test database/container afterwards; create a fresh one for each rerun.

## Run

Start a local PostgreSQL 15+ instance and create a new database with a name like `k4k_generation_isolated_run1`. Then install `pg` in an isolated temporary folder (not in the application dependency tree), or install it in the local worktree.

```sh
npm install --prefix /tmp/k4k-pg-validation --ignore-scripts --save-exact pg@8.16.3
export K4K_PG_MODULE=/tmp/k4k-pg-validation/node_modules/pg/lib/index.js
export K4K_ISOLATED_POSTGRES_URL='postgresql://postgres:LOCAL_PASSWORD@127.0.0.1:5432/k4k_generation_isolated_run1'
export K4K_ALLOW_ISOLATED_POSTGRES_TEST=yes
node --test tests/generation-postgres-concurrency.test.mjs
```

Do not paste the database password into logs or commit it. `K4K_PG_MODULE` may be omitted when `pg` is installed locally.

## Assertions

1. Two concurrent requests costing 70 credits each cannot spend more than the initial 100-credit balance.
2. Two simultaneous retries with the same idempotency key debit only once and return the same job.
3. Three simultaneous requests obey the two-active-job limit.
4. Concurrent terminal failures refund exactly once.
5. A second user cannot read the first user's job.
6. Reusing a request key with changed credits or input fails without another debit.
7. Anonymous and authenticated roles cannot call the server-only reservation function.
8. Malformed provider handles or mismatched status origins cannot be attached to a reserved job or alter its credits.

The seven scenarios include concurrent spending and refunds, idempotency conflicts, and role-denial checks. The tests use independent `pg` pool connections and the real SQL proposal, with no fake ledger or in-memory lock. They intentionally **do not** activate generation. Running them successfully is necessary but not sufficient for release: the hosted migration still needs review, provider pricing and ownership verification, authenticated routes, bounded reconciliation, and a separate explicitly authorized live smoke test.

If `K4K_ISOLATED_POSTGRES_URL` is absent, Node marks this test as **skipped**. A skip is **not a passing concurrency validation**.

Safety hardening: the harness now refuses to initialize if any user-defined relation already exists in the target database, rather than checking only the credit-account table. This is still not a substitute for a dedicated disposable local PostgreSQL instance.
