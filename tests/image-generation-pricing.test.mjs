import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteImage} from '../lib/server/image-generation-pricing.mjs';

const MODEL = 'gemini-3.1-flash-image-preview';

test('1K image with two reference photos costs one credit', () => {
  const q = quoteImage({model: MODEL, resolution: '1K', referenceImageCount: 2});
  assert.equal(q.providerMaxMicros, 68120);
  assert.equal(q.credits, 1);
});

test('2K image costs two credits', () => {
  const q = quoteImage({model: MODEL, resolution: '2K', referenceImageCount: 2});
  assert.equal(q.providerMaxMicros, 102120);
  assert.equal(q.credits, 2);
});

test('4K image with four reference photos costs three credits', () => {
  const q = quoteImage({model: MODEL, resolution: '4K', referenceImageCount: 4});
  assert.equal(q.providerMaxMicros, 153240);
  assert.equal(q.credits, 3);
});

test('no reference photos means output cost only', () => {
  const q = quoteImage({model: MODEL, resolution: '1K'});
  assert.equal(q.referenceImageCount, 0);
  assert.equal(q.providerMaxMicros, 67000);
});

test('unapproved models and resolutions are rejected', () => {
  assert.throws(() => quoteImage({model: 'other-image', resolution: '1K'}), /Model is not approved/);
  assert.throws(() => quoteImage({model: MODEL, resolution: '8K'}), /Resolution must be/);
  assert.throws(() => quoteImage({model: MODEL, resolution: '1k'}), /Resolution must be/);
});

test('reference counts outside 0-4 or non-integer are rejected', () => {
  for (const referenceImageCount of [-1, 5, 1.5, '2', NaN]) {
    assert.throws(() => quoteImage({model: MODEL, resolution: '1K', referenceImageCount}), /Reference images must be/);
  }
});

test('quotes are frozen and carry a pricing revision', () => {
  const q = quoteImage({model: MODEL, resolution: '1K'});
  assert.equal(q.pricingRevision, 'google-list-2026-11-07');
  assert.ok(Object.isFrozen(q));
});
