import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../app/k4k-app/higgsfield-preview/motion-wide.css',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/k4k-app/higgsfield-preview/page.js',import.meta.url),'utf8');
test('Motion Studio avoids horizontal desktop overflow on small laptops and zoomed browsers',()=>{
 assert.match(css,/\.khm-studio-layout\{[^}]*width:100%;[^}]*grid-template-columns:minmax\(0,1\.15fr\) minmax\(0,\.85fr\)/);
 assert.match(css,/@media\(max-width:1180px\)\{[\s\S]*?\.khm-studio-layout\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.khm-root\{[^}]*overflow-x:clip/);
 assert.match(css,/\.khm-studio-layout>\*\{min-width:0;max-width:100%\}/);
 assert.match(css,/\.khm-title\{[^}]*max-width:100%/);
 assert.match(css,/\.khm-topnav\{[^}]*flex-wrap:wrap/);
});
test('Motion Studio preserves responsive video, cast and signed-price flow',()=>{
 for(const value of ['khm-video-stage','khm-cast-panel','khm-quality-panel','CustomerGeneration','DirectorView','verifyUploads','priceFor'])assert.ok(page.includes(value),value);
 assert.match(css,/\.khm-video-stage\{[^}]*grid-column:1/);
 assert.match(css,/\.khm-cast-panel\{[^}]*grid-column:2/);
 assert.match(css,/\.khm-source-selector,.khm-video-stage,.khm-cast-panel,.khm-direction-panel,.khm-quality-panel,.khm-generate-panel\{grid-column:1;grid-row:auto\}/);
});

test('mobile Motion Director Studio uses compact navigation and phone-size typography',()=>{
 assert.match(page,/<details className="khm-mobile-menu">/);
 assert.match(page,/<summary aria-label="Open K4K Motion menu">/);
 assert.match(page,/className="khm-desktop-links"/);
 assert.match(css,/@media\(max-width:620px\)\{/);
 assert.match(css,/\.khm-topnav>\.khm-nav-context,\.khm-topnav>\.khm-desktop-links\{display:none\}/);
 assert.match(css,/\.khm-mobile-menu\{display:block/);
 assert.match(css,/\.khm-title\{grid-column:1;[^}]*font-size:clamp\(29px,8vw,40px\)!important/);
 assert.match(css,/\.khm-video-panel input\[type=file\]\{display:block;width:100%/);
 assert.match(css,/@media\(max-width:360px\)/);
});
