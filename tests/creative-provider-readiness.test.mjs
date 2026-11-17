import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VERIFIED_CREATIVE_MODELS,creativeModelReadiness} from '../lib/creative-provider-readiness.mjs';
import {CREATION_MODELS} from '../lib/creation-studio-catalog.mjs';
const ui=readFileSync(new URL('../app/k4k-app/create/page.js',import.meta.url),'utf8');
const ownerUi=readFileSync(new URL('../app/k4k-app/owner-qa/page.js',import.meta.url),'utf8');
const expected=['seedance_2_5','seedance_2_5_flash','kling4_0','kling_4_0_flash','nano_banana_2','flux_3_image','gpt_image_2_6','kling_omni_image'];
test('all named image and video models have explicit verified fal endpoint mappings and remain non-dispatchable',()=>{
 for(const id of expected){const item=CREATION_MODELS.find(x=>x.id===id);assert.ok(item,id);assert.equal(item.status,'provider-verified');assert.ok(VERIFIED_CREATIVE_MODELS[id]);for(const mode of item.modes){const p=creativeModelReadiness(id,mode);assert.equal(p.status,'provider-endpoint-verified',id+' / '+mode);assert.ok(/^[a-z0-9-]+\//.test(p.endpoint));assert.equal(p.canGenerate,false);assert.ok(p.requires.includes('signed-customer-quote'));}}
});
test('unsafe unknown and unsupported model inputs fail closed',()=>{assert.equal(creativeModelReadiness('bogus','Text to video').canGenerate,false);assert.equal(creativeModelReadiness('kling4_0','Image edit').canGenerate,false);assert.equal(creativeModelReadiness('kling_omni_image','Text to image').canGenerate,false)});
test('studio separates provider discovery from authenticated paid customer actions',()=>{assert.match(ui,/creativeModelReadiness\(model\.id,mode\)/);assert.match(ui,/<CustomerCreativeGeneration\b/);assert.match(ui,/onModels=\{setCustomerModels\}/);assert.match(ui,/selectedLive/);assert.match(ui,/model\.status==='provider-verified'/);assert.doesNotMatch(ui,/<OwnerCreativeQA\b/);assert.match(ownerUi,/<OwnerCreativeQA\b/);});
test('Seedance variable-token billing cannot be interpreted as seconds or a fixed per-run customer quote',()=>{const r=creativeModelReadiness('seedance_2_5','Text to video');assert.equal(r.pricing.unit,'1000 tokens');assert.equal(r.pricing.estimate,'unverified-token-usage');assert.equal(r.canGenerate,false)});
