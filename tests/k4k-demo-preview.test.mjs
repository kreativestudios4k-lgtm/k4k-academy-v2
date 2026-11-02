import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateK4KJourney,DEMO_MODELS} from '../lib/k4k-demo-preview.mjs';
for(const model of DEMO_MODELS) test('simulates '+model+' with zero charge',()=>{
 const r=simulateK4KJourney({model,mode:'Text to video',prompt:'A cinematic sunrise',imageCount:0});
 assert.equal(r.ok,true);assert.equal(r.realGeneration,false);
 assert.equal(r.simulatedChargeGbpPence,0);assert.equal(r.steps.length,5);
});
test('rejects missing prompt',()=>assert.equal(simulateK4KJourney({model:'K4K Create',mode:'Text to video',prompt:'',imageCount:0}).ok,false));
test('requires a character image for swaps',()=>assert.equal(simulateK4KJourney({model:'K4K Motion Lite',mode:'Character swap',prompt:'Swap character',imageCount:0}).ok,false));
