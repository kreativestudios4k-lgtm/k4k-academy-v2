import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {generationReference} from '../lib/template-generation.mjs';import {motionCreditPreview} from '../lib/generation-experience.mjs';import {genjutsuEstimate} from '../lib/server/higgsfield-genjutsu-motion.mjs';
const catalogue=JSON.parse(readFileSync(new URL('../app/k4k-app/template-catalogue.json',import.meta.url),'utf8'));
test('all ten public K4K Originals support real 4–30 second references',()=>{
 const originals=catalogue.discoveryPreviews;assert.equal(originals.length,10);assert.ok(originals.every(t=>t.k4kOriginal===true&&t.videoUrl.startsWith('https://v3b.fal.media/')));
 const ids=new Set(originals.map(t=>t.id));assert.equal(ids.size,10);
 for(const item of originals){const r=generationReference(item);assert.equal(r.supported,true,item.id);assert.equal(item.previewOnly,false,item.id);assert.ok(r.seconds>=4&&r.seconds<=30);assert.ok(genjutsuEstimate({sourceSeconds:r.seconds,resolution:'480p'}).usd>0);}
});
test('legacy internal catalogue references retain accurate generation estimates but are not public library entries',()=>{
 for(const item of catalogue.trending){const r=generationReference(item);assert.equal(r.supported,true,item.id);assert.ok(motionCreditPreview('lite',r.seconds).credits>0);if(item.durationSeconds>15)assert.notEqual(r.url,item.videoUrl)}
});
test('invalid duration fails closed',()=>{assert.equal(generationReference({videoUrl:'https://example.com/video.mp4',durationSeconds:30.01}).supported,false)});
