import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
const motion=read('app/k4k-app/higgsfield-preview/page.js');
const generate=read('app/k4k-app/higgsfield-preview/customer-generation.js');

test('credits appear immediately from source duration and selected resolution',()=>{
 assert.match(motion,/const billableSeconds=/);
 assert.match(motion,/const credits=priceFor\(resolution\)/);
 assert.match(motion,/khm-credit-summary/);
 assert.match(motion,/Estimated credits · updated automatically/);
 assert.match(motion,/credits!==null\?credits\+' credits'/);
 assert.match(motion,/qualityCaps\?\.\[resolution\]/);
});
test('private upload verification is automatic when customer presses Generate',()=>{
 assert.match(motion,/async function verifyUploads/);
 assert.match(motion,/if\(!body\.verifiedInputStorage\)throw Error/);
 assert.match(motion,/return \{videoPath:saved\.videoPath,referencePaths:\[\.\.\.saved\.referencePaths\]\}/);
 assert.match(motion,/onPrepareMedia=\{verifyUploads\}/);
 assert.match(motion,/canGenerate=\{castReady&&billableSeconds!==null&&withinBudget\}/);
 assert.doesNotMatch(motion,/Verify files privately · No credits charged/);
 assert.doesNotMatch(motion,/khm-private-upload/);
 assert.doesNotMatch(motion,/<input type="checkbox"/);
 assert.match(generate,/const verified=onPrepareMedia\?await onPrepareMedia\(\):media/);
 assert.match(generate,/request\('prepare',\{jobId,\.\.\.verified,resolution,prompt\}\)/);
 assert.match(generate,/Checking files…/);
});
test('customer must review signed quote and confirm before any paid dispatch',()=>{
 assert.match(generate,/request\('submit',\{jobId:current\.jobId,quoteToken:current\.quoteToken,requestKey:requestKey\.current\}\)/);
 assert.match(generate,/Confirm & Generate ·/);
 assert.match(generate,/quote\.credits/);
 assert.match(generate,/No credits are charged until you review and confirm the signed quote/);
 assert.match(motion,/By confirming generation, you confirm you have permission/);
 assert.match(generate,/setQuote\(null\);requestKey\.current=null;/);
 assert.match(generate,/selectionKey\|\|mediaKey/);
});
