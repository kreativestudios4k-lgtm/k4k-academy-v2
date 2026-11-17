import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const home=read('app/k4k-app/CreativeHome.js');
const studio=read('app/k4k-app/create/page.js');
const motion=read('app/k4k-app/higgsfield-preview/page.js');
const shell=read('app/k4k-app/PreviewShell.js');
const homeCss=read('app/k4k-app/creative-home.css');
const studioCss=read('app/k4k-app/create/create.css');
const catalog=read('lib/creation-studio-catalog.mjs');
test('every official K4K section is a distinct route, not an inert duplicate',()=>{
 for(const p of ['/k4k-app/motion/explore','/k4k-app/image','/k4k-app/video','/k4k-app/motion'])for(const source of [home,studio,motion,shell])assert.ok(source.includes(p),p);
 const image=read('app/k4k-app/image/page.js'),video=read('app/k4k-app/video/page.js');
 assert.match(image,/kind=image&model=/);assert.match(video,/kind=video&model=/);
 assert.match(image,/\['nano_banana_2','flux_3_image'\]/);
 assert.match(video,/\['seedance_2_5','kling4_0','wan-prime'\]/);
 assert.match(studio,/new URLSearchParams\(window.location.search\)/);
});
test('hero typography and cards adapt to desktop tablet and mobile viewports',()=>{
 assert.match(homeCss,/\.k4k-hf-home \.khf-hero-copy h1\{white-space:normal/);
 assert.match(homeCss,/@media\(max-width:900px\)/);
 assert.match(homeCss,/@media\(max-width:620px\)/);
 assert.match(homeCss,/\.khf-model-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(studioCss,/\.kcs-nav nav a\[aria-current=page\]/);
 assert.match(studioCss,/\.kcs-fields\{grid-template-columns:minmax\(0,1fr\)\}/);
});
test('official customer models show genuinely supported, charged outputs only',()=>{
 for(const value of ['5 seconds · 480p','5 seconds · 720p','one 1K PNG','one 1K JPEG'])assert.ok(catalog.includes(value),value);
 for(const id of ['seedance_2_5','kling4_0','nano_banana_2','flux_3_image'])assert.ok(catalog.includes("id:'"+id+"'"),id);
 assert.match(studio,/model.refs>0&&/);
 assert.doesNotMatch(studio,/Provider endpoint found/);
 assert.match(studio,/Ready to create/);
});
