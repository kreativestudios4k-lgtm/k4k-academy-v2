import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CREATION_MODELS} from '../lib/creation-studio-catalog.mjs';
const source=readFileSync(new URL('../app/k4k-app/CreativeHome.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/k4k-app/k4k-clean-home.css',import.meta.url),'utf8');

test('homepage concept retains K4K navigation and account state',()=>{
 assert.match(source,/useVerifiedAccount/);
 assert.match(source,/AccountMenu/);
 assert.ok(source.includes('/k4k-app/register'));
 assert.ok(source.includes('/login?next='));
 for(const path of ['/k4k-app/image','/k4k-app/video','/k4k-app/motion','/k4k-app/credits'])assert.ok(source.includes(path));
 assert.match(source,/DON’T FOLLOW/);
 assert.match(source,/k4k-clean-home\.css/);
 assert.doesNotMatch(source,/fetch\(['"]\/api\/(?:creative|billing)/);
});

test('hero video uses explicit supplied asset env; chrome animation is a no-network fallback',()=>{
 assert.match(source,/NEXT_PUBLIC_K4K_HOME_HERO_VIDEO_URL/);
 assert.match(source,/6250e761-2957-4f49-92d3-69b1f23d907e\.mp4/);
 assert.match(css,/\.kc26-hero-video\{z-index:2/);
 assert.ok(source.includes('HERO_VIDEO_URL&&<video src={HERO_VIDEO_URL} poster="/k4k-home-hero-poster.svg" autoPlay muted loop playsInline preload="metadata"'));
 assert.match(source,/kc26-chrome-stage/);
 assert.match(source,/kc26-with-video/);
 assert.ok(css.includes('.kc26-chrome-stage.kc26-with-video{display:block}'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});

test('model catalogue retains truthful preview labels and previously supplied Kling demo',()=>{
 assert.match(source,/CREATION_MODELS/);
 assert.ok(source.includes('model.demoUrl?'));
 assert.match(source,/INTERFACE ANIMATION/);
 assert.match(source,/REAL MODEL EXAMPLE/);
 assert.match(source,/access varies/);
 assert.ok(source.includes('aria-pressed={filter===g.id}'));
 assert.ok(CREATION_MODELS.find(model=>model.id==='kling4_hf')?.demoUrl?.startsWith('https://'));
});

test('real original video gallery links safely into motion and remains metadata-lazy',()=>{
 assert.match(source,/catalogue\.discoveryPreviews/);
 assert.ok(source.includes('preload="metadata"'));
 assert.ok(source.includes('muted loop playsInline'));
 assert.ok(source.includes('onMouseEnter={play} onMouseLeave={pause}'));
 assert.ok(source.includes('encodeURIComponent(item.id)'));
 assert.ok(css.includes('.kc26-original-grid'));
 assert.ok(css.includes('@media(max-width:720px)'));
});
