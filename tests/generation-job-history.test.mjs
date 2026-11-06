import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {getOwnedJobHistory, parseHistoryQuery} from '../lib/server/generation-job-history.mjs';
import {JobStatusError} from '../lib/server/generation-job-status.mjs';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function row(i, user = OWNER) {
 return {
  id: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
  user_id: user,
  request_key: `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`,
  input: {reference: `owned/${i}.png`},
  credits: 30,
  state: 'completed',
  provider_id: `provider-${i}`,
  provider_status_url: `https://api.higgsfield.ai/requests/${i}/status`,
  provider_status: 'completed',
  output_url: `https://cdn.example/${i}.mp4`,
  created_at: `2026-11-06T00:00:0${i}Z`,
  updated_at: `2026-11-06T00:00:0${i}Z`,
 };
}

function fakeStore(rows) {
 const calls = [];
 return {calls, list: async (user, limit, before) => { calls.push({user, limit, before}); return rows; }};
}

test('defaults to 20 and returns public views only', async () => {
 const store = fakeStore([row(2), row(1)]);
 const page = await getOwnedJobHistory({store, userId: OWNER});
 assert.equal(store.calls[0].limit, 20);
 assert.equal(store.calls[0].before, null);
 assert.equal(page.jobs.length, 2);
 assert.equal(page.nextCursor, null);
 const serialised = JSON.stringify(page);
 for (const secret of ['owned/', 'provider-1', 'status_url', 'cdn.example', 'request_key']) {
  assert.equal(serialised.includes(secret), false, `leaked ${secret}`);
 }
});

test('rows belonging to another user are dropped even if the store returns them', async () => {
 const store = fakeStore([row(2), row(1, OTHER)]);
 const page = await getOwnedJobHistory({store, userId: OWNER});
 assert.deepEqual(page.jobs.map((j) => j.id), [row(2).id]);
});

test('full page yields a cursor equal to the last created_at', async () => {
 const store = fakeStore([row(3), row(2)]);
 const page = await getOwnedJobHistory({store, userId: OWNER, limit: '2'});
 assert.equal(page.nextCursor, row(2).created_at);
});

test('limit must be an integer between 1 and 50', () => {
 for (const bad of ['0', '51', '-1', '2.5', 'abc']) {
  assert.throws(() => parseHistoryQuery({limit: bad}), (e) => e.code === 'INVALID_LIMIT' && e.status === 400, bad);
 }
 assert.equal(parseHistoryQuery({limit: '50'}).limit, 50);
});

test('cursor must be a parseable timestamp and is normalised', () => {
 assert.throws(() => parseHistoryQuery({before: 'yesterday'}), (e) => e.code === 'INVALID_CURSOR');
 assert.equal(parseHistoryQuery({before: '2026-11-06T00:00:01Z'}).before, '2026-11-06T00:00:01.000Z');
});

test('missing or malformed user id is rejected before any store call', async () => {
 const store = fakeStore([]);
 await assert.rejects(getOwnedJobHistory({store, userId: undefined}), (e) => e instanceof JobStatusError && e.status === 401);
 await assert.rejects(getOwnedJobHistory({store, userId: 'x'}), (e) => e.status === 401);
 assert.equal(store.calls.length, 0);
});

// Database check: runs the review SQL against PGlite when K4K_PGLITE_MODULE points
// at an installed PGlite dist/index.js. Skipped otherwise; it is not run by default.
const PGLITE = process.env.K4K_PGLITE_MODULE;
test('SQL history RPC is owner-scoped, newest-first, bounded and service-only', {skip: !PGLITE}, async () => {
 const {PGlite} = await import(pathToFileURL(PGLITE).href);
 const ledger = await readFile(new URL('../db/proposals/generation-credit-ledger.sql', import.meta.url), 'utf8');
 const history = await readFile(new URL('../db/proposals/generation-job-history.sql', import.meta.url), 'utf8');
 const a = OWNER, b = OTHER;
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create table public.studio_credit_accounts(user_id uuid primary key,balance integer not null check(balance>=0),updated_at timestamptz default now());
   grant select,update on public.studio_credit_accounts to service_role;
   insert into public.studio_credit_accounts values('${a}',100,now()),('${b}',100,now());`);
  await db.exec(ledger);
  await db.exec(history);
  await db.exec('set role service_role');
  const key = (n) => `55555555-5555-4555-8555-${String(n).padStart(12, '0')}`;
  await db.query('select public.k4k_generation_reserve($1,$2,$3,$4)', [a, key(1), {m: 'x'}, 10]);
  await db.query('select public.k4k_generation_reserve($1,$2,$3,$4)', [a, key(2), {m: 'y'}, 10]);
  await db.query('select public.k4k_generation_reserve($1,$2,$3,$4)', [b, key(3), {m: 'z'}, 10]);

  const list = async (user, limit, before) =>
   (await db.query('select public.k4k_generation_list($1,$2,$3) as r', [user, limit, before])).rows[0].r;

  const all = await list(a, 50, null);
  assert.equal(all.length, 2, 'only owner rows');
  assert.ok(all.every((j) => j.user_id === a));
  assert.ok(all[0].created_at >= all[1].created_at, 'newest first');

  const first = await list(a, 1, null);
  assert.equal(first.length, 1);
  const second = await list(a, 1, first[0].created_at);
  assert.equal(second.length, 1);
  assert.notEqual(second[0].id, first[0].id);

  await assert.rejects(list(a, 0, null));
  await assert.rejects(list(a, 51, null));

  for (const role of ['anon', 'authenticated']) {
   await db.exec(`reset role; set role ${role}`);
   await assert.rejects(db.query('select public.k4k_generation_list($1,$2,$3)', [a, 10, null]));
  }
 } finally {
  await db.close();
 }
});
