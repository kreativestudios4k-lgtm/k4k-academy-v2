// Real multi-connection PostgreSQL regression tests for PR #15.
// Never point at Supabase or any shared/hosted database.
// Run only against a FRESH, disposable LOCAL database named
// k4k_generation_isolated_<suffix> with an admin/superuser connection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const connectionString = process.env.K4K_ISOLATED_POSTGRES_URL;
test('atomic credit ledger: real concurrent PostgreSQL connections', {
  skip: !connectionString && 'Set K4K_ISOLATED_POSTGRES_URL to a fresh local test database'
}, async t => {
  assert.equal(process.env.K4K_ALLOW_ISOLATED_POSTGRES_TEST, 'yes',
    'Explicit isolated-test confirmation required');
  const parsed = new URL(connectionString);
  assert.equal(parsed.protocol, 'postgresql:', 'PostgreSQL connection URL required');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname),
    'Remote/shared database connections are prohibited');
  const dbName = decodeURIComponent(parsed.pathname.slice(1));
  assert.match(dbName, /^k4k_generation_isolated_[a-z0-9_]+$/,
    'Use a dedicated disposable database with the required name');
  assert.ok(!parsed.searchParams.has('host'), 'Host override is prohibited');

  const pgModule = process.env.K4K_PG_MODULE
    ? await import(pathToFileURL(process.env.K4K_PG_MODULE).href)
    : await import('pg');
  const {Pool, Client} = pgModule.default || pgModule;
  const admin = new Client({connectionString});
  await admin.connect();
  const pool = new Pool({connectionString, max: 6, connectionTimeoutMillis: 5000});
  t.after(async () => {await pool.end(); await admin.end();});

  // Fail closed instead of dropping or rewriting any existing database objects.
  // Require a genuinely disposable database, not merely one missing our two
  // expected objects. Refuse to write if ANY user-defined relation exists.
  const preflight = await admin.query(
    "select (select count(*)::int from pg_class c join pg_namespace n " +
    "on n.oid=c.relnamespace where n.nspname not in " +
    "('pg_catalog','information_schema') and n.nspname !~ '^pg_toast' " +
    "and c.relkind in ('r','p','v','m','S','f')) as relation_count, " +
    "to_regnamespace('k4k_generation') as ledger_schema"
  );
  assert.equal(preflight.rows[0].relation_count, 0,
    'Refusing to modify a database containing user-defined relations');
  assert.equal(preflight.rows[0].ledger_schema, null, 'Ledger schema already exists');
  await admin.query(
    "do $$ begin " +
    "if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; " +
    "if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; " +
    "if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if; " +
    "end $$;"
  );
  await admin.query(
    "create table public.studio_credit_accounts(" +
    "user_id uuid primary key, balance integer not null check(balance>=0)," +
    "updated_at timestamptz not null default now())"
  );
  await admin.query("grant usage on schema public to service_role");
  await admin.query("grant select,update on public.studio_credit_accounts to service_role");
  const proposal = await readFile(new URL('../db/proposals/generation-credit-ledger.sql', import.meta.url), 'utf8');
  await admin.query(proposal);

  async function account(balance=100) {
    const id=randomUUID();
    await admin.query(
      'insert into public.studio_credit_accounts(user_id,balance) values($1,$2)',
      [id,balance]
    );
    return id;
  }
  async function withService(action) {
    const client=await pool.connect();
    try {
      await client.query('set role service_role');
      return await action(client);
    } finally {
      try {await client.query('reset role');} finally {client.release();}
    }
  }
  async function reserve(user,key,credits=30) {
    return withService(async c => (await c.query(
      'select public.k4k_generation_reserve($1::uuid,$2::uuid,$3::jsonb,$4::integer) as job',
      [user,key,JSON.stringify({model:'synthetic',reference:'owned/test'}),credits]
    )).rows[0].job);
  }
  async function balance(user) {
    return (await admin.query(
      'select balance from public.studio_credit_accounts where user_id=$1',[user]
    )).rows[0].balance;
  }
  async function ledgerCount(user,kind) {
    return Number((await admin.query(
      'select count(*)::int as n from k4k_generation.ledger l ' +
      'join k4k_generation.jobs j on j.id=l.job_id ' +
      'where j.user_id=$1 and l.kind=$2',[user,kind]
    )).rows[0].n);
  }
  const successful = results => results.filter(x=>x.status==='fulfilled');
  const rejected = results => results.filter(x=>x.status==='rejected');

  await t.test('two simultaneous distinct requests cannot overspend the account', async () => {
    const user=await account(100);
    const results=await Promise.allSettled([
      reserve(user,randomUUID(),70),reserve(user,randomUUID(),70)
    ]);
    assert.equal(successful(results).length,1);
    assert.equal(rejected(results).length,1);
    assert.equal(await balance(user),30);
    assert.equal(await ledgerCount(user,'reserve'),1);
  });

  await t.test('simultaneous retries with the same request key debit once', async () => {
    const user=await account(100),key=randomUUID();
    const results=await Promise.allSettled([
      reserve(user,key,40),reserve(user,key,40)
    ]);
    assert.equal(successful(results).length,2);
    assert.equal(results[0].value.id,results[1].value.id);
    assert.equal(await balance(user),60);
    assert.equal(await ledgerCount(user,'reserve'),1);
  });

  await t.test('reused request key with different price or input is rejected without another debit', async () => {
    const user=await account(100),key=randomUUID();
    await reserve(user,key,30);
    await assert.rejects(reserve(user,key,40), /Idempotency conflict/);
    await assert.rejects(withService(c=>c.query(
      'select public.k4k_generation_reserve($1::uuid,$2::uuid,$3::jsonb,$4::integer)',
      [user,key,JSON.stringify({model:'changed',reference:'owned/test'}),30]
    )), /Idempotency conflict/);
    assert.equal(await balance(user),70);
    assert.equal(await ledgerCount(user,'reserve'),1);
  });

  await t.test('unprivileged roles cannot reserve credits', async () => {
    const user=await account(100),key=randomUUID();
    for (const role of ['anon','authenticated']) {
      const client=await pool.connect();
      try {
        await client.query('set role '+role);
        await assert.rejects(client.query(
          'select public.k4k_generation_reserve($1::uuid,$2::uuid,$3::jsonb,$4::integer)',
          [user,key,JSON.stringify({model:'synthetic'}),30]
        ), /permission denied|Server only/i);
      } finally {
        try {await client.query('reset role');} finally {client.release();}
      }
    }
    assert.equal(await balance(user),100);
    assert.equal(await ledgerCount(user,'reserve'),0);
  });

  await t.test('three simultaneous jobs respect the two-active-job limit', async () => {
    const user=await account(100);
    const results=await Promise.allSettled([
      reserve(user,randomUUID(),10),
      reserve(user,randomUUID(),10),
      reserve(user,randomUUID(),10)
    ]);
    assert.equal(successful(results).length,2);
    assert.equal(rejected(results).length,1);
    assert.equal(await balance(user),80);
    assert.equal(await ledgerCount(user,'reserve'),2);
  });

  await t.test('two simultaneous terminal failures refund exactly once', async () => {
    const user=await account(100),job=await reserve(user,randomUUID(),35);
    const providerId='provider_'+job.id;
    const statusUrl='https://api.higgsfield.ai/requests/'+providerId+'/status';
    await withService(async c => {
      await c.query('select public.k4k_generation_submitting($1::uuid,$2::uuid)',[user,job.id]);
      await c.query('select public.k4k_generation_attach($1::uuid,$2::uuid,$3::text,$4::text)',
        [user,job.id,providerId,statusUrl]);
    });
    const settle=()=>withService(c=>c.query(
      'select public.k4k_generation_settle($1::uuid,$2::uuid,$3::text,$4::text,$5::text)',
      [user,job.id,providerId,'failed',null]
    ));
    const results=await Promise.allSettled([settle(),settle()]);
    assert.equal(successful(results).length,2);
    assert.equal(await balance(user),100);
    assert.equal(await ledgerCount(user,'refund'),1);
    assert.equal(await ledgerCount(user,'reserve'),1);
  });

  await t.test('provider attachment rejects malformed or mismatched handles without changing credits', async () => {
    const user=await account(100),job=await reserve(user,randomUUID(),25);
    await withService(c=>c.query(
      'select public.k4k_generation_submitting($1::uuid,$2::uuid)',[user,job.id]
    ));
    for (const [providerId,statusUrl] of [
      ['../invalid','https://api.higgsfield.ai/requests/../invalid/status'],
      ['valid_handle','https://attacker.example/requests/valid_handle/status']
    ]) {
      await assert.rejects(withService(c=>c.query(
        'select public.k4k_generation_attach($1::uuid,$2::uuid,$3::text,$4::text)',
        [user,job.id,providerId,statusUrl]
      )), /Invalid provider ID/);
    }
    assert.equal(await balance(user),75);
    assert.equal(await ledgerCount(user,'reserve'),1);
    assert.equal(await ledgerCount(user,'refund'),0);
  });

  await t.test('wrong user cannot read another account job', async () => {
    const owner=await account(),stranger=await account();
    const job=await reserve(owner,randomUUID(),15);
    await assert.rejects(withService(c=>c.query(
      'select public.k4k_generation_read($1::uuid,$2::uuid)',
      [stranger,job.id]
    )));
    assert.equal(await balance(owner),85);
    assert.equal(await balance(stranger),100);
  });
});
