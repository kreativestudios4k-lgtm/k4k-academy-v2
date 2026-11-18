import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATION_MODELS,creationModels,motionProviderEstimate} from '../lib/creation-studio-catalog.mjs';
import {readFileSync} from 'node:fs';

test('K4K Motion has exactly two public models, each bound to its real Higgsfield endpoint',()=>{
 const models=CREATION_MODELS.filter(x=>x.premium);
 assert.deepEqual(models.map(x=>x.id),['k4k-motion-lite','k4k-motion-ultra']);
 assert.deepEqual(models.map(x=>x.name),['K4K Motion Lite','K4K Motion Ultra']);
 const [lite,ultra]=models;
 assert.equal(lite.providerModelId,'higgsfield/genjutsu-light/motion-transfer/v1.0');
 assert.equal(ultra.providerModelId,'higgsfield/genjutsu/motion-transfer/v1.0');
 assert.equal(lite.cta,'/k4k-app/motion?model=lite');
 assert.equal(ultra.cta,'/k4k-app/motion?model=ultra');
 for(const model of models){
  assert.equal(model.status,'active');
  assert.deepEqual(model.resolution,['480p','720p','1080p']);
  assert.deepEqual(model.duration,[4,30]);
  assert.equal(model.premium,true);
 }
});
test('Wan remains a standard video model with the same existing generation route',()=>{
 const wan=CREATION_MODELS.find(x=>x.id==='wan-prime');
 assert.equal(wan.category,'video-create');
 assert.equal(wan.name,'Wan 3');
 assert.equal(wan.cta,'/k4k-app/creator');
 assert.ok(creationModels('video').includes(wan));
});
test('Lite outputs only first 15 seconds; Ultra retains its full 30 seconds; estimates are not confirmed customer charges',()=>{
 const lite=CREATION_MODELS.find(x=>x.id==='k4k-motion-lite');
 const ultra=CREATION_MODELS.find(x=>x.id==='k4k-motion-ultra');
 assert.equal(motionProviderEstimate(lite,10).usd,0.739);
 assert.equal(motionProviderEstimate(lite,30,'720p').usd,2.2065);
 assert.equal(motionProviderEstimate(lite,30,'1080p').usd,4.404);
 assert.equal(motionProviderEstimate(lite,30,'1080p').billedSeconds,15);
 assert.equal(motionProviderEstimate(ultra,10).usd,1.54);
 assert.equal(motionProviderEstimate(ultra,10,'720p').usd,3.446);
 assert.equal(motionProviderEstimate(ultra,30).usd,4.62);
 assert.equal(motionProviderEstimate(ultra,30).billedSeconds,30);
 assert.equal(motionProviderEstimate(lite,4).customerPriceApproved,false);
 assert.throws(()=>motionProviderEstimate(lite,3),/MOTION_ESTIMATE_INVALID/);
});
test('client discovery hides upstream vendor and retains verified Motion Director',()=>{
 const existing=readFileSync(new URL('../app/k4k-app/creator/page.js',import.meta.url),'utf8');
 assert.match(existing,/WAN 3 VIDEO STUDIO/);
 const page=readFileSync(new URL('../app/k4k-app/create/page.js',import.meta.url),'utf8');
 assert.doesNotMatch(page,/motionProviderEstimate|Genjutsu|Higgsfield/);
 assert.match(page,/Create through the live K4K Motion Director/);
});
