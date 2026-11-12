import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/api/generation/jobs/status/route.js',import.meta.url),'utf8');
test('job status requires verified user and filters by owner',()=>{
 assert.match(source,/auth\.getUser\(token\)/);
 assert.match(source,/\.eq\('user_id',user\.id\)/);
 assert.match(source,/\.maybeSingle\(\)/);
});
test('job status does not leak storage or provider identifiers',()=>{
 assert.match(source,/\.select\('id,status,model,created_at,updated_at,credits_reserved'\)/);
 assert.doesNotMatch(source,/provider_job_id|reference_video_path|output_path/);
});
test('job status is read-only and cannot trigger paid requests or credit mutations',()=>{
 assert.doesNotMatch(source,/\.insert\(|\.update\(|\.delete\(|\.rpc\(|provider\.submit\(|fetch\(/);
 assert.match(source,/generationEnabled:false/);
 assert.match(source,/no-store/);
});
