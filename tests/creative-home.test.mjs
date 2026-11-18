import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {CREATION_MODELS} from '../lib/creation-studio-catalog.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const home=read('app/k4k-app/CreativeHome.js');
const page=read('app/k4k-app/page.js');
const css=read('app/k4k-app/k4k-clean-home.css');

test('K4K homepage is a responsive creator platform, not a single 560px reel',()=>{
 assert.match(page,/CreativeHome/);
 assert.doesNotMatch(page,/SingleFeedHome/);
 assert.match(css,/\.kc26-section/);
 assert.match(css,/\.kc26-model-grid/);
 assert.match(css,/@media\(max-width:720px\)/);
});

test('homepage keeps K4K hero hook and genuine existing videos',()=>{
 assert.match(home,/DON’T FOLLOW/);
 assert.match(home,/CREATE IT/);
 assert.match(home,/template-catalogue\.json/);
 assert.match(home,/originals\.slice\(0,6\)/);
 assert.match(home,/item\.videoUrl/);
});

test('navigation preserves Wan creation, pricing, model discovery and safe model disclaimers',()=>{
 for(const path of ['/k4k-app/image','/k4k-app/video','/k4k-app/credits','/k4k-app/motion'])
  assert.ok(home.includes(path),path);
 assert.ok(!home.includes('href="/k4k-app/motion/explore"'));
 assert.match(home,/modelOrder/);
 assert.match(home,/model\.status==='active'/);
 assert.match(home,/INTERFACE ANIMATION/);
 assert.match(home,/Models shown here are in the K4K catalogue/);
 assert.doesNotMatch(home,/fetch\(.*api\/generation\/jobs\/submit/);
 const wan=CREATION_MODELS.find(m=>m.id==='wan-prime');
 assert.equal(wan?.name,'Wan 3');
 assert.equal(wan?.cta,'/k4k-app/creator');
 assert.ok(home.includes("'wan-prime'"));
});

const shell=read('app/k4k-app/PreviewShell.js');
const catalogue=JSON.parse(read('app/k4k-app/template-catalogue.json'));
test('homepage showcases K4K originals without requiring posters or legacy trending clips',()=>{
 assert.match(home,/catalogue\.discoveryPreviews\.filter\(item=>item\.videoUrl\)/);
 assert.ok(catalogue.discoveryPreviews.some(item=>item.videoUrl&&!item.posterUrl));
 assert.doesNotMatch(home,/catalogue\.trending/);
 assert.match(home,/src=\{item\.videoUrl\}/);
 assert.match(css,/\.kc26-original video/);
});

test('K4K studio brand navigates home instead of video generation',()=>{
 assert.match(shell,/<Link className="k4k-global-brand" href="\/"/);
 assert.doesNotMatch(shell,/<Link className="k4k-global-brand" href="\/k4k-app\/creator"/);
});

const motion=read('app/k4k-app/higgsfield-preview/page.js');
const motionCss=read('app/k4k-app/higgsfield-preview/motion-wide.css');
// Model declarations live one per file in lib/creation-catalog/models/, so the
// catalogue source is the entry file plus every declaration beside it.
const catalogFiles=['lib/creation-studio-catalog.mjs',...readdirSync(new URL('../lib/creation-catalog/models/',import.meta.url)).filter(f=>f.endsWith('.mjs')).map(f=>'lib/creation-catalog/models/'+f)];
const catalog=catalogFiles.map(read).join('\n');
test('production K4K Motion still has full Director workspace and signed generation flow',()=>{
 assert.match(motion,/khm-studio-layout/);
 assert.match(motion,/YOUR NEXT VIRAL HIT/);
 assert.match(motion,/khm-video-stage/);
 assert.match(motion,/DirectorView/);
 assert.match(motion,/CustomerGeneration/);
 assert.match(motionCss,/grid-template-columns:minmax\(0,1\.15fr\)/);
 assert.match(motionCss,/@media\(max-width:1180px\)/);
});

test('Wan 3 remains a display name; Motion stays primary without changing provider IDs',()=>{
 assert.match(home,/'wan-prime'/);
 assert.match(home,/href="\/k4k-app\/motion"/);
 assert.match(catalog,/id:'wan-prime',demoUrl:/);
 assert.equal(CREATION_MODELS.find(m=>m.id==='wan-prime')?.name,'Wan 3');
 assert.match(catalog,/cta:'\/k4k-app\/creator'/);
 assert.doesNotMatch(home,/K4K Remix/);
});
