import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDirectorPrompt} from '../lib/director-cast.mjs';
test('four slots map to four images and the chosen lead retains their index',()=>{
 const prompt=buildDirectorPrompt({targets:['left speaker','seated listener','person by stairs','right dancer'],main:2});
 assert.equal((prompt.match(/Image \d replaces/g)||[]).length,4);
 assert.match(prompt,/Image 3 replaces only the source person described as: person by stairs\. Role: main character/);
 assert.match(prompt,/Leave all unassigned people unchanged/);
});
test('two slots create two assignments and reject ambiguous roles or missing slots',()=>{
 assert.equal((buildDirectorPrompt({targets:['left person','right person']}).match(/Image \d replaces/g)||[]).length,2);
 for(const targets of [[],['left person',''],['left person','LEFT PERSON']])assert.throws(()=>buildDirectorPrompt({targets}));
 assert.throws(()=>buildDirectorPrompt({targets:['left person'],main:1}));
});
