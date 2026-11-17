import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('old Explore address resolves to the same feed nested inside K4K Motion',()=>{
 assert.match(read('app/k4k-app/explore/page.js'),/redirect\('\/k4k-app\/motion\/explore'\)/);
 const page=read('app/k4k-app/motion/explore/page.js');
 assert.match(page,/MotionExploreGallery/);
});
test('Motion Explore preserves the video catalogue and links every eligible scene to Director Studio',()=>{
 const gallery=read('app/k4k-app/motion/MotionExploreGallery.js');
 assert.match(gallery,/catalogue\.discoveryPreviews/);
 assert.match(gallery,/catalogue\.trending/);
 assert.match(gallery,/generationReference\(t\)/);
 assert.match(gallery,/\/k4k-app\/motion\?template=/);
 assert.match(gallery,/encodeURIComponent\(current\.id\)/);
 assert.match(gallery,/Motion Transfer/);
 assert.doesNotMatch(gallery,/fluxfield-feed\.css/);
});
test('Director Studio preselects only an eligible catalogue template',()=>{
 const page=read('app/k4k-app/motion/page.js');
 const studio=read('app/k4k-app/higgsfield-preview/page.js');
 const editor=read('app/k4k-app/motion/MotionEditor.js');
 assert.match(page,/\^k4k-\\d\{3\}\$/);
 assert.match(page,/templates\.some\(t=>t\.id===requestedTemplate\)/);
 assert.match(page,/initialTemplateId=\{initialTemplateId\}/);
 assert.match(studio,/templates\.some\(t=>t\.id===initialTemplateId\)/);
 assert.match(editor,/initialTemplateId/);
});
test('original billing and media verification handlers are untouched by feed integration',()=>{
 const studio=read('app/k4k-app/higgsfield-preview/page.js');
 for(const value of ['customer-preview-media','CustomerGeneration','verifyUploads','priceFor'])assert.ok(studio.includes(value),value);
});
