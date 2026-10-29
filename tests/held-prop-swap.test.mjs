import test from 'node:test';
import assert from 'node:assert/strict';
import {k4kHeldPropSwapTemplate as template} from '../lib/k4k-held-prop-swap.mjs';

test('provides a unique copy-ready prop replacement template', () => {
  assert.equal(template.tag, 'GENJUTSU / OBJECT SWAP');
  assert.match(template.title, /held prop/i);
  assert.match(template.prompt, /@Video1/);
  assert.match(template.prompt, /@Image1/);
});

test('locks holder, hand, original scene and timing', () => {
  for (const requirement of ['SAME person', 'SAME hand', 'finger contact', 'camera', 'timing', 'face', 'outfit']) {
    assert.ok(template.prompt.includes(requirement), `Missing ${requirement}`);
  }
});

test('prevents prop reversion and unwanted duplicates', () => {
  assert.match(template.prompt, /do not revert to the original/i);
  assert.match(template.prompt, /create duplicates/i);
  assert.match(template.prompt, /opening, middle and final/i);
});

test('keeps the exercise external and credit-aware', () => {
  assert.match(template.prompt, /authorised source clip/i);
  assert.match(template.prompt, /credit cost before rendering/i);
  assert.doesNotMatch(template.prompt, /secret|api key|subscription|checkout/i);
});
