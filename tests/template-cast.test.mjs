import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {templateCast,castReady} from '../lib/template-cast.mjs';
const cat=JSON.parse(readFileSync('app/k4k-app/template-catalogue.json','utf8'));
test('replacement counts for new K4K Originals remain unverified until customer confirmation',()=>{
 assert.equal(cat.discoveryPreviews.length,10);
 for(const clip of cat.discoveryPreviews){
  assert.deepEqual(templateCast(clip),{count:null,verified:false,initialCount:0,needsConfirmation:true},clip.id);
 }
});
test('all four numbered slots must have a photo and source-person description before quoting',()=>{
 const files=[{},{},{},{}],targets=['first speaker','second speaker','third speaker','fourth speaker'];
 assert.equal(castReady({count:4,files,targets,confirmed:true}),true);
 assert.equal(castReady({count:4,files:[{},null,{},{}],targets,confirmed:true}),false);
 assert.equal(castReady({count:4,files:files.slice(0,3),targets,confirmed:true}),false);
 assert.equal(castReady({count:4,files,targets:['first speaker','','third speaker','fourth speaker'],confirmed:true}),false);
 assert.equal(castReady({count:4,files,targets,confirmed:false}),false);
});
