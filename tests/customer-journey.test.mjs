import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const read=(path)=>readFileSync(join(root,path),'utf8');

test('all core customer routes exist',()=>{
 for(const route of [
  'app/k4k-app/page.js',
  'app/k4k-app/account/page.js',
  'app/k4k-app/register/page.js',
  'app/k4k-app/videos/page.js',
  'app/k4k-app/creator/page.js',
  'app/k4k-app/credits/page.js',
  'app/k4k-app/support/page.js',
  'app/academy/page.js'
 ])assert.ok(existsSync(join(root,route)),route+' should exist');
});

test('main navigation links to account, creator, projects, plans and support',()=>{
 const shell=read('app/k4k-app/PreviewShell.js');
 for(const href of ['/k4k-app/explore','/k4k-app/videos','/k4k-app/creator','/k4k-app/credits','/k4k-app/account','/k4k-app/support'])
  assert.ok(shell.includes(href),'Missing navigation '+href);
});

test('project and credit history require the authenticated owner',()=>{
 const projects=read('app/k4k-app/VideoLibrary.js');
 const status=read('app/k4k-app/AccountStatus.js');
 assert.match(projects,/auth\.getUser\(\)/);
 assert.match(projects,/\.eq\('user_id',user\.id\)/);
 assert.match(status,/auth\.getUser\(\)/);
 assert.match(status,/\.eq\('user_id',user\.id\)/);
});

test('support is explicit about its current email-only channel',()=>{
 const support=read('app/k4k-app/support/page.js');
 assert.match(support,/hello@kreativestudios4k\.com/);
 assert.match(support,/ticket inbox.*not been implemented/);
});

test('checkout remains restricted to Stripe test keys and AI generation remains disabled',()=>{
 const checkout=read('app/api/billing/checkout/route.js');
 const billing=read('lib/server/stripe-billing.mjs');
 const creator=read('app/k4k-app/creator/page.js');
 assert.match(checkout,/assertTestModeKey\(secret\)/);
 assert.match(billing,/sk_test_/);
 assert.match(creator,/AI generation is disabled/);
});

test('public account registration does not promise paid generation',()=>{
 const register=read('app/k4k-app/register/page.js');
 assert.match(register,/Video generation uses credits/);
});

test('signup and callback lead to the studio rather than the retired membership gate',()=>{
 const register=read('app/k4k-app/register/page.js');
 const callback=read('app/auth/callback/route.js');
 assert.match(register,/planDestination\(plan\)/);\n assert.match(register,/encodeURIComponent\(next\)/);
 assert.match(callback,/studioDestination\(searchParams.get\('next'\)\)/);
 assert.doesNotMatch(callback,/membership-required/);
});

test('Stripe Checkout fails closed when membership status cannot be loaded',()=>{
 const route=read('app/api/billing/checkout/route.js');
 assert.match(route,/if \(membershipError\)/);
 assert.match(route,/MEMBERSHIP_CHECK_UNAVAILABLE/);
 assert.match(route,/STRIPE_UNREACHABLE/);
 assert.match(route,/AbortSignal\.timeout/);
});

test('K4K launch login and Google OAuth use studio, never Academy by default',()=>{
 const dialog=read('app/k4k-app/LaunchAuthDialog.js');
 assert.match(dialog,/provider:'google'/);
 assert.match(dialog,/auth\/callback\?next=%2Fk4k-app%2Fcreator/);
 assert.match(dialog,/window\.location\.assign\(data\.user\.user_metadata\?\.k4k_temp_password\?'\/update-password':'\/k4k-app\/creator'\)/);
 assert.doesNotMatch(dialog,/membership-required|%2Facademy/);
 const proxy=read('proxy.js');
 assert.match(proxy,/searchParams\.set\('next','\/academy'\)/);
});
