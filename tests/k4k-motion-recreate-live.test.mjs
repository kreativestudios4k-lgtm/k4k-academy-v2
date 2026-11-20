import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const studio=read('app/k4k-app/higgsfield-preview/page.js');
const css=read('app/k4k-app/embedded-motion-studio.css');
const modal=read('app/k4k-app/MotionTemplatePreview.js');
const gated=read('app/k4k-app/EmbeddedMotionStudio.js');
const catalogue=read('lib/creation-studio-catalog.mjs');
const create=read('app/k4k-app/create/page.js');

test('Motion cards open full video preview; hovering exposes Recreate for eligible originals',()=>{
 assert.match(studio,/canRecreate=templates\.some\(ready=>ready\.id===t\.id\)/);
 assert.match(studio,/canRecreate&&<button type="button" className="khm-lib-recreate"/);
 assert.match(studio,/openTemplatePreview\(t\.id\)/);
 assert.match(studio,/aria-label=\{'Open preview of '\+t\.title\}/);
 assert.match(studio,/Recreate <Play size=\{14\}\/>/);
 assert.match(studio,/MotionTemplatePreview/);
 assert.match(css,/\.khm-lib-recreate/);
 assert.match(css,/\.khm-lib-card:hover/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(modal,/role="dialog" aria-modal="true"/);
 assert.match(modal,/video key=\{template\.id\} src=\{template\.videoUrl\} controls/);
 assert.match(modal,/onChooseTemplate\(item\.id\)/);
 assert.match(modal,/canRecreate\?<button className="k4km-recreate-primary"/);
 assert.match(modal,/onRecreate/);
});

test('Recreate selects authorized source and exposes avatar photo slots without bypassing signed billing',()=>{
 assert.match(studio,/if\(busy\|\|!modalTemplateId\|\|!templates\.some\(t=>t\.id===modalTemplateId\)\)return/);
 assert.match(studio,/selectSourceTemplate\(modalTemplateId\)/);
 assert.match(studio,/scrollIntoView\(\{behavior:'smooth',block:'center'\}\)/);
 assert.match(studio,/setTemplateId\(id\);setVideo\(null\);uploaded\.current=null/);
 assert.match(studio,/DirectorView images=\{images\}/);
 assert.match(studio,/async function verifyUploads/);
 assert.match(studio,/CustomerGeneration/);
 assert.match(studio,/By confirming generation, you confirm you have permission/);
 assert.match(studio,/if\(!castReady\)/);
});

test('Access-gated Motion still offers previews but never falsely enables Recreate or customer billing',()=>{
 assert.match(gated,/MotionTemplatePreview/);
 assert.match(gated,/canRecreate=\{canPrepareDraft\(selected\)\} draftOnly/);
 assert.match(gated,/addAvatarFiles/);
 assert.match(gated,/URL\.createObjectURL/);
 assert.match(gated,/setPreparedId\(selected\.id\)/);
 assert.match(gated,/Your images stay on this device and are not uploaded or charged/);
 assert.match(gated,/Generate · unavailable/);
 assert.match(gated,/Generate · unavailable/);
 assert.match(gated,/const allowed=!!config\?\.enabled/);
 assert.match(gated,/templates=\{config\.templates\}/);
 assert.match(modal,/Viewing a video never charges credits/);
});

test('Premium Motion catalogue retains existing server-guarded routes',()=>{
 for(const id of ['k4k-motion-lite','k4k-motion-ultra']){
  const s=catalogue.slice(catalogue.indexOf("{id:'"+id+"'"));
  assert.ok(s.slice(0,s.indexOf('},')+2).includes("cta:'/k4k-app/motion?model="+ (id==='k4k-motion-lite'?'lite':'ultra')+"'"),id);
 }
 assert.match(create,/Continue to Motion Director/);
 assert.ok(!create.includes('Generation and credit checkout are not yet available.'));
});
