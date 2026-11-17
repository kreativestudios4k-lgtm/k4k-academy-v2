import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const root=read('app/page.js');
const landing=read('app/k4k-app/CreativeHome.js');
const style=read('app/k4k-app/creative-home.css');

test('main domain renders the same K4K APP landing page as /k4k-app',()=>{
 assert.match(root,/import StudioHome from '.\/k4k-app\/page'/);
 assert.match(landing,/DON’T FOLLOW/);
 assert.match(landing,/CREATE IT/);
 assert.match(landing,/featured\.slice\(0,10\)/);
});

test('landing provides Home, Image, Video, Motion and both account entry points',()=>{
 for(const href of ['/', '/k4k-app/image','/k4k-app/video','/k4k-app/motion','/k4k-app/register','/login?next=%2Fk4k-app%2Fcreate'])
  assert.ok(landing.includes('href="'+href+'"'),href);
 assert.match(landing,/Sign up/);
 assert.match(landing,/Log in/);
 assert.match(landing,/khf-mobile-signup/);
});

test('K4K landing retains monochrome palette and desktop navigation at 1440px',()=>{
 assert.ok(!style.includes('#d6ff69'));
 assert.ok(!style.includes('#e2ff9d'));
 assert.ok(style.includes('@media(max-width:1180px)'));
 assert.ok(!style.includes('@media(max-width:1460px)'));
 assert.ok(style.includes('.khf-hero-copy h1'));
});
