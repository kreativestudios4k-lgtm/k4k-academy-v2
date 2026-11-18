import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const popup=readFileSync(new URL('../app/k4k-app/VideoGenerationPopup.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/k4k-app/video-generation-popup.css',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/k4k-app/create/page.js',import.meta.url),'utf8');

test('video popup is wired to existing model and generation quote, not new billing',()=>{
 assert.match(page,/VideoGenerationPopup/);
 assert.match(page,/function openVideoPopup\(\)/);
 assert.match(page,/model\.aspect\.includes\('16:9'\)/);
 assert.match(popup,/CustomerCreativeGeneration/);
 assert.match(popup,/referenceCount=\{files\.length\}/);
 assert.match(popup,/role="dialog" aria-modal="true"/);
 assert.match(popup,/setOpen\(false\)/);
});

test('latest completed video is obtained from existing authenticated owner-scoped library',()=>{
 assert.match(popup,/auth\.getSession\(\)/);
 assert.match(popup,/action:'list'/);
 assert.match(popup,/media_kind==='video'&&job\.status==='completed'/);
 assert.match(popup,/action:'download',jobId:latest\.id,download:false/);
 assert.match(popup,/preload="metadata"/);
 assert.match(popup,/autoPlay muted loop playsInline/);
 assert.match(popup,/object-fit:contain|k4k-video-popup-stage/);
 assert.doesNotMatch(popup,/HF_CREDENTIALS|SUPABASE_SERVICE_ROLE_KEY|FAL_KEY/);
});

test('16:9 result preview contains full video without crop and works responsively',()=>{
 assert.match(css,/\.k4k-video-popup-stage\{[^}]*aspect-ratio:16\/9/);
 assert.match(css,/\.k4k-video-popup-stage video\{[^}]*object-fit:contain/);
 assert.match(css,/@media\(max-width:850px\)/);
 assert.match(page,/kind==='image'&&model\.status==='provider-verified'&&<CustomerCreativeGeneration/);
});
