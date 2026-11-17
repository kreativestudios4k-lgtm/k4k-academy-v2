import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('old Explore address resolves to the same feed nested inside K4K Motion',()=>{
 assert.match(read('app/k4k-app/explore/page.js'),/redirect\('\/k4k-app\/motion\/explore'\)/);
 const page=read('app/k4k-app/motion/explore/page.js');
 assert.match(page,/MobileTemplateFeed motionIntegrated/);
});
test('feed preserves original preview and connects a supported template by ID',()=>{
 const feed=read('app/k4k-app/MobileTemplateFeed.js');
 assert.match(feed,/catalogue\.discoveryPreviews/);
 assert.match(feed,/<TemplateCreateSheet item=\{createItem\}/);
 assert.match(feed,/generationReference\(item\)\.supported/);
 assert.match(feed,/\/k4k-app\/motion\?template=/);
 assert.match(feed,/encodeURIComponent\(item\.id\)/);
 assert.match(feed,/Preview character setup/);
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
 for(const value of ['customer-preview-media','customer-preview-estimate','CustomerGeneration','verifyUploads'])assert.ok(studio.includes(value),value);
});
