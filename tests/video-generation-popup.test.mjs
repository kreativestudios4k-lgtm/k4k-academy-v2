import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CREATION_MODELS} from '../lib/creation-studio-catalog.mjs';

const popup=readFileSync(new URL('../app/k4k-app/VideoGenerationPopup.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/k4k-app/video-generation-popup.css',import.meta.url),'utf8');
const animation=readFileSync(new URL('../app/k4k-app/ModelSelectionAnimation.js',import.meta.url),'utf8');
const animationCSS=readFileSync(new URL('../app/k4k-app/model-selection-animation.css',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/k4k-app/create/page.js',import.meta.url),'utf8');

test('optional two-panel popup remains exclusive to K4K Cinema; standard studio is the default',()=>{
 assert.match(popup,/model\.id!=='kling4_hf'/);
 assert.match(page,/function openVideoPopup\(\)\{if\(model\.id!=='kling4_hf'\)return/);
 assert.match(page,/setGeneratorOpen\(false\)/);
 assert.doesNotMatch(page,/setGeneratorOpen\(next\.id==='kling4_hf'\)/);
 assert.match(page,/model\.id==='kling4_hf'&&<button/);
 assert.match(page,/!model\.cta&&model\.status==='provider-verified'&&<CustomerCreativeGeneration/);
 assert.match(popup,/CustomerCreativeGeneration/);
 assert.match(popup,/referenceCount=\{files\.length\}/);
 assert.match(popup,/role="dialog" aria-modal="true"/);
 assert.match(popup,/setOpen\(false\)/);
});

test('the actual uploaded seven-second Kling sample is used, never a private customer video',()=>{
 const model=CREATION_MODELS.find(m=>m.id==='kling4_hf');
 assert.equal(model.demoUrl,'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/42c52fd5-5fbe-48d8-afcf-3c61ed838d2f.mp4');
 assert.match(popup,/src=\{model\.demoUrl\}/);
 assert.match(popup,/controls autoPlay muted loop playsInline/);
 assert.match(popup,/Preview only/);
 assert.match(popup,/It is not the output of your prompt/);
 assert.doesNotMatch(popup,/action:'list'|action:'download'|auth\.getSession\(\)/);
 assert.equal(CREATION_MODELS.filter(m=>m.demoUrl).length,6);
});

test('all selected models get a truthful animated preview with 16:9 framing',()=>{
 assert.match(page,/<ModelSelectionAnimation key=\{model\.id\} model=\{model\}\/\>/);
 assert.match(animation,/model\.demoUrl\?/);
 assert.match(animation,/kcs-model-animation-art/);
 assert.match(animation,/Interface animation · not generated output/);
 assert.match(animationCSS,/\.kcs-model-animation-stage\{[^}]*aspect-ratio:16\/9/);
 assert.match(animationCSS,/@keyframes kcsModelAppear/);
 assert.match(css,/\.k4k-video-popup-stage\{[^}]*aspect-ratio:16\/9/);
 assert.match(css,/\.k4k-video-popup-stage video\{[^}]*object-fit:contain/);
 assert.match(css,/@media\(max-width:850px\)/);
});
