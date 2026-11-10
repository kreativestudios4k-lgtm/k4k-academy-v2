// End-to-end tests of the customer generation flow against a mocked provider
// and an in-memory database that mirrors the deployed reservation functions.
// No network request and no billable call is made anywhere in this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationService, GenerationError} from '../lib/server/generation-service.mjs';
import {getGenerationConfig} from '../lib/server/generation-config.mjs';
import {createHiggsfieldMotionClient} from '../lib/server/higgsfield-motion-client.mjs';
import {createFakeBackend, createFakeProvider, READY_ENV, USER, OTHER, CREDENTIAL} from './helpers/fake-generation-backend.mjs';

const KEY = '33333333-3333-4333-8333-333333333333';
const KEY2 = '44444444-4444-4444-8444-444444444444';

function setup({env = READY_ENV, backend = {}, provider = {}} = {}) {
  const b = createFakeBackend(backend);
  const p = createFakeProvider(provider);
  const config = getGenerationConfig(env);
  const providerClient = config.credentials ? createHiggsfieldMotionClient({credentials: config.credentials, fetchImpl: p.fetchImpl}) : null;
  const events = [];
  const service = createGenerationService({admin: b.admin, providerClient, config, fetchImpl: p.fetchImpl, log: (event, detail) => events.push({event, detail})});
  return {b, p, service, events, jobId: b.addDraft()};
}
const rejects = (promise, code, status) => assert.rejects(promise, error => {
  assert.ok(error instanceof GenerationError, 'expected GenerationError, got ' + error?.message);
  assert.equal(error.code, code); if (status) assert.equal(error.status, status); return true;
});

test('submit: verified media -> server price -> estimate -> one reservation -> one provider request -> saved provider ID', async () => {
  const {b, p, service, jobId} = setup();
  const result = await service.submit({userId: USER, jobId, requestKey: KEY, resolution: '720p'});
  assert.deepEqual({status: result.status, credits: result.creditsReserved, replayed: result.replayed}, {status: 'processing', credits: 30, replayed: false}); // 6 s x 5
  assert.equal(b.balance(), 70);
  assert.equal(b.reservation(jobId).status, 'reserved');
  assert.deepEqual({status: b.job(jobId).status, provider: b.job(jobId).provider_job_id}, {status: 'processing', provider: 'req_abc123'});
  assert.equal(p.estimates(), 1); assert.equal(p.submissions(), 1);
  const submitCall = p.log.find(c => c.headers['Idempotency-Key']);
  assert.equal(submitCall.url, 'https://api.higgsfield.ai/higgsfield/genjutsu/motion-transfer/v1.0');
  assert.equal(submitCall.headers['Idempotency-Key'], jobId);
  assert.equal(submitCall.headers.Authorization, 'Key ' + CREDENTIAL); // credential passed through whole
  assert.equal(submitCall.redirect, 'error');
  assert.deepEqual(Object.keys(submitCall.body).sort(), ['image_urls', 'prompt', 'resolution', 'video_url']);
  assert.equal(submitCall.body.image_urls.length, 2);
  assert.ok(submitCall.body.video_url.startsWith('https://project.supabase.co/storage/v1/object/sign/studio-videos/' + USER + '/'));
  assert.ok(b.calls.signed.every(s => s.path.startsWith(USER + '/')), 'only the owner\'s files are ever signed');
  // The estimate is priced on exactly the parameters that are submitted.
  assert.deepEqual(p.log.find(c => c.url.includes('/estimate/')).body, submitCall.body);
});

test('lite model uses the documented Genjutsu Light endpoint', async () => {
  const {p, service, jobId} = setup({backend: {model: 'lite', seconds: 10}});
  const result = await service.submit({userId: USER, jobId, requestKey: KEY});
  assert.equal(result.creditsReserved, 20); // 10 s x 2
  assert.ok(p.log.some(c => c.url === 'https://api.higgsfield.ai/higgsfield/genjutsu-light/motion-transfer/v1.0'));
});

test('repeating the same request never reserves or submits twice', async () => {
  const {b, p, service, jobId} = setup();
  await service.submit({userId: USER, jobId, requestKey: KEY});
  const again = await service.submit({userId: USER, jobId, requestKey: KEY});
  assert.equal(again.replayed, true);
  assert.equal(b.balance(), 70); assert.equal(p.submissions(), 1); assert.equal(b.db.reservations.length, 1);
  // A different key for a job that already left draft is refused outright.
  await rejects(service.submit({userId: USER, jobId, requestKey: KEY2}), 'JOB_NOT_DRAFT', 409);
  assert.equal(p.submissions(), 1); assert.equal(b.balance(), 70);
});

test('two simultaneous submits for one draft produce one reservation and one provider request', async () => {
  const {b, p, service, jobId} = setup();
  const results = await Promise.allSettled([service.submit({userId: USER, jobId, requestKey: KEY}), service.submit({userId: USER, jobId, requestKey: KEY})]);
  assert.ok(results.every(r => r.status === 'fulfilled'));
  assert.equal(p.submissions(), 1); assert.equal(b.db.reservations.length, 1); assert.equal(b.balance(), 70);
});

for (const [name, patch, blocker] of [
  ['submission switch off', {K4K_GENERATION_SUBMISSION_ENABLED: undefined}, 'GENERATION_SUBMISSION_DISABLED'],
  ['no provider credential', {HF_CREDENTIALS: ''}, 'PROVIDER_CREDENTIALS_MISSING'],
  ['pricing not approved', {K4K_CUSTOMER_CREDIT_PRICING_APPROVED: 'false'}, 'CUSTOMER_CREDIT_PRICING_NOT_APPROVED'],
  ['no rate table', {K4K_GENERATION_CREDITS_PER_SECOND: undefined}, 'CUSTOMER_CREDIT_PRICE_TABLE_MISSING'],
  ['no spend cap', {K4K_GENERATION_MAX_PROVIDER_USD: undefined}, 'PROVIDER_SPEND_CAP_MISSING'],
  ['no approved output host', {K4K_HIGGSFIELD_OUTPUT_HOSTS: undefined}, 'OUTPUT_HOSTS_NOT_APPROVED'],
  ['no approved test accounts', {K4K_GENERATION_TEST_USERS: undefined}, 'TEST_USERS_NOT_CONFIGURED'],
  ['production without launch approval', {VERCEL_ENV: 'production'}, 'PRODUCTION_GENERATION_NOT_APPROVED'],
]) test('blocked: ' + name + ' -> no reservation, no provider call', async () => {
  const {b, p, service, jobId} = setup({env: {...READY_ENV, ...patch}});
  await assert.rejects(service.submit({userId: USER, jobId, requestKey: KEY}), error => {
    assert.equal(error.code, 'GENERATION_BLOCKED'); assert.ok(error.extra.blockers.includes(blocker), JSON.stringify(error.extra.blockers)); return true;
  });
  assert.equal(b.calls.rpc.length, 0); assert.equal(p.log.length, 0); assert.equal(b.balance(), 100); assert.equal(b.job(jobId).status, 'draft');
});

test('preview: an account outside the approved test list cannot start a billable call', async () => {
  const {b, p, service} = setup();
  const otherJob = b.addDraft({user: OTHER});
  await rejects(service.submit({userId: OTHER, jobId: otherJob, requestKey: KEY}), 'GENERATION_BLOCKED', 403);
  assert.equal(p.log.length, 0); assert.equal(b.balance(OTHER), 500);
});

test('production with launch approval is open to any registered customer (no invitation list)', async () => {
  const {b, p, service} = setup({env: {...READY_ENV, VERCEL_ENV: 'production', K4K_GENERATION_PUBLIC_ENABLED: 'true', K4K_GENERATION_TEST_USERS: undefined}});
  const otherJob = b.addDraft({user: OTHER});
  assert.equal((await service.submit({userId: OTHER, jobId: otherJob, requestKey: KEY})).status, 'processing');
  assert.equal(p.submissions(), 1);
});

test('a customer cannot submit, price or refresh another customer\'s job', async () => {
  const {b, p, service, jobId} = setup({env: {...READY_ENV, K4K_GENERATION_TEST_USERS: USER + ',' + OTHER}});
  await rejects(service.submit({userId: OTHER, jobId, requestKey: KEY}), 'JOB_NOT_FOUND', 404);
  await rejects(service.price({userId: OTHER, jobId}), 'JOB_NOT_FOUND', 404);
  await service.submit({userId: USER, jobId, requestKey: KEY});
  await rejects(service.refresh({userId: OTHER, jobId}), 'JOB_NOT_FOUND', 404);
  assert.equal(b.balance(OTHER), 500); assert.equal(p.statusChecks(), 0);
});

test('insufficient credits: refused before any provider contact', async () => {
  const {b, p, service, jobId} = setup({backend: {balance: 29}});
  await rejects(service.submit({userId: USER, jobId, requestKey: KEY}), 'INSUFFICIENT_CREDITS', 402);
  assert.equal(p.log.length, 0); assert.equal(b.balance(), 29); assert.equal(b.job(jobId).status, 'draft');
});

test('provider estimate above the spend cap: nothing reserved, nothing submitted', async () => {
  const {b, p, service, jobId} = setup({provider: {estimateUsd: '5.01'}});
  await rejects(service.submit({userId: USER, jobId, requestKey: KEY}), 'PROVIDER_COST_EXCEEDS_CAP', 409);
  assert.equal(p.submissions(), 0); assert.equal(b.calls.rpc.length, 0); assert.equal(b.balance(), 100);
});

test('provider estimate unavailable: nothing reserved, nothing submitted', async () => {
  const {b, p, service, jobId} = setup({provider: {estimateUsd: null}});
  await rejects(service.submit({userId: USER, jobId, requestKey: KEY}), 'PROVIDER_ESTIMATE_UNAVAILABLE', 502);
  assert.equal(p.submissions(), 0); assert.equal(b.balance(), 100); assert.equal(b.job(jobId).status, 'draft');
});

test('source video outside the model limits is refused from the stored file, not a browser claim', async () => {
  const {b, p, service, jobId} = setup({backend: {seconds: 3}}); // pro needs 4-30 s
  await rejects(service.submit({userId: USER, jobId, requestKey: KEY}), 'MODEL_DURATION_OUT_OF_RANGE', 422);
  assert.equal(p.log.length, 0); assert.equal(b.balance(), 100);
});

test('unpriced resolution is refused', async () => {
  const {p, service, jobId} = setup();
  await rejects(service.submit({userId: USER, jobId, requestKey: KEY, resolution: '480p'}), 'GENERATION_OPTION_NOT_PRICED', 422);
  assert.equal(p.log.length, 0);
});

test('provider rejects the request outright (HTTP 400): credits returned exactly once', async () => {
  const {b, p, service, jobId} = setup({provider: {submit: {status: 400}}});
  await assert.rejects(service.submit({userId: USER, jobId, requestKey: KEY}), error => { assert.equal(error.code, 'PROVIDER_REJECTED'); assert.equal(error.extra.refunded, true); return true; });
  assert.equal(b.balance(), 100); assert.equal(b.reservation(jobId).status, 'refunded'); assert.equal(b.job(jobId).status, 'failed');
  assert.match(b.job(jobId).error_message, /credits were returned/);
  // Retrying the same request cannot refund again or submit again.
  await service.submit({userId: USER, jobId, requestKey: KEY});
  assert.equal(b.balance(), 100); assert.equal(p.submissions(), 1);
});

for (const [name, submit] of [['network failure', {throws: true}], ['HTTP 500', {status: 500}], ['idempotency conflict (422)', {status: 422, detail: 'Idempotency-Key was already used with different request parameters'}]])
  test('ambiguous submission (' + name + '): reservation is kept, never refunded or resubmitted', async () => {
    const {b, p, service, jobId, events} = setup({provider: {submit}});
    const result = await service.submit({userId: USER, jobId, requestKey: KEY});
    assert.equal(result.needsReview, true);
    assert.equal(b.balance(), 70); assert.equal(b.reservation(jobId).status, 'reserved');
    assert.deepEqual({status: b.job(jobId).status, provider: b.job(jobId).provider_job_id}, {status: 'queued', provider: null});
    assert.ok(events.some(e => e.event === 'generation.submission_uncertain'));
    assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'awaiting_review'});
    await service.submit({userId: USER, jobId, requestKey: KEY});
    assert.equal(p.submissions(), 1); assert.equal(b.balance(), 70);
  });

test('refresh: still running -> nothing downloaded, nothing settled', async () => {
  const {b, p, service, jobId} = setup({provider: {statuses: ['queued', 'in_progress']}});
  await service.submit({userId: USER, jobId, requestKey: KEY});
  assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'pending'});
  assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'pending'});
  assert.equal(p.downloads(), 0); assert.equal(b.reservation(jobId).status, 'reserved'); assert.equal(b.job(jobId).status, 'processing');
});

test('refresh: completed -> bounded download -> private storage -> settled exactly once', async () => {
  const {b, p, service, jobId} = setup({provider: {statuses: ['in_progress', 'completed']}});
  await service.submit({userId: USER, jobId, requestKey: KEY});
  await service.refresh({userId: USER, jobId});
  assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'completed'});
  const path = USER + '/' + jobId + '.mp4';
  assert.ok(b.objects.has('studio-generations/' + path));
  assert.deepEqual({status: b.job(jobId).status, output: b.job(jobId).output_path}, {status: 'completed', output: path});
  assert.equal(b.reservation(jobId).status, 'settled'); assert.equal(b.balance(), 70);
  assert.equal(p.log.find(c => c.url.startsWith('https://cdn.provider.test/')).redirect, 'error');
  // Further refreshes are no-ops: no provider call, no second charge.
  const checks = p.statusChecks();
  assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'unchanged'});
  assert.equal(p.statusChecks(), checks); assert.equal(p.downloads(), 1); assert.equal(b.balance(), 70);
});

test('refresh: two simultaneous completions store one file and settle once', async () => {
  const {b, service, jobId} = setup({provider: {statuses: ['completed']}});
  await service.submit({userId: USER, jobId, requestKey: KEY});
  const states = (await Promise.all([service.refresh({userId: USER, jobId}), service.refresh({userId: USER, jobId})])).map(r => r.state);
  assert.ok(states.every(s => s === 'completed'), states.join());
  assert.equal(b.reservation(jobId).status, 'settled'); assert.equal(b.balance(), 70);
  assert.equal([...b.objects.keys()].filter(k => k.startsWith('studio-generations/')).length, 1);
});

test('refresh: settlement interrupted after the file was stored -> next refresh finishes without a second download', async () => {
  const {b, p, service, jobId} = setup({provider: {statuses: ['completed']}});
  await service.submit({userId: USER, jobId, requestKey: KEY});
  const realRpc = b.admin.rpc; let failOnce = true;
  b.admin.rpc = async (name, args) => (name === 'k4k_generation_finish' && failOnce) ? (failOnce = false, {data: null, error: {message: 'connection reset'}}) : realRpc(name, args);
  assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'blocked', blocked: 'SETTLEMENT_FAILED'});
  assert.equal(b.reservation(jobId).status, 'reserved');
  assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'completed'});
  assert.equal(p.downloads(), 1); assert.equal(b.reservation(jobId).status, 'settled');
});

for (const state of ['failed', 'nsfw', 'canceled'])
  test('refresh: provider reports ' + state + ' -> credits returned exactly once', async () => {
    const {b, p, service, jobId} = setup({provider: {statuses: [state]}});
    await service.submit({userId: USER, jobId, requestKey: KEY});
    assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'refunded'});
    assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'unchanged'});
    assert.equal(b.balance(), 100); assert.equal(b.reservation(jobId).status, 'refunded'); assert.equal(b.job(jobId).status, 'failed');
    assert.match(b.job(jobId).error_message, /credits were returned/);
    assert.doesNotMatch(b.job(jobId).error_message, /internal detail/); // provider text is never shown
    assert.equal(p.downloads(), 0);
  });

test('refresh: output on a host that is not approved is never fetched; reservation is kept', async () => {
  const {b, p, service, jobId, events} = setup({provider: {statuses: ['completed'], outputUrl: 'https://unknown-cdn.example/out.mp4'}});
  await service.submit({userId: USER, jobId, requestKey: KEY});
  assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'blocked', blocked: 'OUTPUT_HOST_NOT_APPROVED'});
  assert.equal(p.downloads(), 0); assert.equal(b.reservation(jobId).status, 'reserved'); assert.equal(b.job(jobId).status, 'processing');
  assert.deepEqual(events.at(-1).detail, {jobId, code: 'OUTPUT_HOST_NOT_APPROVED', host: 'unknown-cdn.example'});
});

test('refresh: output that is not a real MP4 is not stored and not settled', async () => {
  const {b, service, jobId} = setup({provider: {statuses: ['completed'], outputBytes: new Uint8Array(4096).fill(60)}});
  await service.submit({userId: USER, jobId, requestKey: KEY});
  assert.deepEqual(await service.refresh({userId: USER, jobId}), {state: 'blocked', blocked: 'OUTPUT_NOT_MP4'});
  assert.equal(b.reservation(jobId).status, 'reserved'); assert.ok(![...b.objects.keys()].some(k => k.startsWith('studio-generations/')));
});

test('refresh: a status answer for a different request, or a provider error, changes nothing', async () => {
  for (const state of ['mismatch', 'http_500']) {
    const {b, p, service, jobId} = setup({provider: {statuses: [state]}});
    await service.submit({userId: USER, jobId, requestKey: KEY});
    assert.equal((await service.refresh({userId: USER, jobId})).state, 'provider_unavailable');
    assert.equal(b.reservation(jobId).status, 'reserved'); assert.equal(b.job(jobId).status, 'processing'); assert.equal(p.downloads(), 0);
  }
});

test('refresh keeps working for in-flight jobs after new submissions are switched off', async () => {
  const b = createFakeBackend(); const p = createFakeProvider({statuses: ['completed']}); const jobId = b.addDraft();
  const make = env => { const config = getGenerationConfig(env); return createGenerationService({admin: b.admin, config, fetchImpl: p.fetchImpl, providerClient: createHiggsfieldMotionClient({credentials: config.credentials, fetchImpl: p.fetchImpl})}); };
  await make(READY_ENV).submit({userId: USER, jobId, requestKey: KEY});
  const off = make({...READY_ENV, K4K_GENERATION_SUBMISSION_ENABLED: 'false'});
  assert.deepEqual(await off.refresh({userId: USER, jobId}), {state: 'completed'});
  assert.equal(b.reservation(jobId).status, 'settled');
});

test('price: read-only server price with balance, no reservation and no provider contact', async () => {
  const {b, p, service, jobId} = setup({backend: {balance: 10}});
  assert.deepEqual(await service.price({userId: USER, jobId, resolution: '1080p'}), {jobId, model: 'pro', resolution: '1080p', durationSeconds: 6, images: 2, credits: 54, balance: 10, sufficient: false});
  assert.equal(b.calls.rpc.length, 0); assert.equal(p.log.length, 0); assert.equal(b.job(jobId).status, 'draft');
});

test('active job limit stops a third concurrent generation', async () => {
  const {b, p, service, jobId} = setup({backend: {balance: 1000}});
  const second = b.addDraft(), third = b.addDraft();
  await service.submit({userId: USER, jobId, requestKey: KEY});
  await service.submit({userId: USER, jobId: second, requestKey: KEY2});
  await rejects(service.submit({userId: USER, jobId: third, requestKey: '55555555-5555-4555-8555-555555555555'}), 'ACTIVE_JOB_LIMIT', 429);
  assert.equal(p.submissions(), 2); assert.equal(b.job(third).status, 'draft');
});
