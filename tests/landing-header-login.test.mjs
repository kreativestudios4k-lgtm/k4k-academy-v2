import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const home=readFileSync(new URL('../app/k4k-app/CreativeHome.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/k4k-app/creative-home.css',import.meta.url),'utf8');
test('Header login points to real auth route and remains clickable on tablet/mobile',()=>{
 assert.match(home,/<Link className="khf-signin" aria-label=\{tr\("Log in to K4K"/);
 assert.match(home,/href="\/login\?next=%2Fk4k-app%2Fcreate"/);
 assert.match(home,/className="khf-mobile-login"/);
 assert.match(home,/className="khf-mobile-signup"/);
 assert.match(css,/@media\(max-width:1180px\)/);
 assert.match(css,/\.khf-desktop-links\{display:none\}/);
 assert.match(css,/\.khf-signin\{display:inline-flex/);
 assert.match(css,/\.khf-header-actions\{gap:6px\}/);
});
test('Header navigation is responsive and does not allow links to collide with authentication',()=>{
 assert.match(css,/grid-template-columns:max-content minmax\(0,1fr\) max-content/);
 assert.match(css,/\.khf-header-actions\{[\s\S]*?z-index:5/);
 assert.match(css,/\.khf-topbar\{isolation:isolate;z-index:100/);
 assert.match(home,/aria-controls="khf-mobile-menu"/);
 assert.match(home,/id="khf-mobile-menu"/);
});
test('Login component and public authentication route are retained',()=>{
 const login=readFileSync(new URL('../app/login/page.js',import.meta.url),'utf8');
 const auth=readFileSync(new URL('../app/components/AcademyAuthForm.js',import.meta.url),'utf8');
 assert.match(login,/AcademyAuthForm mode="login"/);
 assert.match(auth,/signInWithPassword/);assert.match(auth,/signInWithOAuth/);
});
