import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const root=read('app/page.js');
const landing=read('app/k4k-app/CreativeHome.js');
const style=read('app/k4k-app/k4k-clean-home.css');

test('main domain renders the same K4K APP landing page as /k4k-app',()=>{
 assert.match(root,/import StudioHome from '.\/k4k-app\/page'/);
 assert.match(landing,/DON’T FOLLOW/);
 assert.match(landing,/CREATE IT/);
 assert.match(landing,/originals\.slice\(0,6\)/);
 assert.match(landing,/catalogue\.discoveryPreviews/);
});

test('new landing retains Home, Image, Video, Motion and both account entry points',()=>{
 for(const href of ['/', '/k4k-app/image','/k4k-app/video','/k4k-app/motion','/k4k-app/register','/login?next=%2Fk4k-app%2Fcreate'])
  assert.ok(landing.includes('href="'+href+'"'),href);
 assert.match(landing,/Sign in/);
 assert.match(landing,/Get started/);
 assert.match(landing,/kc26-mobile-menu/);
 assert.match(landing,/\{!user&&<><Link href="\/login\?next=%2Fk4k-app%2Fcreate"/);
 assert.match(landing,/AccountMenu user=\{user\}/);
});

test('clean K4K landing retains monochrome palette and responsive desktop navigation',()=>{
 assert.ok(!style.includes('#d6ff69'));
 assert.ok(!style.includes('#e2ff9d'));
 assert.match(style,/\.kc26-header-inner/);
 assert.match(style,/\.kc26-nav\{display:flex/);
 assert.match(style,/@media\(max-width:1020px\)/);
 assert.match(style,/@media\(max-width:720px\)/);
 assert.match(style,/\.kc26-hero h1/);
 assert.match(style,/background:#050506/);
});
