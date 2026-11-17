import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const studio=read('app/k4k-app/create/page.js');
const motion=read('app/k4k-app/higgsfield-preview/page.js');
const gallery=read('app/k4k-app/motion/MotionExploreGallery.js');
const creative=read('app/k4k-app/CustomerCreativeGeneration.js');
test('image and video have a real searchable model picker with selected-model handoff',()=>{
 assert.match(studio,/modelPickerOpen/);
 assert.match(studio,/visiblePickerModels/);
 assert.match(studio,/role="dialog" aria-modal="true" aria-label="Choose creation model"/);
 assert.match(studio,/aria-label="Search models"/);
 assert.match(studio,/onClick=\{\(\)=>chooseModel\(item\)\}/);
 assert.match(studio,/03 · Generate/);
});
test('Motion asset sheet selects genuine verified presets and still offers own MP4 uploads',()=>{
 assert.match(motion,/assetsOpen/);
 assert.match(motion,/assetsTab==='presets'/);
 assert.match(motion,/filteredAssets/);
 assert.match(motion,/function selectSourceTemplate\(id\)/);
 assert.match(motion,/setTemplateId\(id\)/);
 assert.match(motion,/aria-label="Choose motion reference video"/);
 assert.match(motion,/Use my own video/);
 assert.match(motion,/accept="video\/mp4"/);
 assert.match(motion,/customer-preview-media/);
 assert.match(motion,/CustomerGeneration/);
});
test('Motion Explore Recreate uses full screen preview and exact template reference',()=>{
 assert.match(gallery,/kmx-recreate-dialog/);
 assert.match(gallery,/className="kmx-recreate-video"/);
 assert.match(gallery,/Recreate/);
 assert.match(gallery,/encodeURIComponent\(current\.id\)/);
 assert.match(gallery,/generationReference\(t\)/);
});
test('Image and Video Generate still require signed quote and separate charged confirmation',()=>{
 assert.match(creative,/\{busy\?'Preparing…':'Generate'\}/);
 assert.match(creative,/Confirm & Generate/);
 assert.match(creative,/action:'quote'/);
 assert.match(creative,/action:'submit'/);
 assert.match(creative,/quote\.quoteToken/);
 assert.match(creative,/kcs-generate-primary/);
 assert.doesNotMatch(creative,/Check credit cost/);
});
