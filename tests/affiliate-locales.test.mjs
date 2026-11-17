import test from 'node:test';
import assert from 'node:assert/strict';
import {countries,languages,messages,defaultLanguage,normalizeInstagram} from '../lib/affiliate-locales.mjs';
import {studioDestination} from '../lib/customer-routes.mjs';
import {readFileSync} from 'node:fs';
test('worldwide affiliate languages include a complete acknowledgement for every supported option',()=>{
 assert.ok(countries.length>=249);assert.equal(new Set(countries).size,countries.length);
 for(const code of Object.keys(languages)){assert.equal(messages[code].length,2);assert.ok(messages[code][0].includes('K4K APP'));assert.ok(messages[code][1].includes('Instagram')||messages[code][1].includes('إنستغرام'))}
 for(const [country,language] of Object.entries({BR:'pt',PT:'pt',AO:'pt',ES:'es',MX:'es',FR:'fr',DE:'de',IT:'it',IN:'hi',JP:'ja',CN:'zh',AE:'ar',GB:'en',US:'en',AU:'en'}))assert.equal(defaultLanguage(country),language);
 for(const c of countries)assert.ok(Object.hasOwn(languages,defaultLanguage(c)));
});
test('Instagram inputs become canonical profile URLs and reject external or non-profile URLs',()=>{
 for(const input of ['@My.Creator','My.Creator','https://www.instagram.com/My.Creator/?igsh=abc','http://instagram.com/My.Creator/'])assert.equal(normalizeInstagram(input),'https://www.instagram.com/my.creator/');
 for(const input of ['','https://evil.test/mycreator','https://instagram.com.evil.test/mycreator','https://instagram.com/p/123','https://instagram.com/reels/','https://instagram.com@evil.test/test','https://evil.test@instagram.com/test','@two words','a'.repeat(31),null])assert.equal(normalizeInstagram(input),null);
});
test('affiliate login return is explicitly allowed without opening redirect destinations',()=>{
 assert.equal(studioDestination('/affiliates'),'/affiliates');assert.equal(studioDestination('/affiliates?next=https://evil.test'),'/k4k-app/dashboard');assert.equal(studioDestination('https://evil.test/affiliates'),'/k4k-app/dashboard');
 const route=readFileSync('app/api/affiliates/apply/route.js','utf8');
 assert.match(route,/auth.getUser\(\)/);assert.match(route,/email_confirmed_at/);assert.match(route,/Idempotency-Key/);assert.match(route,/confirmation_sent_at/);assert.match(route,/pending_review/);
 assert.match(route,/VERCEL_ENV!==['"]production['"]/);
 const page=readFileSync('app/affiliates/page.js','utf8');assert.match(page,/Worldwide affiliate commission/);assert.doesNotMatch(page,/European affiliate commission/);assert.match(page,/<AffiliateForm\/>/);
});

test('affiliate application renders directly without a login or signup gate',()=>{
 const form=readFileSync('app/affiliates/AffiliateForm.js','utf8');
 assert.match(form,/<form onSubmit=\{submit\}>/);
 assert.match(form,/signInWithOtp\(/);
 assert.match(form,/\/auth\/callback\?next=%2Faffiliates/);
 assert.doesNotMatch(form,/href="\/login|href="\/k4k-app\/register/);
 assert.match(form,/readOnly=\{!!session\?\.signedIn\}/);
 assert.match(form,/clearDraft\(\)/);
 const callback=readFileSync('app/auth/callback/route.js','utf8');
 assert.match(callback,/\/affiliates\?error=affiliate-verification/);
});
