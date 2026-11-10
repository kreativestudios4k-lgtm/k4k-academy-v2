import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const creator=readFileSync(new URL('../app/k4k-app/creator/page.js',import.meta.url),'utf8');
test('creator saves all selected images and uses private reference storage',()=>{
 assert.match(creator,/const files=\[character\.file,\.\.\.extraImages\.map\(item=>item\.file\)\]/);
 assert.match(creator,/for\(const file of files\)/);
 assert.match(creator,/storage\.from\('studio-references'\)\.upload/);
 assert.match(creator,/reference_paths:savedReference\.paths/);
});
test('creator rejects stale attachments and gates generation on server readiness',()=>{
 assert.match(creator,/extraImages\.some\(\(item,i\)=>item\.file!==savedReference\.extraFiles\[i\]\)/);
 // Generate stays disabled until the server reports every launch gate as met,
 // and the browser never sends a price, duration or user ID to the server.
 assert.match(creator,/disabled=\{generationBusy\|\|generationBlocked\|\|!readiness\}/);
 assert.match(creator,/\/api\/generation\/submission-readiness/);
 assert.match(creator,/body:\{jobId,requestKey,resolution\}/);
 assert.doesNotMatch(creator,/SUPABASE_SERVICE_ROLE_KEY|HF_CREDENTIALS|api\.higgsfield\.ai/);
 assert.match(creator,/credits_reserved:0/);
});
