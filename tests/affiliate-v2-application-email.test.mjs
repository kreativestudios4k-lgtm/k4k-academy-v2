import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {affiliateAcknowledgementHtml} from '../lib/server/affiliate-acknowledgement.mjs';
import {messages} from '../lib/affiliate-locales.mjs';

test('halfway welcome acknowledges receipt, never promises partnership',()=>{
 for(const lang of ['en','pt','es']){
  const [subject,text]=messages[lang];
  const html=affiliateAcknowledgementHtml({name:'Alex Example',language:lang});
  assert.match(subject,/K4K APP/);
  assert.match(text,/Instagram/);
  assert.ok(html.includes('Alex'));
  assert.ok(html.includes('https://kreativestudios4k.com/dashboard'));
  assert.ok(/approved|aprovação|aprobación|approval/i.test(html));
 }
 assert.match(messages.en[0],/halfway/);
 assert.match(messages.pt[0],/família/);
 assert.match(messages.es[0],/familia/);
});
test('welcome email escapes applicant name and never injects untrusted markup',()=>{
 const html=affiliateAcknowledgementHtml({name:'<script>alert(1)</script> Example',language:'en'});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
test('original application remains idempotent and accepts only verified bearer or original same origin',()=>{
 const src=readFileSync('app/api/affiliates/apply/route.js','utf8');
 assert.match(src,/auth\.getUser\(match\[1\]\)/);
 assert.match(src,/auth\.getUser\(\)/);
 assert.match(src,/request\.headers\.get\('origin'\)/);
 assert.match(src,/origin!==new URL\(request\.url\)\.origin/);
 assert.ok(src.includes(String.raw`const bearer=/^Bearer \S+$/i.test`));
 assert.match(src,/pending_review/);
 assert.match(src,/confirmation_sent_at/);
 assert.match(src,/Idempotency-Key/);
 assert.match(src,/html:affiliateAcknowledgementHtml/);
 assert.match(src,/team_notified_at/);
 assert.doesNotMatch(src,/public.*email|anon.*insert|signups_enabled/);
});
