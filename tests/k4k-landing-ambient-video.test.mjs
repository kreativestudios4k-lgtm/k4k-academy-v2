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
test('landing is fully abstract without faces or background video loads',()=>{
 assert.ok(!home.includes('k4k-violet-profile.svg'));
 assert.ok(!home.includes('khf-violet-portrait'));
 assert.ok(!home.includes('khf-site-video-bg'));
 assert.ok(!home.includes('backgroundClips'));
 for(const asset of ['k4k-abstract-mark.svg','k4k-abstract-orb.svg','k4k-abstract-tunnel.svg','k4k-abstract-aurora.svg'])
  assert.ok(home.includes(asset),asset+' must be present');
 const styles=read('app/k4k-app/k4k-abstract-landing.css');
 assert.match(styles,/\.khf-reference-frame\{/);
 assert.match(styles,/\.khf-portal-band\{/);
 assert.match(styles,/@media\(max-width:760px\)/);
 for(const name of ['mark','orb','tunnel','aurora']){
  const svg=read('public/k4k-abstract-'+name+'.svg');
  assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.doesNotMatch(svg,/<image|<script|<foreignObject/i);
 }
});
test('gallery and essential creator links remain available, with no extra API calls',()=>{
 for(const route of ['/k4k-app/image','/k4k-app/video','/k4k-app/motion','/k4k-app/register'])
  assert.ok(home.includes(route),route);
 assert.match(home,/featured\.slice\(0,10\)/);
 assert.ok(!home.includes('/api/generation/jobs/submit'));
});
