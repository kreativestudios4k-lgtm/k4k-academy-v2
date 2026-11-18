import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const studio=read('app/k4k-app/higgsfield-preview/page.js');
const css=read('app/k4k-app/higgsfield-preview/motion-library-redesign.css');
const catalogue=read('lib/creation-studio-catalog.mjs');
const create=read('app/k4k-app/create/page.js');
test('Motion Library provides a distinct Recreate CTA only for generation-eligible originals',()=>{
 assert.match(studio,/canRecreate=templates\.some\(ready=>ready\.id===t\.id\)/);
 assert.match(studio,/canRecreate&&<button type="button" className="khm-lib-recreate"/);
 assert.match(studio,/\>Recreate<\/button>/);
 assert.match(studio,/aria-label=\{'Preview '\+t\.title\}/);
 assert.match(studio,/setPreviewOriginalId\(t\.id\)/);
 assert.match(studio,/selectSourceTemplate\(t\.id\)/);
 assert.match(studio,/scrollIntoView\(\{behavior:'smooth',block:'center'\}\)/);
 assert.match(studio,/Preview only · longer than supported generation/);
 assert.ok(!studio.includes('<button type="button" key={t.id} aria-pressed='));
 assert.match(css,/\.khm-lib-poster \.khm-lib-recreate/);
});
test('Recreate does not bypass verified uploads or charging confirmation',()=>{
 assert.match(studio,/async function verifyUploads/);
 assert.match(studio,/CustomerGeneration/);
 assert.match(studio,/By confirming generation, you confirm you have permission/);
 assert.match(studio,/if\(!castReady\)/);
});
test('Premium Motion cards direct to the production-gated Director, not an owner pilot dead end',()=>{
 for(const id of ['k4k-motion-lite','k4k-motion-ultra']){
  const s=catalogue.slice(catalogue.indexOf("{id:'"+id+"'"));
  assert.ok(s.slice(0,s.indexOf('},')+2).includes("cta:'/k4k-app/motion?model="+ (id==='k4k-motion-lite'?'lite':'ultra')+"'"),id);
  assert.ok(s.slice(0,s.indexOf('},')+2).includes("status:'active'"),id);
 }
 assert.match(create,/Open K4K Motion/);
 assert.ok(!create.includes('Generation and credit checkout are not yet available.'));
});
