import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateK4KJourney,modelsForMode} from '../lib/k4k-demo-preview.mjs';
test('text and image workflows show Create only',()=>{
 assert.deepEqual(modelsForMode('Text to video'),['K4K Create']);
 assert.deepEqual(modelsForMode('Image to video'),['K4K Create']);
});
test('character swap shows Lite and Pro, not Create',()=>{
 assert.deepEqual(modelsForMode('Character swap'),['K4K Motion Lite','K4K Motion Pro']);
});
for(const [mode,model] of [['Text to video','K4K Create'],['Image to video','K4K Create'],
 ['Character swap','K4K Motion Lite'],['Character swap','K4K Motion Pro']]){
 test('simulates '+mode+' / '+model+' for £0',()=>{
  const r=simulateK4KJourney({mode,model,prompt:'Preserve cinematography',imageCount:1});
  assert.equal(r.ok,true);assert.equal(r.realGeneration,false);assert.equal(r.simulatedChargeGbpPence,0);
 });
}
test('rejects motion models in text-to-video',()=>{
 assert.equal(simulateK4KJourney({mode:'Text to video',model:'K4K Motion Pro',prompt:'A cinematic sunrise',imageCount:0}).ok,false);
});
test('rejects Create in character swap',()=>{
 assert.equal(simulateK4KJourney({mode:'Character swap',model:'K4K Create',prompt:'Swap character',imageCount:1}).ok,false);
});
test('rejects missing prompt and missing reference image',()=>{
 assert.equal(simulateK4KJourney({mode:'Text to video',model:'K4K Create',prompt:'',imageCount:0}).ok,false);
 assert.equal(simulateK4KJourney({mode:'Character swap',model:'K4K Motion Lite',prompt:'Swap character',imageCount:0}).ok,false);
});
