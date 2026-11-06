import test from 'node:test';
import assert from 'node:assert/strict';
import {getOwnedJobStatus, toPublicJob, JobStatusError} from '../lib/server/generation-job-status.mjs';
import {createGenerationStore} from '../lib/server/generation-store.mjs';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const JOB = '33333333-3333-4333-8333-333333333333';

const row = {
 id: JOB,
 user_id: OWNER,
 request_key: '44444444-4444-4444-8444-444444444444',
 input: {reference: 'owned/private.png', prompt: 'secret'},
 credits: 30,
 state: 'in_progress',
 provider_id: 'provider-abc',
 provider_status_url: 'https://api.higgsfield.ai/requests/provider-abc/status',
 provider_status: 'processing',
 output_url: null,
 created_at: '2026-11-06T00:00:00Z',
 updated_at: '2026-11-06T00:01:00Z',
};

function fakeStore(result) {
 const calls = [];
 return {calls, read: async (user, job) => { calls.push([user, job]); return typeof result === 'function' ? result(user, job) : result; }};
}

test('owner receives a public view without provider handles, inputs or URLs', async () => {
 const store = fakeStore(row);
 const job = await getOwnedJobStatus({store, userId: OWNER, jobId: JOB});
 assert.deepEqual(job, {
  id: JOB, state: 'in_progress', credits: 30, providerStatus: 'processing',
  outputReady: false, createdAt: row.created_at, updatedAt: row.updated_at,
 });
 const serialised = JSON.stringify(job);
 for (const secret of ['provider-abc', 'status_url', 'owned/private', 'secret', 'request_key', OWNER]) {
  assert.equal(serialised.includes(secret), false, `leaked ${secret}`);
 }
});

test('another user’s job is reported as not found', async () => {
 const store = fakeStore(row);
 await assert.rejects(getOwnedJobStatus({store, userId: OTHER, jobId: JOB}),
  (e) => e instanceof JobStatusError && e.code === 'JOB_NOT_FOUND' && e.status === 404);
});

test('missing job is reported as not found', async () => {
 const store = fakeStore(null);
 await assert.rejects(getOwnedJobStatus({store, userId: OWNER, jobId: JOB}),
  (e) => e.code === 'JOB_NOT_FOUND' && e.status === 404);
});

test('malformed job id is rejected before any store call', async () => {
 const store = fakeStore(row);
 await assert.rejects(getOwnedJobStatus({store, userId: OWNER, jobId: 'not-a-uuid'}),
  (e) => e.code === 'INVALID_JOB_ID' && e.status === 400);
 assert.equal(store.calls.length, 0);
});

test('missing or malformed user id is rejected before any store call', async () => {
 const store = fakeStore(row);
 await assert.rejects(getOwnedJobStatus({store, userId: undefined, jobId: JOB}), (e) => e.status === 401);
 await assert.rejects(getOwnedJobStatus({store, userId: 'x', jobId: JOB}), (e) => e.status === 401);
 assert.equal(store.calls.length, 0);
});

test('completed job exposes outputReady but not the output URL', () => {
 const view = toPublicJob({...row, state: 'completed', provider_status: 'completed', output_url: 'https://cdn.example/out.mp4'});
 assert.equal(view.outputReady, true);
 assert.equal(JSON.stringify(view).includes('out.mp4'), false);
});

test('store read maps "Job not found" to null and rethrows real failures', async () => {
 const notFound = createGenerationStore({rpc: async () => ({data: null, error: {message: 'Job not found'}})});
 assert.equal(await notFound.read(OWNER, JOB), null);

 const outage = createGenerationStore({rpc: async () => ({data: null, error: {message: 'connection reset'}})});
 await assert.rejects(outage.read(OWNER, JOB), /Generation store operation failed/);
});
