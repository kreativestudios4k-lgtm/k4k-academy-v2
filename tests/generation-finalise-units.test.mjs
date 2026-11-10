// Unit tests for the pieces added on 2026-11-10: provider client, credit
// pricing, launch gates, bounded output download and the new routes' safety.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHiggsfieldMotionClient, buildMotionPayload, ProviderError, MOTION_MODELS} from '../lib/server/higgsfield-motion-client.mjs';
import {loadCreditPricing, priceGenerationCredits} from '../lib/server/generation-credit-pricing.mjs';
import {getGenerationConfig, describeBlockers, BLOCKER_MESSAGES} from '../lib/server/generation-config.mjs';
import {createApprovedOutputDownloader, isApprovedOutputHost} from '../lib/server/generation-output-download.mjs';
import {createGenerationLifecycle} from '../lib/server/generation-lifecycle.mjs';
import {createGuardedGenerationLedger} from '../lib/server/guarded-generation-ledger.mjs';
import {READY_ENV, mp4} from './helpers/fake-generation-backend.mjs';

const payload = {video_url: 'https://a.test/v.mp4', image_urls: ['https://a.test/1.png'], prompt: '', resolution: '720p'};
const respond = (status, body) => async () => ({ok: status < 300, status, json: async () => body});
const client = fetchImpl => createHiggsfieldMotionClient({credentials: 'id:secret', fetchImpl});

test('provider client: model IDs match the published endpoints', () => {
  assert.equal(MOTION_MODELS.pro.modelId, 'higgsfield/genjutsu/motion-transfer/v1.0');
  assert.equal(MOTION_MODELS.lite.modelId, 'higgsfield/genjutsu-light/motion-transfer/v1.0');
});
test('provider client: unusable credential is refused before any request', () => {
  for (const bad of ['', 'has space', undefined]) assert.throws(() => createHiggsfieldMotionClient({credentials: bad, fetchImpl: async () => {}}), /PROVIDER_CREDENTIALS_INVALID/);
});
test('provider client: payload builder enforces documented limits', () => {
  assert.deepEqual(buildMotionPayload({videoUrl: payload.video_url, imageUrls: payload.image_urls}), payload);
  assert.throws(() => buildMotionPayload({videoUrl: 'http://a.test/v.mp4', imageUrls: payload.image_urls}), /INVALID_SOURCE_VIDEO_URL/);
  assert.throws(() => buildMotionPayload({videoUrl: payload.video_url, imageUrls: []}), /INVALID_IMAGE_URLS/);
  assert.throws(() => buildMotionPayload({videoUrl: payload.video_url, imageUrls: Array.from({length: 9}, (_, i) => 'https://a.test/' + i)}), /INVALID_IMAGE_URLS/);
  assert.throws(() => buildMotionPayload({videoUrl: payload.video_url, imageUrls: payload.image_urls, prompt: 'x'.repeat(10001)}), /INVALID_PROMPT/);
  assert.throws(() => buildMotionPayload({videoUrl: payload.video_url, imageUrls: payload.image_urls, resolution: '4k'}), /INVALID_RESOLUTION/);
});
test('provider client: only synchronous rejections are definite; everything else is ambiguous', async () => {
  for (const status of [400, 401, 403, 404, 423, 429]) await assert.rejects(client(respond(status, {detail: 'no'})).submit('pro', payload, 'job-0000000000000001'), e => e instanceof ProviderError && e.definitiveRejection === true && e.httpStatus === status);
  for (const status of [500, 502, 503]) await assert.rejects(client(respond(status, {})).submit('pro', payload, 'job-0000000000000001'), e => e.definitiveRejection === false);
  await assert.rejects(client(async () => { throw new Error('timeout'); }).submit('pro', payload, 'job-0000000000000001'), e => e.code === 'PROVIDER_UNREACHABLE' && e.definitiveRejection === false);
  await assert.rejects(client(respond(422, {detail: [{msg: 'field required'}]})).submit('pro', payload, 'job-0000000000000001'), e => e.definitiveRejection === true);
  await assert.rejects(client(respond(422, {detail: 'Idempotency-Key was already used with different request parameters'})).submit('pro', payload, 'job-0000000000000001'), e => e.definitiveRejection === false);
});
test('provider client: submit needs a stable key and a well-formed handle', async () => {
  await assert.rejects(client(respond(200, {request_id: 'r1'})).submit('pro', payload, 'short'), /IDEMPOTENCY_KEY_REQUIRED/);
  await assert.rejects(client(respond(200, {request_id: 'bad id!'})).submit('pro', payload, 'job-0000000000000001'), /PROVIDER_RESPONSE_INVALID/);
  await assert.rejects(client(respond(200, {})).submit('studio', payload, 'job-0000000000000001'), /UNSUPPORTED_MODEL/);
});
test('provider client: status maps every documented state and binds the request ID', async () => {
  const cases = {queued: 'queued', in_progress: 'processing', failed: 'failed', nsfw: 'failed', canceled: 'failed'};
  for (const [raw, mapped] of Object.entries(cases)) assert.deepEqual({...await client(respond(200, {request_id: 'r1', status: raw})).status('r1')}, {providerJobId: 'r1', status: mapped, providerStatus: raw, videoUrl: null});
  assert.equal((await client(respond(200, {request_id: 'r1', status: 'completed', video: {url: 'https://cdn.test/o.mp4'}})).status('r1')).videoUrl, 'https://cdn.test/o.mp4');
  await assert.rejects(client(respond(200, {request_id: 'r1', status: 'completed'})).status('r1'), /PROVIDER_OUTPUT_MISSING/);
  await assert.rejects(client(respond(200, {request_id: 'r1', status: 'completed', video: {url: 'http://cdn.test/o.mp4'}})).status('r1'), /PROVIDER_OUTPUT_MISSING/);
  await assert.rejects(client(respond(200, {request_id: 'r2', status: 'queued'})).status('r1'), /PROVIDER_JOB_MISMATCH/);
  await assert.rejects(client(respond(200, {request_id: 'r1', status: 'paused'})).status('r1'), /PROVIDER_STATUS_UNKNOWN/);
  await assert.rejects(client(respond(200, {})).status('../etc'), /INVALID_PROVIDER_JOB_ID/);
});
test('provider client: estimate accepts only a positive decimal USD string', async () => {
  assert.deepEqual(await client(respond(200, {usd: '0.094'})).estimate('lite', payload), {usd: 0.094});
  for (const bad of [{usd: 0.5}, {usd: '-1'}, {usd: '0'}, {usd: 'free'}, {}]) await assert.rejects(client(respond(200, bad)).estimate('lite', payload), /PROVIDER_ESTIMATE_INVALID/);
});

test('pricing: no built-in price; approval flag and a valid table are both required', () => {
  assert.deepEqual(loadCreditPricing({}), {approved: false, reason: 'CUSTOMER_CREDIT_PRICING_NOT_APPROVED', table: null});
  assert.equal(loadCreditPricing({K4K_CUSTOMER_CREDIT_PRICING_APPROVED: 'true'}).reason, 'CUSTOMER_CREDIT_PRICE_TABLE_MISSING');
  for (const bad of ['[]', '{"studio":{"720p":1}}', '{"pro":{"4k":1}}', '{"pro":{"720p":0}}', '{"pro":{"720p":1.5}}', '{"pro":{"720p":"5"}}', '{"pro":5}'])
    assert.equal(loadCreditPricing({K4K_CUSTOMER_CREDIT_PRICING_APPROVED: 'true', K4K_GENERATION_CREDITS_PER_SECOND: bad}).reason, 'CUSTOMER_CREDIT_PRICE_TABLE_INVALID', bad);
  assert.equal(loadCreditPricing({K4K_CUSTOMER_CREDIT_PRICING_APPROVED: 'true', K4K_GENERATION_CREDITS_PER_SECOND: '{"pro":{}}'}).reason, 'CUSTOMER_CREDIT_PRICE_TABLE_MISSING');
});
test('pricing: whole seconds rounded up, within the database reservation limit', () => {
  const {table} = loadCreditPricing(READY_ENV);
  assert.equal(priceGenerationCredits({table, tier: 'pro', resolution: '720p', durationSeconds: 4.01}), 25);
  assert.equal(priceGenerationCredits({table, tier: 'lite', resolution: '720p', durationSeconds: 15}), 30);
  assert.throws(() => priceGenerationCredits({table, tier: 'lite', resolution: '1080p', durationSeconds: 5}), /GENERATION_OPTION_NOT_PRICED/);
  assert.throws(() => priceGenerationCredits({table, tier: 'constructor', resolution: '720p', durationSeconds: 5}), /GENERATION_OPTION_NOT_PRICED/);
  assert.throws(() => priceGenerationCredits({table, tier: 'pro', resolution: '720p', durationSeconds: 0}), /VERIFIED_DURATION_REQUIRED/);
  assert.throws(() => priceGenerationCredits({table: {pro: {'720p': 1000}}, tier: 'pro', resolution: '720p', durationSeconds: 30}), /CREDIT_PRICE_OUT_OF_RANGE/);
});

test('gates: everything is off by default and every blocker has a plain-English explanation', () => {
  const config = getGenerationConfig({});
  assert.deepEqual([...config.blockers], ['GENERATION_SUBMISSION_DISABLED', 'PROVIDER_CREDENTIALS_MISSING', 'CUSTOMER_CREDIT_PRICING_NOT_APPROVED', 'PROVIDER_SPEND_CAP_MISSING', 'OUTPUT_HOSTS_NOT_APPROVED', 'TEST_USERS_NOT_CONFIGURED']);
  for (const item of describeBlockers([...config.blockers, 'ACCOUNT_NOT_APPROVED_FOR_TEST', 'PRODUCTION_GENERATION_NOT_APPROVED'])) assert.ok(BLOCKER_MESSAGES[item.code] && item.message.length > 20);
  assert.equal(config.credentials, null); assert.equal(config.maxProviderUsd, null);
});
test('gates: ready configuration has no blockers; spend cap and hosts are validated', () => {
  const config = getGenerationConfig(READY_ENV);
  assert.deepEqual([...config.blockers], []);
  assert.equal(config.maxProviderUsd, 5); assert.deepEqual([...config.outputHosts], ['cdn.provider.test']); assert.equal(config.inputUrlTtlSeconds, 21600);
  for (const cap of ['0', '-1', '1000', 'abc', '5.123']) assert.ok(getGenerationConfig({...READY_ENV, K4K_GENERATION_MAX_PROVIDER_USD: cap}).blockers.includes('PROVIDER_SPEND_CAP_MISSING'), cap);
  for (const hosts of ['https://cdn.test', 'localhost', '*', '10.0.0.1/x']) assert.ok(getGenerationConfig({...READY_ENV, K4K_HIGGSFIELD_OUTPUT_HOSTS: hosts}).blockers.includes('OUTPUT_HOSTS_NOT_APPROVED'), hosts);
  assert.equal(config.authorizeUser('99999999-9999-4999-8999-999999999999'), 'ACCOUNT_NOT_APPROVED_FOR_TEST');
});

test('download: host approval is exact, or an explicit dot-prefixed suffix', () => {
  assert.equal(isApprovedOutputHost('cdn.provider.test', ['cdn.provider.test']), true);
  assert.equal(isApprovedOutputHost('evil-cdn.provider.test', ['cdn.provider.test']), false);
  assert.equal(isApprovedOutputHost('a.provider.test', ['.provider.test']), true);
  assert.equal(isApprovedOutputHost('provider.test.evil.example', ['.provider.test']), false);
  assert.equal(isApprovedOutputHost('notprovider.test', ['.provider.test']), false);
});
test('download: refuses unsafe URLs, wrong types, oversized and non-MP4 bodies', async () => {
  const body = (bytes, type = 'video/mp4', length = bytes.byteLength) => async (url, init) => { assert.equal(init.redirect, 'error'); return {ok: true, headers: new Headers({'content-type': type, 'content-length': String(length)}), body: new Blob([bytes]).stream()}; };
  const make = (fetchImpl, maxBytes) => createApprovedOutputDownloader({fetchImpl, allowedHosts: ['cdn.test'], maxBytes});
  let fetched = 0; const never = async () => { fetched++; };
  for (const url of ['http://cdn.test/o.mp4', 'https://user:pw@cdn.test/o.mp4', 'https://cdn.test:8443/o.mp4', 'not a url']) await assert.rejects(make(never)(url), /OUTPUT_URL_INVALID/);
  for (const url of ['https://other.test/o.mp4', 'https://169.254.169.254/latest', 'https://localhost/o.mp4']) await assert.rejects(make(never)(url), /OUTPUT_HOST_NOT_APPROVED/);
  await assert.rejects(createApprovedOutputDownloader({fetchImpl: never, allowedHosts: []})('https://cdn.test/o.mp4'), /OUTPUT_HOST_NOT_APPROVED/);
  assert.equal(fetched, 0);
  const good = mp4(5, 2048);
  assert.equal((await make(body(good))('https://cdn.test/o.mp4')).byteLength, 2048);
  assert.equal((await make(body(good, 'application/octet-stream'))('https://cdn.test/o.mp4')).byteLength, 2048);
  await assert.rejects(make(body(good, 'text/html'))('https://cdn.test/o.mp4'), /OUTPUT_TYPE_INVALID/);
  await assert.rejects(make(body(good), 1024)('https://cdn.test/o.mp4'), /OUTPUT_TOO_LARGE/);
  await assert.rejects(make(body(good, 'video/mp4', 10), 1024)('https://cdn.test/o.mp4'), /OUTPUT_TOO_LARGE/); // lying content-length
  await assert.rejects(make(body(good.subarray(0, 100)))('https://cdn.test/o.mp4'), /OUTPUT_TOO_SMALL/);
  await assert.rejects(make(body(new Uint8Array(2048)))('https://cdn.test/o.mp4'), /OUTPUT_NOT_MP4/);
  await assert.rejects(make(async () => ({ok: false, status: 403}))('https://cdn.test/o.mp4'), /OUTPUT_DOWNLOAD_FAILED/);
});

test('lifecycle: a definite provider rejection is distinguished from an uncertain one', async () => {
  const base = {enabled: true, providerEnabled: true, priceCredits: () => 3, submissionRecorder: {record: async () => {}}, ledger: {reserve: async () => ({newlyReserved: true}), finish: async () => {}}};
  const run = submit => createGenerationLifecycle({...base, provider: {submit}}).run({userId: 'u', jobId: 'j', requestKey: 'k', tier: 'pro', input: {}});
  await assert.rejects(run(async () => { throw Object.assign(new Error('x'), {definitiveRejection: true, httpStatus: 400}); }), e => e.message === 'PROVIDER_REJECTED' && e.httpStatus === 400);
  await assert.rejects(run(async () => { throw Object.assign(new Error('x'), {definitiveRejection: 'yes'}); }), /PROVIDER_SUBMISSION_UNCERTAIN/);
  await assert.rejects(run(async () => { throw new Error('x'); }), /PROVIDER_SUBMISSION_UNCERTAIN/);
});
test('ledger: known database codes are surfaced; anything else stays generic', async () => {
  const ledger = message => createGuardedGenerationLedger({rpc: async () => ({data: null, error: {message}})}, {enabled: true});
  for (const code of ['INSUFFICIENT_CREDITS', 'JOB_NOT_DRAFT', 'IDEMPOTENCY_CONFLICT']) await assert.rejects(ledger(code).reserve('u', 'j', 'k', 1), new RegExp('^Error: ' + code + '$'));
  await assert.rejects(ledger('relation "x" does not exist INSUFFICIENT_CREDITS').reserve('u', 'j', 'k', 1), /GENERATION_LEDGER_UNAVAILABLE/);
});

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('routes: identity comes from the verified session and no price is accepted from the browser', () => {
  const submit = read('app/api/generation/jobs/submit/route.js'), price = read('app/api/generation/jobs/price/route.js'), readiness = read('app/api/generation/submission-readiness/route.js');
  for (const route of [submit, price, readiness]) {
    assert.match(route, /authenticateGenerationRequest\(request\)/);
    assert.match(route, /no-store|NO_STORE/);
    assert.doesNotMatch(route, /body\.(userId|user_id|credits|price|duration|durationSeconds|videoUrl|providerJobId)/);
    assert.doesNotMatch(route, /HF_CREDENTIALS|SUPABASE_SERVICE_ROLE_KEY|api\.higgsfield\.ai/);
  }
  assert.match(submit, /userId: user\.id, jobId: body\.jobId, requestKey: body\.requestKey/);
  assert.doesNotMatch(readiness, /credentials|fetch\(/);
  const auth = read('lib/server/generation-request.mjs');
  assert.match(auth, /auth\.getUser\(token\)/); assert.match(auth, /user\.is_anonymous/);
  assert.doesNotMatch(auth, /console\.\w+\([^)]*(credentials|serviceKey|token)/);
});
test('routes: status read refreshes in-flight jobs without exposing provider IDs or storage paths', () => {
  const status = read('app/api/generation/jobs/[id]/route.js');
  assert.match(status, /service\.refresh\(\{userId: user\.id, jobId: job\.id\}\)/);
  assert.match(status, /progress: progress \? \{state: progress\.state, blocked: progress\.blocked \?\? null\} : null/);
  assert.doesNotMatch(status, /provider_job_id|output_path|videoUrl/);
  const download = read('app/api/generation/jobs/[id]/download/route.js');
  const pattern = new RegExp(download.match(/const UUID=\/(.+)\/i;/)[1], 'i');
  assert.ok(pattern.test('11111111-1111-4111-8111-111111111111'), 'download route must accept a real job ID');
});
test('no server secret or provider host reaches browser code', () => {
  for (const file of ['app/k4k-app/creator/page.js', 'app/k4k-app/videos/page.js']) assert.doesNotMatch(read(file), /SUPABASE_SERVICE_ROLE_KEY|HF_CREDENTIALS|api\.higgsfield\.ai|generation-service|generation-request/);
});
