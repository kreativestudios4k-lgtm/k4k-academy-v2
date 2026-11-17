import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/api/higgsfield/second-output-check/route.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/k4k-app/higgsfield-connection/page.js',import.meta.url),'utf8');
test('owner-only range probe uses exact known provider output host and request id',()=>{
 for(const marker of ['VERCEL_ENV','K4K_HIGGSFIELD_OWNER_PAID_QA_ENABLED','auth.auth.getUser(token)','user.id!==OWNER','row?.state!==','row?.provider_request_id!==REQUEST','safeOutput(row?.result_video_url)','hostname===','d3u0tzju9qaucj.cloudfront.net'])assert.ok(source.includes(marker),marker);
 assert.match(source,/Range:'bytes=0-31'/);
 assert.match(source,/response.status!==206/);
 assert.match(source,/String.fromCharCode/);
 assert.match(source,/mp4HeaderValid:valid/);
});
test('file check is GET only, never generates, bills or ingests media',()=>{
 assert.doesNotMatch(source,/export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)/);
 assert.doesNotMatch(source,/\.upload\(|provider\.submit|k4k_live_credit_accounts|studio_credit_accounts|sk_live_/);
 assert.match(source,/downloadInK4KLibrary:false/);
 assert.match(page,/Verify output MP4 file/);
});
