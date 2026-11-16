import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('K4K Motion is a dedicated motion editor, not the old Fluxfield swipe feed',()=>{
 const page=src('app/k4k-app/motion/page.js'),studio=src('app/k4k-app/motion/MotionEditor.js'),css=src('app/k4k-app/motion/motion-editor.css');
 assert.match(page,/MotionEditor/);assert.doesNotMatch(page,/MobileTemplateFeed|fluxfield/);
 assert.doesNotMatch(studio,/MobileTemplateFeed|fluxfield-feed/);
 assert.match(studio,/Motion Transfer/);assert.match(studio,/Object Swap/);
 assert.match(studio,/Motion Library/);assert.match(studio,/Use this template/);
 assert.match(css,/grid-template-columns:minmax\(335px,435px\)/);
});
test('Motion editor uses K4K uploaded catalogue, supported template check and existing authenticated template creation flow',()=>{
 const studio=src('app/k4k-app/motion/MotionEditor.js');
 assert.match(studio,/catalogue\.trending/);assert.match(studio,/catalogue\.discoveryPreviews/);
 assert.match(studio,/generationReference\(item\)\.supported/);
 assert.match(studio,/<TemplateCreateSheet item=\{sheet\}/);
 assert.match(studio,/K4K Motion Lite, Pro and Ultra are still in API pilot/);
 assert.match(studio,/\/k4k-app\/videos/);
 assert.match(studio,/\/k4k-app\/creator/);
});
test('Motion template reference videos and customer generations remain separate',()=>{
 const library=src('app/k4k-app/videos/page.js');
 assert.match(library,/<VideoLibrary\/>/);
 assert.doesNotMatch(library,/template-catalogue/);
 const sheet=src('app/k4k-app/TemplateCreateSheet.js');
 assert.match(sheet,/\/api\/generation\/jobs\/quote/);
 assert.match(sheet,/\/api\/generation\/jobs\/submit/);
});
