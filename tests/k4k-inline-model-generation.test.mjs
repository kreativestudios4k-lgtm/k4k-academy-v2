import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const compact=read('app/k4k-app/CompactCreationStudio.js');
const motion=read('app/k4k-app/EmbeddedMotionStudio.js');
const gated=read('app/api/k4k-motion/creator-config/route.js');
const director=read('app/k4k-app/higgsfield-preview/page.js');
const motionGeneration=read('app/k4k-app/higgsfield-preview/customer-generation.js');
const wan=read('app/k4k-app/creator/page.js');
const textGeneration=read('app/k4k-app/CustomerCreativeGeneration.js');
const css=read('app/k4k-app/embedded-motion-studio.css');

test('all models remain in same parent compact generator with in-page model selection',()=>{
 assert.match(compact,/Switch AI model/);
 assert.match(compact,/onSelectModel\(item\)/);
 assert.match(compact,/model\.premium\?<section className="kcp-motion-section"/);
 assert.match(compact,/<EmbeddedMotionStudio key=\{model\.motionModel\} model=\{model\}\/>/);
 assert.match(compact,/model\.id==="wan-prime"\?<section className="kcp-wan-section"/);
 assert.match(compact,/<WanCreator embedded\/>/);
 assert.match(compact,/stayInWorkspace model=\{model\}/);
});

test('Motion Lite and Ultra use server release-gated embedded gallery and the signed existing customer flow',()=>{
 assert.match(gated,/higgsfieldFlowEnabled\(\)/);
 assert.match(gated,/genjutsuCustomerMaxUsd\(quality\)/);
 assert.match(gated,/K4K_HIGGSFIELD_LIGHT_RATE_CARD_APPROVED/);
 assert.match(gated,/generationReference\(item,\{maxSeconds:30\}\)/);
 assert.match(gated,/Cache-Control':'private, no-store/);
 assert.match(motion,/fetch\('\/api\/k4k-motion\/creator-config',\{cache:'no-store'\}\)/);
 assert.match(motion,/config\?\.enabled/);
 assert.match(motion,/model\.motionModel==='ultra'\|\|config\.liteEnabled/);
 assert.match(motion,/customer embedded/);
 assert.match(motion,/initialMotionModel=\{model\.motionModel\}/);
 assert.match(motion,/templates=\{config\.templates\}/);
 assert.match(motion,/MotionUnavailable/);
 assert.match(director,/embedded=false/);
 assert.match(director,/stayInWorkspace=\{embedded\}/);
 assert.match(director,/onPrepareMedia=\{verifyUploads\}/);
 assert.match(director,/CustomerGeneration/);
 assert.match(motionGeneration,/request\('prepare'/);
 assert.match(motionGeneration,/request\('submit'/);
 assert.match(motionGeneration,/stayInWorkspace=false/);
 assert.match(motionGeneration,/customer&&!stayInWorkspace/);
 assert.match(css,/\.khm-motion-library/);
 assert.match(css,/\.khm-cast-panel/);
});

test('existing Wan 3 source video, character inputs and credit confirmation render inline, not a redirect to creator',()=>{
 assert.match(wan,/export default function Creator\(\{embedded=false\}\)/);
 assert.match(wan,/const Frame=embedded\?EmbeddedCreatorFrame:PreviewShell/);
 assert.match(wan,/return <Frame active="Creator" studio>/);
 assert.match(wan,/\/api\/generation\/jobs\/quote/);
 assert.match(wan,/\/api\/generation\/jobs\/submit/);
 assert.match(compact,/kcp-wan-section/);
});

test('image and text generation stay in current page, preserving signed quote and private downloads',()=>{
 assert.match(textGeneration,/action:'quote'/);
 assert.match(textGeneration,/action:'submit'/);
 assert.match(textGeneration,/if\(!stayInWorkspace\)window\.location\.assign/);
 assert.match(textGeneration,/action:'status'/);
 assert.match(textGeneration,/action:'download'/);
 assert.match(compact,/<CustomerCreativeGeneration key=\{model\.id\} stayInWorkspace/);
});
