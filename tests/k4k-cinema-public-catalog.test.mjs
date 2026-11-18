import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CREATION_MODELS,creationModels,publicCreationModels,publicCreationModelGroups} from '../lib/creation-studio-catalog.mjs';
import {CUSTOMER_CREATIVE_MODELS} from '../lib/server/creative-customer-policy.mjs';

const home=readFileSync(new URL('../app/k4k-app/CreativeHome.js',import.meta.url),'utf8');
const create=readFileSync(new URL('../app/k4k-app/create/page.js',import.meta.url),'utf8');
const popup=readFileSync(new URL('../app/k4k-app/VideoGenerationPopup.js',import.meta.url),'utf8');

test('public K4K catalogue shows one Cinema model, no duplicate Kling 4.0 or Flash cards',()=>{
 const publicVideo=publicCreationModels('video');
 assert.equal(publicVideo.filter(x=>x.id==='kling4_hf').length,1);
 assert.equal(publicVideo.filter(x=>['kling4_0','kling_4_0_flash'].includes(x.id)).length,0);
 assert.equal(publicCreationModels('image').length,4);
 assert.equal(publicVideo.length,6);
 assert.equal(publicCreationModelGroups('video').find(g=>g.id==='production').models.filter(m=>m.id==='kling4_hf').length,1);
 const m=publicVideo.find(x=>x.id==='kling4_hf');
 assert.equal(m.name,'K4K Cinema');
 assert.match(m.description,/powered by Kling 4\.0/);
 assert.equal(m.provider,'Higgsfield');
 assert.ok(m.demoUrl?.endsWith('.mp4'));
});

test('existing provider IDs and signed billing model mapping remain unchanged',()=>{
 assert.equal(CREATION_MODELS.length,12);
 assert.equal(creationModels('video').length,8);
 assert.ok(CREATION_MODELS.some(x=>x.id==='kling4_0'));
 assert.ok(CREATION_MODELS.some(x=>x.id==='kling_4_0_flash'));
 assert.equal(CUSTOMER_CREATIVE_MODELS.kling4_0.endpoint,'kling/v4/text-to-video');
 assert.equal(CUSTOMER_CREATIVE_MODELS.kling4_hf.endpoint,'kling-video/v4.0/text-to-video');
});

test('homepage, model selector and popup use the public Cinema name and hide duplicates',()=>{
 assert.ok(home.includes("'kling4_hf'"));
 assert.ok(!home.includes("'kling4_0'"));
 assert.ok(!home.includes("'kling_4_0_flash'"));
 assert.ok(create.includes('publicCreationModels(kind)'));
 assert.ok(create.includes('publicCreationModelGroups(kind)'));
 assert.ok(create.includes("publicCreationModels(next)[0]"));
 // Explicit old URLs can still pick their original model — never remap a signed old job.
 assert.ok(create.includes('CREATION_MODELS.find(m=>m.id===params.get'));
 assert.ok(create.includes("model.id==='kling4_hf'"));
 assert.match(popup,/K4K CINEMA · 16:9 SAMPLE/);
 assert.match(popup,/Powered by Kling 4\.0/);
 assert.ok(!popup.includes('<strong>Kling 4.0 · Higgsfield</strong>'));
});
