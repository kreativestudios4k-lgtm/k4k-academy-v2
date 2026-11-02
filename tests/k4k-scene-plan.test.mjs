import test from 'node:test';
import assert from 'node:assert/strict';
import {parseK4KScenePlan} from '../lib/k4k-scene-plan.mjs';
test('keeps the five-scene sequence and removes duplicate numbering', () => {
  assert.deepEqual(parseK4KScenePlan('Scene 1: Algeria flag\nScene 2: Real Madrid studio\nScene 3: RM kit\nScene 4: Reveal\nScene 5: Football match'), [
    'Scene 1: Algeria flag', 'Scene 2: Real Madrid studio', 'Scene 3: RM kit', 'Scene 4: Reveal', 'Scene 5: Football match'
  ]);
});
test('ignores blank scenes and caps output at five', () => {
  assert.deepEqual(parseK4KScenePlan('\n 1. First \n\n 2) Second \nThird\nFourth\nFifth\nSixth'), [
    'Scene 1: First', 'Scene 2: Second', 'Scene 3: Third', 'Scene 4: Fourth', 'Scene 5: Fifth'
  ]);
});
test('normalizes whitespace, line endings, and length', () => {
  const result = parseK4KScenePlan('Scene 1:   White   studio\r\nScene 2: ' + 'x'.repeat(200));
  assert.equal(result[0], 'Scene 1: White studio');
  assert.equal(result[1].length, 'Scene 2: '.length + 160);
});
test('empty or missing input produces no scene overrides', () => {
  assert.deepEqual(parseK4KScenePlan(undefined), []);
  assert.deepEqual(parseK4KScenePlan(' \n \r\n '), []);
});
