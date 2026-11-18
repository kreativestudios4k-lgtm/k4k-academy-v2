import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CREATION_MODELS,publicCreationModels} from '../lib/creation-studio-catalog.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('app/k4k-app/create/page.js');
const compact=read('app/k4k-app/CompactCreationStudio.js');
const css=read('app/k4k-app/compact-creation-studio.css');

test('compact Input / Result generator is the default for selected model links',()=>{
 assert.match(page,/import CompactCreationStudio from '\.\.\/CompactCreationStudio'/);
 assert.match(page,/if\(!classicView\)return <CompactCreationStudio/);
 assert.match(page,/get\('classic'\)==='1'/);
 assert.match(page,/CREATION_MODELS\.find\(m=>m\.id===params\.get\('model'\)&&m\.kind===requestedKind\)/);
 assert.match(compact,/className="kcp-workspace"/);
 assert.match(compact,/className="kcp-input"/);
 assert.match(compact,/className="kcp-result"/);
 assert.match(css,/grid-template-columns:minmax\(345px,34%\) minmax\(0,1fr\)/);
 assert.match(css,/@media\(max-width:760px\)/);
});

test('all ten models can be switched from within the same creator without page reload',()=>{
 assert.equal(publicCreationModels('video').length,6);
 assert.equal(publicCreationModels('image').length,4);
 assert.match(compact,/const allModels=\[\.\.\.videoModels,\.\.\.imageModels\]/);
 assert.match(compact,/Switch AI model/);
 assert.match(compact,/onSelectModel\(item\)/);
 assert.match(compact,/onSelectModel\(videoModels\[0\]\)/);
 assert.match(compact,/onSelectModel\(imageModels\[0\]\)/);
 assert.match(page,/window\.history\.replaceState\(null,'',nextUrl\)/);
});

test('cinema, advanced video and image family presentations are grounded in uploaded samples',()=>{
 for(const id of ['kling4_hf','seedance_2_5','seedance_2_5_flash','wan-prime','k4k-motion-lite','k4k-motion-ultra']){
  const m=CREATION_MODELS.find(x=>x.id===id);
  assert.ok(m.demoUrl?.startsWith('https://')&&m.demoUrl.endsWith('.mp4'),id);
 }
 assert.match(compact,/compactType=isImage\?'image':isCinema\?'cinema':'advanced'/);
 assert.match(compact,/model\.demoUrl\?<video key=\{model\.id\} src=\{model\.demoUrl\} controls autoPlay muted loop playsInline/);
 assert.match(compact,/isPortrait=model\.demoAspect==='9:16'/);
 assert.match(css,/\.kcp-result-media\.is-portrait video\{[^}]*object-fit:contain/);
 assert.match(compact,/Branded preview · no example image supplied yet/);
 assert.doesNotMatch(compact,/source\.duration\s*\*/);
});

test('signed quote and specialist routes are preserved; references never silently hit text-only API',()=>{
 assert.match(compact,/<CustomerCreativeGeneration key=\{model\.id\}/);
 assert.match(compact,/referenceCount=\{files\.length\}/);
 assert.match(compact,/model\.cta\?<Link href=\{model\.cta\}/);
 assert.match(compact,/model\.refs>0&&!model\.cta/);
 assert.match(compact,/Reference uploads are unavailable for this text-only model/);
 assert.match(compact,/model\.cta\?'Upload source video and character references/);
 assert.match(compact,/Guidance does not rewrite your text or change what is submitted/);
 assert.match(compact,/Reference Document and Reference Web Page inputs are not connected/);
 const policy=read('app/k4k-app/CustomerCreativeGeneration.js');
 assert.match(policy,/action:'quote'/);
 assert.match(policy,/action:'submit'/);
 assert.match(policy,/Confirm & Generate/);
 assert.match(policy,/window\.location\.assign\('\/k4k-app\/videos#creative-generations'\)/);
});
