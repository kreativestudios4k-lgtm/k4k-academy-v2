import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGenjutsuService, validateGenjutsuRequest} from '../lib/server/higgsfield-genjutsu.mjs';

const validLite = {
  model: 'lite',
  sourceVideoUrl: 'https://cdn.example.com/source.mp4',
  referenceImageUrls: ['https://cdn.example.com/ref1.jpg'],
  seconds: 8,
  resolution: '720p',
  prompt: 'Keep the camera move',
};

function spyAdapter() {
  const calls = [];
  return {
    calls,
    async submit(request) {
      calls.push(request);
      return {id: 'test-job'};
    },
  };
}

test('billing is off by default and the adapter is never called', async () => {
  const adapter = spyAdapter();
  const service = createGenjutsuService({env: {}, adapter});
  const result = await service.submit(validLite);
  assert.equal(service.enabled, false);
  assert.equal(result.status, 503);
  assert.equal(result.error, 'DISABLED');
  assert.equal(adapter.calls.length, 0);
});

test('enabled without a verified adapter refuses to generate', async () => {
  const service = createGenjutsuService({env: {HIGGSFIELD_GENJUTSU_ENABLED: 'true'}});
  const result = await service.submit(validLite);
  assert.equal(result.status, 503);
  assert.equal(result.error, 'ENDPOINT_NOT_VERIFIED');
});

test('enabled with an adapter submits exactly once', async () => {
  const adapter = spyAdapter();
  const service = createGenjutsuService({env: {HIGGSFIELD_GENJUTSU_ENABLED: 'true'}, adapter});
  const result = await service.submit(validLite);
  assert.equal(result.status, 202);
  assert.equal(adapter.calls.length, 1);
});

test('invalid requests are rejected before the enabled check', async () => {
  const adapter = spyAdapter();
  const service = createGenjutsuService({env: {HIGGSFIELD_GENJUTSU_ENABLED: 'true'}, adapter});
  const result = await service.submit({...validLite, seconds: 3});
  assert.equal(result.status, 400);
  assert.equal(adapter.calls.length, 0);
});

test('clip length must be 4 to 30 seconds', () => {
  assert.equal(validateGenjutsuRequest({...validLite, seconds: 3}).ok, false);
  assert.equal(validateGenjutsuRequest({...validLite, seconds: 31}).ok, false);
  assert.equal(validateGenjutsuRequest({...validLite, seconds: 4}).ok, true);
  assert.equal(validateGenjutsuRequest({...validLite, seconds: 30}).ok, true);
  assert.equal(validateGenjutsuRequest({...validLite, seconds: 7.5}).ok, false);
});

test('Lite accepts at most 10 references and rejects 480p', () => {
  const eleven = Array.from({length: 11}, (_, i) => `https://cdn.example.com/r${i}.jpg`);
  assert.equal(validateGenjutsuRequest({...validLite, referenceImageUrls: eleven}).ok, false);
  assert.equal(validateGenjutsuRequest({...validLite, resolution: '480p'}).ok, false);
});

test('standard accepts at most 8 references and allows 480p', () => {
  const nine = Array.from({length: 9}, (_, i) => `https://cdn.example.com/r${i}.jpg`);
  const standard = {...validLite, model: 'standard', resolution: '480p'};
  assert.equal(validateGenjutsuRequest({...standard, referenceImageUrls: nine}).ok, false);
  assert.equal(validateGenjutsuRequest(standard).ok, true);
});

test('URLs must be https and at least one reference is required', () => {
  assert.equal(validateGenjutsuRequest({...validLite, sourceVideoUrl: 'http://x.test/a.mp4'}).ok, false);
  assert.equal(validateGenjutsuRequest({...validLite, referenceImageUrls: []}).ok, false);
  assert.equal(validateGenjutsuRequest({...validLite, referenceImageUrls: ['javascript:alert(1)']}).ok, false);
});

test('unknown model names are rejected', () => {
  assert.equal(validateGenjutsuRequest({...validLite, model: 'pro'}).ok, false);
});
