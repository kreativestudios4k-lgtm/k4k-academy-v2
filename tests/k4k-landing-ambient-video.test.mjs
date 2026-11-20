import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const home=read('app/k4k-app/CreativeHome.js');
const css=read('app/k4k-app/k4k-clean-home.css');

test('new cinematic hero preserves visible K4K identity and original tag line',()=>{
 assert.match(home,/id="kc26-hero-title"/);
 assert.match(home,/DON’T FOLLOW/);
 assert.match(home,/CREATE IT/);
 assert.match(home,/kc26-hero-monogram/);
 assert.ok(!home.includes('khf-reference-sculpture'));
 assert.ok(!home.includes('khf-reference-atmosphere'));
 assert.match(css,/\.kc26-hero-scrim/);
 assert.match(css,/\.kc26-hero-container/);
});

test('homepage is black/chrome without old coloured portraits or unnecessary media requests',()=>{
 for(const removed of ['k4k-violet-profile.svg','khf-violet-portrait','khf-site-video-bg','backgroundClips'])
  assert.ok(!home.includes(removed),removed);
 assert.match(home,/HERO_VIDEO_URL&&<video/);
 assert.match(home,/NEXT_PUBLIC_K4K_HOME_HERO_VIDEO_URL/);
 assert.match(css,/\.kc26-chrome-stage/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.kc26-chrome-stage\.kc26-with-video\{display:block\}/);
 assert.match(home,/poster="\/k4k-home-hero-poster\.svg"/);
});

test('real K4K gallery and essential creator links remain, without generation calls',()=>{
 for(const route of ['/k4k-app/image','/k4k-app/video','/k4k-app/motion','/k4k-app/register'])
  assert.ok(home.includes(route),route);
 assert.match(home,/originals\.slice\(0,6\)/);
 assert.match(home,/catalogue\.discoveryPreviews/);
 assert.ok(!home.includes('/api/generation/jobs/submit'));
});
