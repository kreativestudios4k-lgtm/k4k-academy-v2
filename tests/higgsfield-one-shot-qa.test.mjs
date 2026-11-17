import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {genjutsuEstimate} from '../lib/server/higgsfield-genjutsu-motion.mjs';
const source=readFileSync(new URL('../app/api/higgsfield/first-paid-qa/route.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../app/k4k-app/higgsfield-connection/page.js',import.meta.url),'utf8');
test('cost is 4.13 second source rounded to 5 seconds at approved 480p rate',()=>{
 const price=genjutsuEstimate({sourceSeconds:4.133333,resolution:'480p'});
 assert.equal(price.duration,5);assert.equal(price.usd,0.77);
 assert.match(source,/cost\.usd>1\.60/);
 assert.match(source,/cost\.usd!==1\.59/);
 assert.match(source,/sourceSeconds:4\.133333/);
});
test('owner-only preview route refuses user input URLs and claims unique paid test before dispatch',()=>{
 for(const str of ['VERCEL_ENV','K4K_HIGGSFIELD_OWNER_PAID_QA_ENABLED','auth.auth.getUser(token)','user.id!==USER_ID','request.headers.get(\'origin\')','k4k_higgsfield_first_paid_qa','state:\'submitting\'','claimError.code===\'23505\'','TEST_ALREADY_CLAIMED','PROVIDER_SUBMISSION_UNCERTAIN','noRetry:true','RUN_ONE_5_SECOND_480P_TEST']){
  assert.ok(source.includes(str),str);
 }
 assert.doesNotMatch(source,/process\.env\.HF_API_KEY|sk_live_|K4K_HIGGSFIELD_GENERATION_PILOT_ENABLED/);
 assert.match(source,/https:\/\/d2ol7oe51mr4n9\.cloudfront\.net\/user_/);
});
test('public customer credit and subscription tables are never touched by test route',()=>{
 assert.doesNotMatch(source,/studio_credit_accounts|k4k_credit_grants|memberships|stripe|customer_wallet|k4k_multimodel_claim_dispatch/);
 assert.match(ui,/window\.confirm\(/);
 assert.match(ui,/Check generation status/);
 assert.match(ui,/Previous paid test closed/);
 assert.match(source,/FIRST_PAID_TEST_CLOSED=true/);
 assert.match(source,/SOURCE_PROMPT_MISMATCH/);
});
