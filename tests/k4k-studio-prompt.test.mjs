import test from 'node:test';
import assert from 'node:assert/strict';
import {makeK4KSwapPrompt} from '../lib/k4k-studio-prompt.js';

test('one-person Object Swap preserves natural expressions', () => {
 const prompt=makeK4KSwapPrompt({mode:'object',count:1});
 assert.match(prompt,/EXPRESSION FIDELITY:/);
 assert.match(prompt,/do not invent forced smiles/);
 assert.match(prompt,/Replace ONLY Person on the LEFT/);
});

test('two-person Motion Transfer retains role mapping and expression guidance', () => {
 const prompt=makeK4KSwapPrompt({mode:'motion',count:2,position1:'left',position2:'right'});
 assert.match(prompt,/@Image2: Character sheet for replacing Person on the RIGHT/);
 assert.match(prompt,/EXPRESSION FIDELITY:/);
 assert.match(prompt,/MODE: MOTION TRANSFER/);
});

test('an explicit creative direction can request a smile', () => {
 const prompt=makeK4KSwapPrompt({creativeNote:'Make the character smile deliberately.'});
 assert.match(prompt,/unless explicitly requested in creative direction/);
 assert.match(prompt,/Make the character smile deliberately\./);
});

test('duplicate target positions remain invalid', () => {
 assert.throws(()=>makeK4KSwapPrompt({count:2,position1:'left',position2:'left'}),/different person/);
});
