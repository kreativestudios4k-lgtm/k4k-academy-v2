import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const home=readFileSync(new URL('../app/k4k-app/CreativeHome.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/k4k-app/k4k-clean-home.css',import.meta.url),'utf8');

test('homepage header login points to real auth route and preserves mobile account entry',()=>{
 assert.match(home,/className="kc26-login" href="\/login\?next=%2Fk4k-app%2Fcreate"/);
 assert.match(home,/className="kc26-signup" href=\{user\?'\/k4k-app\/create':'\/k4k-app\/register'\}/);
 assert.match(home,/id="kc26-mobile-menu"/);
 assert.match(home,/aria-controls="kc26-mobile-menu"/);
 assert.match(home,/\{!user&&<><Link href="\/login\?next=%2Fk4k-app%2Fcreate"/);
 assert.match(home,/<Link href="\/k4k-app\/register" onClick=\{\(\)=>setMenuOpen\(false\)\}/);
 assert.match(css,/@media\(max-width:1020px\)/);
 assert.match(css,/\.kc26-menu-toggle\{display:grid\}/);
});

test('header navigation remains usable on narrow devices without colliding with auth actions',()=>{
 assert.match(css,/\.kc26-header-inner\{[^}]*display:flex;align-items:center;justify-content:space-between/);
 assert.match(css,/\.kc26-header-actions\{[^}]*display:flex;align-items:center;justify-content:flex-end/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/@media\(max-width:440px\)/);
 assert.match(css,/\.kc26-mobile-menu\{position:absolute!important/);
 assert.match(css,/\.kc26-header\{position:sticky;top:0;z-index:70/);
});

test('login component and public authentication route are retained',()=>{
 const login=readFileSync(new URL('../app/login/page.js',import.meta.url),'utf8');
 const auth=readFileSync(new URL('../app/components/AcademyAuthForm.js',import.meta.url),'utf8');
 assert.match(login,/AcademyAuthForm mode="login"/);
 assert.match(auth,/signInWithPassword/);
 assert.match(auth,/signInWithOAuth/);
});
