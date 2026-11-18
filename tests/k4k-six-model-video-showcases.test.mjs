import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CREATION_MODELS,publicCreationModels} from '../lib/creation-studio-catalog.mjs';

const home=readFileSync(new URL('../app/k4k-app/CreativeHome.js',import.meta.url),'utf8');
const homeCss=readFileSync(new URL('../app/k4k-app/k4k-clean-home.css',import.meta.url),'utf8');
const studio=readFileSync(new URL('../app/k4k-app/ModelSelectionAnimation.js',import.meta.url),'utf8');
const studioCss=readFileSync(new URL('../app/k4k-app/model-selection-animation.css',import.meta.url),'utf8');

const approved=[
  {id:'seedance_2_5',media:'30f0a8e3-976f-40f8-9baf-17301d2fe35d',seconds:5,aspect:'16:9'},
  {id:'seedance_2_5_flash',media:'83bc6bb4-2f04-4df6-98c5-4e8bb2b31bca',seconds:7,aspect:'16:9'},
  {id:'wan-prime',media:'e65c2d3c-9d38-4c81-b737-d955819b794c',seconds:5,aspect:'16:9'},
  {id:'k4k-motion-lite',media:'24559df4-f9e6-406b-ba15-f7bdacfba6fc',seconds:7,aspect:'16:9'},
  {id:'k4k-motion-ultra',media:'b7002873-323b-4c9c-b7e2-b869f9307a2a',seconds:6,aspect:'9:16'},
];

test('all five uploaded clips are assigned to their intended catalog model, with genuine dimensions',()=>{
  for(const sample of approved){
    const model=CREATION_MODELS.find(m=>m.id===sample.id);
    assert.ok(model,sample.id);
    assert.match(model.demoUrl,new RegExp(sample.media+'\\.mp4$'));
    assert.match(model.demoUrl,/^https:\/\/d2ol7oe51mr4n9\.cloudfront\.net\//);
    assert.equal(model.demoDurationSec,sample.seconds);
    assert.equal(model.demoAspect,sample.aspect);
    assert.ok(!model.demoUrl.includes('example.com'));
  }
  const publicVideo=publicCreationModels('video');
  assert.equal(publicVideo.length,6);
  assert.equal(publicVideo.filter(m=>m.demoUrl).length,6);
  assert.equal(CREATION_MODELS.find(m=>m.id==='kling4_hf').name,'K4K Cinema');
  assert.equal(CREATION_MODELS.filter(m=>m.demoUrl).length,6);
});

test('home shows genuine examples on catalog cards and only plays media in view',()=>{
  assert.match(home,/function ModelArt\(\{model\}\)/);
  assert.match(home,/new IntersectionObserver/);
  assert.match(home,/video\.pause\(\)/);
  assert.match(home,/video\.play\(\)\.catch/);
  assert.match(home,/prefers-reduced-motion: reduce/);
  assert.match(home,/ref=\{videoRef\} src=\{model\.demoUrl\}/);
  assert.match(home,/preload="metadata"/);
  assert.match(home,/kc26-card-art-portrait/);
  assert.match(homeCss,/\.kc26-card-art-portrait video\{object-fit:contain/);
  assert.match(homeCss,/\.kc26-card-art video\{[^}]*object-fit:cover/);
});

test('studio uses real duration and source aspect rather than misleading 7s 16:9 labels',()=>{
  assert.match(studio,/model\.demoDurationSec/);
  assert.match(studio,/model\.demoAspect/);
  assert.match(studio,/model\.demoUrl\?/);
  assert.match(studio,/autoPlay muted loop playsInline/);
  assert.match(studioCss,/\.kcs-model-animation-stage>video\{[^}]*object-fit:contain/);
  assert.doesNotMatch(studio,/UPLOADED VIDEO · 7s/);
  assert.doesNotMatch(studio,/Autoplay demo · 16:9/);
});
