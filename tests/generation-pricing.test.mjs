import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteGeneration} from '../lib/server/generation-pricing.mjs';

test('Wan 720p 5s clip uses the Higgsfield rate and the 2.5x floor', () => {
  const q = quoteGeneration({model: 'wan3_0_prime', resolution: '720p', outputSeconds: 5});
  assert.equal(q.billableSeconds, 5);
  assert.equal(q.providerMaxUsdMills, 700);
  assert.equal(q.credits, 10);
});

test('Genjutsu Light bills source video alongside the output', () => {
  const q = quoteGeneration({model: 'genjutsu_light', resolution: '480p', outputSeconds: 10, inputVideoSeconds: 15});
  assert.equal(q.billableSeconds, 25);
  assert.equal(q.providerMaxUsdMills, 1250);
  assert.equal(q.credits, 17);
});

test('Genjutsu Light 720p with 10s output and 15s source costs 34 credits', () => {
  const q = quoteGeneration({model: 'genjutsu_light', resolution: '720p', outputSeconds: 10, inputVideoSeconds: 15});
  assert.equal(q.providerMaxUsdMills, 2500);
  assert.equal(q.credits, 34);
});

test('fractional source video is rounded up to whole billable seconds', () => {
  const q = quoteGeneration({model: 'wan3_0_prime', resolution: '480p', outputSeconds: 5, inputVideoSeconds: 4.2});
  assert.equal(q.billableSeconds, 10);
  assert.equal(q.providerMaxUsdMills, 680);
});

test('Genjutsu 720p bills only the source seconds, at $0.681 per second', () => {
  const q = quoteGeneration({model: 'genjutsu', resolution: '720p', inputVideoSeconds: 10});
  assert.equal(q.outputSeconds, 10);
  assert.equal(q.billableSeconds, 10);
  assert.equal(q.providerMaxUsdMills, 6810);
  assert.equal(q.credits, 91);
});

test('Genjutsu 480p 5s source costs 22 credits', () => {
  const q = quoteGeneration({model: 'genjutsu', resolution: '480p', inputVideoSeconds: 5});
  assert.equal(q.providerMaxUsdMills, 1590);
  assert.equal(q.credits, 22);
});

test('Genjutsu rounds fractional source up before billing', () => {
  const q = quoteGeneration({model: 'genjutsu', resolution: '720p', inputVideoSeconds: 9.2});
  assert.equal(q.billableSeconds, 10);
  assert.equal(q.providerMaxUsdMills, 6810);
});

test('Genjutsu rejects sources under 4 seconds and over the $7 cap', () => {
  assert.throws(() => quoteGeneration({model: 'genjutsu', resolution: '720p', inputVideoSeconds: 3}), /Input video must/);
  assert.throws(() => quoteGeneration({model: 'genjutsu', resolution: '720p', inputVideoSeconds: 11}), /cost cap/);
  assert.throws(() => quoteGeneration({model: 'genjutsu', resolution: '1080p', inputVideoSeconds: 5}), /cost cap/);
});

test('unknown models and resolutions are rejected, not undercharged', () => {
  assert.throws(() => quoteGeneration({model: 'genjutsu-pro', resolution: '720p', outputSeconds: 5}), /not approved/);
  assert.throws(() => quoteGeneration({model: 'other/model', resolution: '720p', outputSeconds: 5}), /not approved/);
  assert.throws(() => quoteGeneration({model: 'wan3_0_prime', resolution: '4k', outputSeconds: 5}), /not approved/);
});

test('requests over the provider cost cap are rejected', () => {
  assert.throws(() => quoteGeneration({model: 'wan3_0_prime', resolution: '1080p', outputSeconds: 30}), /cost cap/);
});

test('out-of-range or non-integer durations are rejected', () => {
  for (const outputSeconds of [1, 31, 4.5, '5', undefined]) {
    assert.throws(() => quoteGeneration({model: 'wan3_0_prime', resolution: '720p', outputSeconds}), /Output must/);
  }
  for (const inputVideoSeconds of [-1, 16, NaN, '5']) {
    assert.throws(
      () => quoteGeneration({model: 'genjutsu_light', resolution: '720p', outputSeconds: 5, inputVideoSeconds}),
      /Input video must/,
    );
  }
  assert.throws(() => quoteGeneration({model: 'genjutsu', resolution: '480p', inputVideoSeconds: 31}), /Input video must/);
});

test('quotes are frozen and carry a pricing revision', () => {
  const q = quoteGeneration({model: 'wan3_0_prime', resolution: '720p', outputSeconds: 5});
  assert.equal(q.pricingRevision, 'higgsfield-list-2026-11-06');
  assert.ok(Object.isFrozen(q));
});
