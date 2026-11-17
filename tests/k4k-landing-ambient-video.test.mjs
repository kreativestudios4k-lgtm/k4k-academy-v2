import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const home=read('app/k4k-app/CreativeHome.js');
const css=read('app/k4k-app/creative-home.css');

test('hero exposes unobstructed K4K APP and removes both chrome sculpture references',()=>{
 assert.match(home,/<h1 id="khf-hero-title">K4K <span>APP<\/span><\/h1>/);
 assert.ok(!home.includes('khf-reference-sculpture'));
 assert.ok(!home.includes('khf-reference-atmosphere'));
 assert.match(css,/\.khf-reference-headline\{[\s\S]*?z-index:5/);
});
test('one muted user-original video plays sequentially behind the site with a graceful fallback',()=>{
 assert.match(home,/const backgroundClips=featured\.slice\(0,3\)/);
 assert.match(home,/className="khf-site-video-bg"/);
 assert.match(home,/className="khf-site-bg-video"/);
 assert.match(home,/autoPlay muted playsInline/);
 assert.match(home,/onEnded=\{\(\)=>setBackgroundIndex/);
 assert.match(home,/onError=\{\(\)=>setBackgroundIndex/);
 assert.match(home,/backgroundIndex>=0/);
 assert.match(css,/filter:blur\(34px\) grayscale\(1\)/);
 assert.match(css,/\.khf-site-video-bg\{/);
 assert.match(css,/position:fixed/);
 assert.match(css,/pointer-events:none/);
});
test('gallery and essential creator links remain available, with no extra API calls',()=>{
 for(const route of ['/k4k-app/image','/k4k-app/video','/k4k-app/motion','/k4k-app/register'])
  assert.ok(home.includes(route),route);
 assert.match(home,/featured\.slice\(0,10\)/);
 assert.ok(!home.includes('/api/generation/jobs/submit'));
});
