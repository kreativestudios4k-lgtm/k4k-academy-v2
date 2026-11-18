import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {defineModel} from '../lib/creation-catalog/define.mjs';
import {CREATION_MODELS} from '../lib/creation-studio-catalog.mjs';

const base={id:'probe',name:'Probe',provider:'Probe Co',kind:'image',category:'image',description:'A probe model',status:'provider-verified',resolution:['1K'],refs:0,modes:['Text to image'],aspect:['1:1']};
const probe=(patch={},drop=[])=>{const m={...base,...patch};for(const key of drop)delete m[key];return ()=>defineModel(m)};
const invalid=/CATALOG_INVALID/;

test('every declared model satisfies the field contract and the catalogue shape holds', ()=>{
 assert.equal(CREATION_MODELS.length, 12);
 assert.ok(Object.isFrozen(CREATION_MODELS));
 assert.equal(new Set(CREATION_MODELS.map(m=>m.id)).size, CREATION_MODELS.length);
 for(const model of CREATION_MODELS)assert.doesNotThrow(()=>defineModel(model), model.id);
 // Each model is declared in its own file, so a new model needs no studio change.
 const files=readdirSync(new URL('../lib/creation-catalog/models/', import.meta.url)).filter(f=>f.endsWith('.mjs'));
 assert.equal(files.length, CREATION_MODELS.length);
 for(const model of CREATION_MODELS)assert.ok(files.includes(model.id+'.mjs'), 'missing models/'+model.id+'.mjs');
 // The studio's import path is unchanged and carries no inline declarations.
 const entry=readFileSync(new URL('../lib/creation-studio-catalog.mjs', import.meta.url), 'utf8');
 assert.match(entry, /export \{CREATION_MODELS\} from '\.\/creation-catalog\/index\.mjs'/);
 assert.doesNotMatch(entry, /providerModelId/);
});

test('a premium tier prices every resolution it offers, and offers every resolution it prices', ()=>{
 const premium=CREATION_MODELS.filter(m=>m.premium);
 assert.equal(premium.length, 2);
 for(const model of premium){
  for(const res of model.resolution)assert.ok(Number.isFinite(model.ratesUsdPerSecond[res])&&model.ratesUsdPerSecond[res]>0, model.id+' / '+res);
  assert.deepEqual(Object.keys(model.ratesUsdPerSecond).sort(), [...model.resolution].sort(), model.id);
  assert.ok(model.providerModelId);
  assert.ok(['lite','ultra'].includes(model.motionModel));
 }
 // A resolution in the picker with no rate behind it throws at quote time, in
 // front of the customer, so the contract refuses the declaration instead.
 assert.throws(probe({kind:'video',duration:[4,30],premium:true,motionModel:'lite',cta:'/x',providerModelId:'p/x',usdPerSecond:0.1,resolution:['480p','720p'],ratesUsdPerSecond:{'480p':0.1}}), invalid);
 assert.throws(probe({kind:'video',duration:[4,30],premium:true,motionModel:'lite',cta:'/x',providerModelId:'p/x',usdPerSecond:0.1,resolution:['480p'],ratesUsdPerSecond:{'480p':0.1,'4K':9}}), invalid);
 assert.throws(probe({kind:'video',duration:[4,30],premium:true,motionModel:'lite',cta:'/x',usdPerSecond:0.1,resolution:['480p'],ratesUsdPerSecond:{'480p':0.1}}), invalid);
 assert.throws(probe({usdPerSecond:0.1}), invalid);
});

test('a typo in a declared field fails the build instead of silently narrowing the studio', ()=>{
 assert.doesNotThrow(probe());
 assert.throws(probe({resolutions:['1K','2K']}), invalid);
 assert.throws(probe({reference_images:4}), invalid);
 assert.throws(probe({}, ['id']), invalid);
});

test('the contract rejects declarations the studio could not render', ()=>{
 assert.throws(probe({kind:'audio'}), invalid);
 assert.throws(probe({category:'everything'}), invalid);
 assert.throws(probe({status:'coming-soon'}), invalid);
 assert.throws(probe({}, ['name']), invalid);
 assert.throws(probe({description:'   '}), invalid);
 assert.throws(probe({resolution:[]}), invalid);
 assert.throws(probe({modes:[]}), invalid);
 assert.throws(probe({aspect:['1:1','']}), invalid);
 assert.throws(probe({refs:-1}), invalid);
 assert.throws(probe({refs:2.5}), invalid);
 assert.throws(probe({displayProvider:''}), invalid);
});

test('duration is required of a video model and refused of an image model', ()=>{
 assert.throws(probe({duration:[5,5]}), invalid);
 assert.throws(probe({kind:'video',category:'video-create'}), invalid);
 assert.doesNotThrow(probe({kind:'video',category:'video-create',duration:[5,5]}));
 assert.throws(probe({kind:'video',category:'video-create',duration:[30,4]}), invalid);
 assert.throws(probe({kind:'video',category:'video-create',duration:[0,30]}), invalid);
 assert.throws(probe({kind:'video',category:'video-create',duration:[4,30,60]}), invalid);
 assert.throws(probe({kind:'video',category:'video-create',duration:[4.5,30]}), invalid);
});

test('a demo tile declares its url, duration and aspect together or not at all', ()=>{
 assert.doesNotThrow(probe({demoUrl:'https://example.com/a.mp4',demoDurationSec:5,demoAspect:'16:9'}));
 assert.throws(probe({demoUrl:'https://example.com/a.mp4',demoAspect:'16:9'}), invalid);
 assert.throws(probe({demoUrl:'https://example.com/a.mp4',demoDurationSec:5}), invalid);
 assert.throws(probe({demoDurationSec:5}), invalid);
 assert.throws(probe({demoUrl:'http://example.com/a.mp4',demoDurationSec:5,demoAspect:'16:9'}), invalid);
 for(const model of CREATION_MODELS.filter(m=>m.demoUrl))assert.ok(model.demoUrl.startsWith('https://')&&model.demoDurationSec>0&&model.demoAspect, model.id);
});

test('reference-image caps are the ones the providers actually allow', ()=>{
 const caps=Object.fromEntries(CREATION_MODELS.map(m=>[m.id,m.refs]));
 assert.equal(caps.gpt_image_2_6, 16);
 assert.equal(caps['k4k-motion-lite'], 8);
 assert.equal(caps['k4k-motion-ultra'], 8);
 assert.equal(caps.seedance_2_5, 0);
 assert.equal(caps.kling4_hf, 0);
});
