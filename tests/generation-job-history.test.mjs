import test from 'node:test';
import assert from 'node:assert/strict';
import {getOwnedJobHistory, parseHistoryQuery} from '../lib/server/generation-job-history.mjs';
import {createStudioReadStore} from '../lib/server/studio-job-reader.mjs';
import {JobStatusError} from '../lib/server/generation-job-status.mjs';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function row(i, user = OWNER) {
 return {
  id: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
  user_id: user,
  template_id: 'studio-pilot-image-to-video',
  provider: 'higgsfield',
  model: 'bytedance/seedance-2.5/image-to-video',
  status: 'completed',
  credits_reserved: 0,
  error_message: null,
  created_at: `2026-11-06T00:00:0${i}Z`,
  updated_at: `2026-11-06T00:00:0${i}Z`,
  prompt: `secret prompt ${i}`,
  reference_paths: [`${user}/${i}.png`],
  output_path: `https://cdn.example/${i}.mp4`,
  provider_job_id: `provider-${i}`,
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
 for (const secret of ['secret prompt', 'owned/', 'cdn.example', 'provider-1', OWNER]) {
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

// The studio reader must always filter by user_id, because the service-role client bypasses RLS.
// This fake applies eq, lt, order and limit in JavaScript so the filters are exercised, not assumed.
function fakeSupabase(rows, {error = null} = {}) {
 const filters = [];
 const from = () => {
  const state = {predicates: [], orders: [], limit: null, columns: null};
  const builder = {
   select(columns) { state.columns = columns; return builder; },
   eq(column, value) { filters.push(['eq', column]); state.predicates.push((r) => r[column] === value); return builder; },
   lt(column, value) { filters.push(['lt', column]); state.predicates.push((r) => r[column] < value); return builder; },
   order(column, {ascending = true} = {}) { state.orders.push([column, ascending]); return builder; },
   limit(n) { state.limit = n; return builder; },
   async maybeSingle() {
    if (error) return {data: null, error};
    const hit = rows.filter((r) => state.predicates.every((p) => p(r)));
    return {data: hit[0] ?? null, error: null};
   },
   then(resolve) {
    if (error) return resolve({data: null, error});
    let hit = rows.filter((r) => state.predicates.every((p) => p(r)));
    for (const [column, ascending] of [...state.orders].reverse()) {
     hit = [...hit].sort((x, y) => (x[column] < y[column] ? -1 : x[column] > y[column] ? 1 : 0) * (ascending ? 1 : -1));
    }
    if (state.limit !== null) hit = hit.slice(0, state.limit);
    return resolve({data: hit, error: null});
   },
  };
  return builder;
 };
 return {client: {from}, filters};
}

test('studio reader read() filters by both user_id and id, and hides other users’ jobs', async () => {
 const {client, filters} = fakeSupabase([row(1)]);
 const store = createStudioReadStore(client);
 assert.deepEqual(await store.read(OWNER, row(1).id), row(1));
 assert.equal(await store.read(OTHER, row(1).id), null);
 assert.ok(filters.some(([op, col]) => op === 'eq' && col === 'user_id'));
 assert.ok(filters.some(([op, col]) => op === 'eq' && col === 'id'));
});

test('studio reader list() is owner-only, newest first, bounded, and honours the cursor', async () => {
 const {client} = fakeSupabase([row(1), row(2), row(3), row(1, OTHER)]);
 const store = createStudioReadStore(client);
 const all = await store.list(OWNER, 50, null);
 assert.deepEqual(all.map((r) => r.id), [row(3).id, row(2).id, row(1).id]);
 const firstPage = await store.list(OWNER, 1, null);
 assert.equal(firstPage[0].id, row(3).id);
 const next = await store.list(OWNER, 1, row(3).created_at);
 assert.equal(next[0].id, row(2).id);
});

test('studio reader turns a database failure into a generic error', async () => {
 const store = createStudioReadStore(fakeSupabase([], {error: {message: 'boom'}}).client);
 await assert.rejects(store.read(OWNER, row(1).id), /Generation store operation failed/);
 await assert.rejects(store.list(OWNER, 10, null), /Generation store operation failed/);
});

test('studio reader refuses to load in a browser context', () => {
 const previous = globalThis.window;
 globalThis.window = {};
 try {
  assert.throws(() => createStudioReadStore({}), /Server only/);
 } finally {
  if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
 }
});
