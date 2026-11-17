import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generationReference} from '../lib/template-generation.mjs';
import {motionCreditPreview} from '../lib/generation-experience.mjs';
const cat=JSON.parse(readFileSync(new URL('../app/k4k-app/template-catalogue.json',import.meta.url),'utf8'));
test('ten supplied K4K Originals have verified preview lengths and fail closed outside template generation limits',()=>{
 assert.equal(cat.trending.length,0);
 assert.equal(cat.discoveryPreviews.length,10);
 for(const item of cat.discoveryPreviews){
  const r=generationReference(item);
  assert.equal(r.supported,item.durationSeconds<=15,item.id);
  assert.equal(item.previewOnly,item.durationSeconds>15,item.id);
  if(r.supported)assert.ok(motionCreditPreview('lite',r.seconds).credits>0);
 }
});
test('invalid duration fails closed',()=>{
 assert.equal(generationReference({videoUrl:'https://example.com/video.mp4',durationSeconds:15.01}).supported,false);
});
