#!/usr/bin/env python3
"""K4K credit-ledger concurrency integration test (disposable PostgreSQL ONLY).

Run with: K4K_TEST_DATABASE_URL=postgresql://... python3 tests/integration/test_credit_concurrency.py
Requires psycopg 3 and a dedicated disposable database. Never use Academy production.
This test intentionally creates an isolated schema and disposable users/jobs rather than
touching existing auth.users, customer balances, or real provider calls.
"""
import os, sys, uuid
from urllib.parse import urlsplit, unquote
from concurrent.futures import ThreadPoolExecutor
try:
    import psycopg
except ImportError:
    sys.exit("BLOCKED: install psycopg[binary] in an isolated test environment")

url = os.getenv("K4K_TEST_DATABASE_URL")
if not url:
    sys.exit("BLOCKED (NOT PASSED): K4K_TEST_DATABASE_URL not set")
if os.getenv("K4K_DISPOSABLE_DATABASE_CONFIRMED") != "YES":
    sys.exit("BLOCKED: set K4K_DISPOSABLE_DATABASE_CONFIRMED=YES after verifying the target is disposable")
# Refuse shared/production-looking endpoints even if confirmation was accidentally set.
# The database name must be purpose-created and the host must be local.
parsed = urlsplit(url)
db_name = unquote(parsed.path.lstrip("/"))
host = (parsed.hostname or "").lower()
if parsed.scheme not in ("postgres", "postgresql") or not db_name.startswith("k4k_test_"):
    sys.exit("BLOCKED: database must be explicitly named k4k_test_*")
if host not in ("localhost", "127.0.0.1", "::1"):
    sys.exit("BLOCKED: only a local disposable PostgreSQL host is allowed")
schema = "k4k_test_" + uuid.uuid4().hex[:12]
with psycopg.connect(url, autocommit=True) as conn:
    conn.execute(f'CREATE SCHEMA "{schema}"')
try:
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(f'''CREATE TABLE "{schema}".accounts (user_id uuid primary key, balance int not null check(balance>=0))''')
        conn.execute(f'''CREATE TABLE "{schema}".jobs (id uuid primary key, user_id uuid not null, status text not null, reserved int not null default 0)''')
        conn.execute(f'''CREATE TABLE "{schema}".ledger (job_id uuid not null, event text not null, amount int not null, unique(job_id,event))''')
        conn.execute(f'''CREATE FUNCTION "{schema}".reserve(p_user uuid,p_job uuid,p_amount int) RETURNS boolean
        LANGUAGE plpgsql AS $$
        DECLARE j record;
        BEGIN
          IF p_amount<=0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
          SELECT * INTO j FROM "{schema}".jobs WHERE id=p_job AND user_id=p_user FOR UPDATE;
          IF NOT FOUND THEN RAISE EXCEPTION 'not owned'; END IF;
          IF j.status<>'draft' OR j.reserved<>0 THEN RETURN false; END IF;
          UPDATE "{schema}".accounts SET balance=balance-p_amount
          WHERE user_id=p_user AND balance>=p_amount;
          IF NOT FOUND THEN RETURN false; END IF;
          INSERT INTO "{schema}".ledger VALUES (p_job,'reserve',p_amount);
          UPDATE "{schema}".jobs SET status='queued',reserved=p_amount WHERE id=p_job;
          RETURN true;
        END $$''')
        conn.execute(f'''CREATE FUNCTION "{schema}".refund(p_job uuid) RETURNS boolean
        LANGUAGE plpgsql AS $$
        DECLARE j record;
        BEGIN
          SELECT * INTO j FROM "{schema}".jobs WHERE id=p_job FOR UPDATE;
          IF NOT FOUND THEN RAISE EXCEPTION 'missing job'; END IF;
          IF j.status NOT IN ('failed','cancelled') OR j.reserved<=0 THEN RETURN false; END IF;
          IF EXISTS(SELECT 1 FROM "{schema}".ledger WHERE job_id=p_job AND event='refund') THEN RETURN false; END IF;
          INSERT INTO "{schema}".ledger VALUES(p_job,'refund',j.reserved);
          UPDATE "{schema}".accounts SET balance=balance+j.reserved WHERE user_id=j.user_id;
          IF NOT FOUND THEN RAISE EXCEPTION 'missing account'; END IF;
          RETURN true;
        END $$''')
    user, outsider = uuid.uuid4(), uuid.uuid4()
    jobs = [uuid.uuid4() for _ in range(12)]
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(f'INSERT INTO "{schema}".accounts VALUES (%s,10)',(user,))
        for job in jobs:
            conn.execute(f'INSERT INTO "{schema}".jobs(id,user_id,status) VALUES(%s,%s,%s)',(job,user,'draft'))
    def reserve(job,who=user):
        with psycopg.connect(url) as conn:
            result=conn.execute(f'SELECT "{schema}".reserve(%s,%s,%s)',(who,job,7)).fetchone()[0]
            conn.commit()
            return result
    with ThreadPoolExecutor(max_workers=12) as pool:
        results=list(pool.map(reserve,jobs))
    assert sum(results)==1, f"overspend or missing reserve: {results}"
    winning_job=jobs[results.index(True)]
    assert reserve(winning_job) is False, "duplicate reserve succeeded"
    try:
        reserve(winning_job,outsider)
        raise AssertionError("cross-user reserve succeeded")
    except psycopg.errors.RaiseException:
        pass
    with psycopg.connect(url,autocommit=True) as conn:
        balance=conn.execute(f'SELECT balance FROM "{schema}".accounts WHERE user_id=%s',(user,)).fetchone()[0]
        assert balance==3, balance
        conn.execute(f'UPDATE "{schema}".jobs SET status=%s WHERE id=%s',('failed',winning_job))
    def refund(_):
        with psycopg.connect(url) as conn:
            result=conn.execute(f'SELECT "{schema}".refund(%s)',(winning_job,)).fetchone()[0]
            conn.commit()
            return result
    with ThreadPoolExecutor(max_workers=8) as pool:
        refunds=list(pool.map(refund,range(8)))
    assert sum(refunds)==1, f"duplicate refund: {refunds}"
    with psycopg.connect(url,autocommit=True) as conn:
        assert conn.execute(f'SELECT balance FROM "{schema}".accounts WHERE user_id=%s',(user,)).fetchone()[0]==10
        assert conn.execute(f'SELECT count(*) FROM "{schema}".ledger WHERE job_id=%s',(winning_job,)).fetchone()[0]==2
    print("PASS: concurrent overspend, idempotent reservation, cross-user rejection, concurrent refunds, ledger and balance")
finally:
    with psycopg.connect(url,autocommit=True) as conn:
        conn.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
