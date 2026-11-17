import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {genjutsuEstimate} from '../lib/server/higgsfield-genjutsu-motion.mjs';
const second=readFileSync(new URL('../app/api/higgsfield/second-paid-qa/route.js',import.meta.url),'utf8');
const original=readFileSync(new URL('../app/api/higgsfield/first-paid-qa/route.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../app/k4k-app/higgsfield-connection/page.js',import.meta.url),'utf8');
test('nameless single-person prompt, source and exactly one portrait',()=>{
 const match=second.match(/const PROMPT='([^']+)'/);
 assert.ok(match);assert.match(match[1],/reference image 1/);
 assert.doesNotMatch(match[1],/Neymar|Marcelo|Bellingham|Santos|Real Madrid|specific name/i);
 assert.match(match[1],/central foreground football player/);
 assert.match(match[1],/other person|every other person/);
 const images=second.match(/const IMAGES=\[([\s\S]*?)\];/)[1];
 assert.equal((images.match(/cloudfront\.net/g)||[]).length,1);
 assert.match(second,/4265ed44-60b3-47aa-859a-faf3dbe17e50\.mp4/);
});
test('5 billed seconds and $1.60 cap',()=>{
 const p=genjutsuEstimate({sourceSeconds:4.766667,resolution:'480p'});
 assert.equal(p.duration,5);assert.equal(p.usd,1.59);
 assert.match(second,/sourceSeconds:4\.766667/);
 assert.match(second,/cost\.usd>1\.60/);
 assert.match(second,/cost\.usd!==1\.59/);
});
test('separate unique ledger claim and owner-only preview submission',()=>{
 assert.match(original,/FIRST_PAID_TEST_CLOSED=true/);
 assert.match(second,/genjutsu-owner-central-player-pizza-480p-20261117/);
 assert.match(second,/VERCEL_ENV!=='preview'/);
 assert.match(second,/user\.id!==USER_ID/);
 assert.match(second,/request\.headers\.get\('origin'\)/);
 assert.match(second,/claimError\.code==='23505'/);
 assert.match(second,/PROVIDER_SUBMISSION_UNCERTAIN/);
 assert.match(second,/RUN_SECOND_5_SECOND_480P_TEST/);
 assert.doesNotMatch(second,/studio_credit_accounts|stripe_secret|sk_live_/);
 assert.match(ui,/Second paid test completed/);
 assert.match(ui,/second-paid-qa/);
});
