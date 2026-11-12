import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioDestination,retiredCustomerDestination,isAcademyPath} from '../lib/customer-routes.mjs';

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
 // Members get a route back to the course from the account page.
 assert.match(readFileSync('app/k4k-app/account/page.js','utf8'),/href="\/academy"/);
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
