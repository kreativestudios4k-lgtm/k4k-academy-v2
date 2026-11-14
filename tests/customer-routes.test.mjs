import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioDestination,retiredCustomerDestination,isAcademyPath,validPlan,planDestination,planRegistration,checkoutReturnDestination} from '../lib/customer-routes.mjs';

test('all customer auth methods use studio by default and reject outside or retired destinations',()=>{
 for(const requested of [null,undefined,'','/admin','/membership-required','//evil.test','https://evil.test','/k4k-app/creator?next=https://evil.test','/k4k-app/creator/../admin','/academy/lessons/example'])assert.equal(studioDestination(requested),'/k4k-app/creator');
 for(const requested of ['/k4k-app/creator','/k4k-app/videos','/k4k-app/account','/k4k-app/credits','/k4k-app/explore','/academy'])assert.equal(studioDestination(requested),requested);
});

test('retired learning routes and deep bookmarks enter the studio, without intercepting API callbacks',()=>{
 for(const path of ['/mentor','/mentor/help','/create'])assert.equal(retiredCustomerDestination(path),'/k4k-app/creator');
 assert.equal(retiredCustomerDestination('/templates'),'/k4k-app/explore');
 for(const path of ['/','/login','/register','/signup','/auth/callback','/api/billing/webhook','/api/generation/jobs/submit','/academy-other'])assert.equal(retiredCustomerDestination(path),null);
});

// Existing Academy students paid for these lessons. They must never be
// redirected away from them; only the membership gate may refuse entry.
test('the Academy course stays reachable behind the membership gate',()=>{
 for(const path of ['/academy','/academy/lessons/example','/academy/studio','/academy/method','/academy/gallery','/academy/topics/example','/academy/trends','/academy/workflows/viral-character-swap','/prompts'])
  assert.equal(retiredCustomerDestination(path),null,path+' must not redirect');
 for(const path of ['/academy','/academy/lessons/example','/prompts','/prompts/x'])assert.equal(isAcademyPath(path),true);
 for(const path of ['/','/k4k-app/creator','/academy-other','/promptsx','/mentor'])assert.equal(isAcademyPath(path),false);
 const proxy=readFileSync('proxy.js','utf8');
 // The membership gate still covers every Academy path.
 assert.match(proxy,/startsWith\('\/academy'\)/);
 assert.match(proxy,/startsWith\('\/prompts'\)/);
 assert.match(proxy,/\/membership-required/);
 // The lesson pages themselves are still in the build.
 for(const page of ['app/academy/page.js','app/academy/lessons/[slug]/page.js','app/academy/studio/page.js'])assert.ok(readFileSync(page,'utf8').length>200);
 // Existing students retain direct, membership-gated course access; the new
 // customer dashboard and public landing must not advertise the Academy.
 assert.doesNotMatch(readFileSync('app/k4k-app/account/page.js','utf8'),/href="\/academy"/);
 assert.doesNotMatch(readFileSync('app/k4k-app/CinematicLaunch.js','utf8'),/href="\/academy"/);
 assert.match(proxy,/searchParams\.set\('next','\/academy'\)/);
});

test('retiring the interface preserves verified legacy checkout registration and customer data',()=>{
 const register=readFileSync('app/register/page.js','utf8');
 assert.match(register,/fromStripe.*AcademyAuthForm/s);
 const form=readFileSync('app/components/AcademyAuthForm.js','utf8');
 assert.match(form,/academy-checkout-email/);
 assert.match(form,/check\?\.verified!==true/);
 assert.match(form,/studioDestination\(requested\)/);
 assert.doesNotMatch(form,/window\.location\.assign\('\/academy'\)/);
 const proxy=readFileSync('proxy.js','utf8');
 assert.ok(proxy.indexOf('retiredCustomerDestination(path)')<proxy.indexOf('auth.getClaims()'));
 const checkout=readFileSync('app/k4k-app/CheckoutReturn.js','utf8');
 assert.doesNotMatch(checkout,/\.insert\(|\.update\(|\.rpc\(/);
 assert.match(checkout,/\.eq\('user_id',user.id\)/);
});

test('plan choice survives signup and OAuth without allowing open redirects or injected plans',()=>{for(const p of ['starter','creator','pro','studio']){assert.equal(validPlan(p),p);assert.equal(studioDestination(planDestination(p)),planDestination(p));assert.equal(planRegistration(p),'/k4k-app/register?plan='+p)}for(const p of ['unknown','starter&next=https://evil.test','__proto__',null]){assert.equal(validPlan(p),null);assert.equal(planDestination(p),'/k4k-app/credits')}for(const url of ['/k4k-app/credits?plan=starter&next=https://evil.test','/k4k-app/credits?plan=unknown','/k4k-app/credits?plan=starter#x'])assert.equal(studioDestination(url),'/k4k-app/creator');const callback=readFileSync('app/auth/callback/route.js','utf8');assert.match(callback,/target\.pathname\+target\.search/);const landing=readFileSync('app/k4k-app/CinematicLaunch.js','utf8');assert.match(landing,/planRegistration\(plan\.key\)/);assert.match(landing,/format\('starter',currency\)/);const credits=readFileSync('app/k4k-app/credits/page.js','utf8');assert.match(credits,/validPlan\(new URLSearchParams/);assert.match(credits,/planRegistration\(selected\)/);const checkout=readFileSync('app/k4k-app/CheckoutReturn.js','utf8');assert.match(checkout,/\/api\/billing\/account/);assert.doesNotMatch(checkout,/from\('memberships'\)/)});

test('checkout return preserves only a validated session through sign-in',()=>{const id='cs_test_123456789abcdef';const dest=checkoutReturnDestination(id);assert.equal(studioDestination(dest),dest);assert.equal(studioDestination(checkoutReturnDestination(null)),'/k4k-app/creator?checkout=success');for(const value of ['cs_test_bad&next=https://evil.test','https://evil.test','cs_test_x'])assert.equal(checkoutReturnDestination(value),'/k4k-app/creator?checkout=success');assert.equal(studioDestination(dest+'&next=https://evil.test'),'/k4k-app/creator');assert.match(readFileSync('app/k4k-app/CheckoutReturn.js','utf8'),/encodeURIComponent\(returnPath\)/);});
