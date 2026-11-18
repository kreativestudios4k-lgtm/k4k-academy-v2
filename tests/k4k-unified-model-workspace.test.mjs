import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicCreationModels,CREATION_MODELS} from '../lib/creation-studio-catalog.mjs';

const home=readFileSync(new URL('../app/k4k-app/CreativeHome.js',import.meta.url),'utf8');
const create=readFileSync(new URL('../app/k4k-app/create/page.js',import.meta.url),'utf8');

test('every public video and image card enters a single selected-model creator workspace',()=>{
 const all=[...publicCreationModels('video'),...publicCreationModels('image')];
 assert.equal(all.length,10);
 assert.ok(all.every(m=>m.id&&['video','image'].includes(m.kind)));
 assert.match(home,/function studioHref\(model\)/);
 assert.match(home,/return '\/k4k-app\/create\?kind='\+encodeURIComponent\(model\.kind\)\+'&model='\+encodeURIComponent\(model\.id\)/);
 assert.doesNotMatch(home,/function studioHref\(model\)\{\s*if\(model\.cta\)return model\.cta/);
 assert.match(home,/href=\{studioHref\(model\)\}/);
});

test('the studio honors deep-linked models and exposes all six video cards including Motion',()=>{
 assert.match(create,/CREATION_MODELS\.find\(m=>m\.id===params\.get\('model'\)&&m\.kind===requestedKind\)/);
 assert.match(create,/publicCreationModelGroups\(kind\)\.map\(group=>/);
 assert.doesNotMatch(create,/publicCreationModelGroups\(kind\)\.filter\(group=>group\.id!=='swap'\)/);
 assert.match(create,/publicCreationModels\(kind\)\.length/);
 assert.match(create,/setKind\(next\.kind\)/);
 assert.match(create,/window\.history\.replaceState\(null,'',nextUrl\)/);
});

test('K4K Cinema opens the full workspace first with inline signed-quote controls',()=>{
 assert.match(create,/setGeneratorOpen\(false\)/);
 assert.doesNotMatch(create,/setGeneratorOpen\(next\.id==='kling4_hf'\)/);
 assert.match(create,/!model\.cta&&model\.status==='provider-verified'&&<CustomerCreativeGeneration/);
 assert.match(create,/model\.id==='kling4_hf'&&<button/);
 assert.match(create,/Optional two-panel preview/);
 assert.match(create,/<VideoGenerationPopup open=\{generatorOpen\}/);
});

test('existing Motion and Wan providers remain separate, with explicit functional handoffs',()=>{
 const motionLite=CREATION_MODELS.find(m=>m.id==='k4k-motion-lite');
 const motionUltra=CREATION_MODELS.find(m=>m.id==='k4k-motion-ultra');
 const wan=CREATION_MODELS.find(m=>m.id==='wan-prime');
 assert.equal(motionLite.cta,'/k4k-app/motion?model=lite');
 assert.equal(motionUltra.cta,'/k4k-app/motion?model=ultra');
 assert.equal(wan.cta,'/k4k-app/creator');
 assert.match(create,/model\.cta&&<div className="kcs-note kcs-specialist-intro"/);
 assert.match(create,/!model\.cta&&<>/);
 assert.match(create,/model\.cta\?<Link className="kcs-launch" href=\{model\.cta\}/);
 assert.match(create,/model\.premium\?'Continue to Motion Director'/);
 assert.match(create,/No credits are charged in this model showcase/);
});
