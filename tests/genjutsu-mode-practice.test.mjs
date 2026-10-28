import test from 'node:test';
import assert from 'node:assert/strict';
import {genjutsuModeQuestions, checkGenjutsuMode} from '../lib/k4k-genjutsu-mode-practice.mjs';

test('each scenario has a unique ID and a supported correct answer', () => {
  assert.equal(new Set(genjutsuModeQuestions.map(q => q.id)).size, genjutsuModeQuestions.length);
  assert.ok(genjutsuModeQuestions.length >= 2);
  for (const q of genjutsuModeQuestions) assert.ok(['object', 'motion'].includes(q.answer));
});

test('object swap is correct for preserving the rest of a football shot', () => {
  assert.equal(checkGenjutsuMode('single-player', 'object')?.correct, true);
  assert.equal(checkGenjutsuMode('single-player', 'motion')?.correct, false);
});

test('motion transfer is correct for recasting a whole dance scene', () => {
  assert.equal(checkGenjutsuMode('new-world', 'motion')?.correct, true);
  assert.equal(checkGenjutsuMode('new-world', 'object')?.correct, false);
});

test('unknown question and invalid mode are ignored', () => {
  assert.equal(checkGenjutsuMode('missing', 'object'), null);
  assert.equal(checkGenjutsuMode('new-world', 'unsupported'), null);
});
