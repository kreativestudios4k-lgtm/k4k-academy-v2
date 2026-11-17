import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {generationReference} from '../lib/template-generation.mjs';import {motionCreditPreview} from '../lib/generation-experience.mjs';
const catalogue=JSON.parse(readFileSync(new URL('../app/k4k-app/template-catalogue.json',import.meta.url),'utf8'));
test('public K4K Originals are limited to ten uploaded videos; long references cannot be generated',()=>{
 const originals=catalogue.discoveryPreviews;assert.equal(originals.length,10);assert.ok(originals.every(t=>t.k4kOriginal===true&&t.videoUrl.startsWith('https://v3b.fal.media/')));
 const ids=new Set(originals.map(t=>t.id));assert.equal(ids.size,10);
 for(const item of originals){const r=generationReference(item);if(item.durationSeconds>15){assert.equal(r.supported,false,item.id);assert.equal(item.previewOnly,true,item.id);}else{assert.equal(r.supported,true,item.id);assert.ok(motionCreditPreview('lite',r.seconds).credits>0);}}
});
test('legacy internal catalogue references retain accurate generation estimates but are not public library entries',()=>{
 for(const item of catalogue.trending){const r=generationReference(item);assert.equal(r.supported,true,item.id);assert.ok(motionCreditPreview('lite',r.seconds).credits>0);if(item.durationSeconds>15)assert.notEqual(r.url,item.videoUrl)}
});
test('invalid duration fails closed',()=>{assert.equal(generationReference({videoUrl:'https://example.com/video.mp4',durationSeconds:15.01}).supported,false)});
