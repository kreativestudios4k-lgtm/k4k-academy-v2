import test from 'node:test';
import assert from 'node:assert/strict';
import {getOwnedJobStatus, toPublicJob, JobStatusError} from '../lib/server/generation-job-status.mjs';
import {createGenerationStore} from '../lib/server/generation-store.mjs';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const JOB = '33333333-3333-4333-8333-333333333333';

// Shape of public.studio_generation_jobs, with the sensitive columns included
// so the tests can prove they never reach the response.
const row = {
 id: JOB,
 user_id: OWNER,
 template_id: 'studio-pilot-image-to-video',
 provider: 'higgsfield',
 model: 'bytedance/seedance-2.5/image-to-video',
 status: 'processing',
 credits_reserved: 0,
 error_message: null,
 created_at: '2026-11-06T00:00:00Z',
 updated_at: '2026-11-06T00:01:00Z',
 prompt: 'secret prompt text',
 reference_paths: [`${OWNER}/private.png`],
 output_path: 'https://cdn.example/out.mp4',
 provider_job_id: 'provider-abc',
};

function fakeStore(result) {
 const calls = [];
 return {calls, read: async (user, job) => { calls.push([user, job]); return typeof result === 'function' ? result(user, job) : result; }};
}

test('owner receives a public view without prompt, paths, provider IDs or output URLs', async () => {
 const store = fakeStore(row);
 const job = await getOwnedJobStatus({store, userId: OWNER, jobId: JOB});
 assert.deepEqual(job, {
  id: JOB,
  status: 'processing',
  templateId: 'studio-pilot-image-to-video',
  provider: 'higgsfield',
  model: 'bytedance/seedance-2.5/image-to-video',
  creditsReserved: 0,
  outputReady: false,
  error: null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
 });
 const serialised = JSON.stringify(job);
 for (const secret of ['secret prompt', 'private.png', 'cdn.example', 'provider-abc', OWNER]) {
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

test('completed job reports outputReady without exposing the output path', () => {
 const view = toPublicJob({...row, status: 'completed', output_path: 'https://cdn.example/out.mp4'});
 assert.equal(view.outputReady, true);
 assert.equal(JSON.stringify(view).includes('out.mp4'), false);
});

test('failed job exposes its sanitised error message only', () => {
 const view = toPublicJob({...row, status: 'failed', error_message: 'Generation failed'});
 assert.equal(view.error, 'Generation failed');
 assert.equal(toPublicJob({...row, status: 'processing', error_message: 'internal'}).error, null);
});

test('generation store read maps "Job not found" to null and rethrows real failures', async () => {
 const notFound = createGenerationStore({rpc: async () => ({data: null, error: {message: 'Job not found'}})});
 assert.equal(await notFound.read(OWNER, JOB), null);

 const outage = createGenerationStore({rpc: async () => ({data: null, error: {message: 'connection reset'}})});
 await assert.rejects(outage.read(OWNER, JOB), /Generation store operation failed/);
});
