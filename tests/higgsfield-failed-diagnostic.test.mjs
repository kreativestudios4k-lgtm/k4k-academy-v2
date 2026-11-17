import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const api=readFileSync(new URL('../app/api/higgsfield/first-paid-qa/route.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/k4k-app/higgsfield-connection/page.js',import.meta.url),'utf8');
test('failed paid QA has owner-only read-only provider diagnostic with fixed request ID',()=>{
 assert.match(api,/if\(row\.state==='failed'&&row\.provider_request_id\)/);
 assert.match(api,/method:'GET'/);
 assert.match(api,/encodeURIComponent\(row\.provider_request_id\)/);
 assert.match(api,/providerErrorMessage:safe\(rawMessage\)/);
 assert.match(api,/PROVIDER_STATUS_UNAVAILABLE/);
 assert.match(api,/NO_DETAIL_RETURNED/);
});
test('never resubmit or unclaim existing failed paid test',()=>{
 assert.match(api,/claimError\.code==='23505'/);
 assert.match(api,/TEST_ALREADY_CLAIMED/);
 assert.match(api,/state:'submission_uncertain'/);
 assert.match(page,/testResult\.providerErrorMessage/);
});
