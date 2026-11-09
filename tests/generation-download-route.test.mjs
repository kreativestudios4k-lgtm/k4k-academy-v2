import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../app/api/generation/jobs/[id]/download/route.js',import.meta.url),'utf8');
test('download route authenticates and scopes jobs to the caller',()=>{
 assert.match(route,/auth\.auth\.getUser\(token\)/);
 assert.match(route,/\.eq\('id',id\)\.eq\('user_id',user\.id\)/);
 assert.match(route,/if\(!job\)return respond\(\{error:'JOB_NOT_FOUND'\},404\)/);
});
test('download only completed mp4 from private output bucket with expiring signed link',()=>{
 assert.match(route,/job\.status!=='completed'/);
 assert.match(route,/path\.startsWith\(user\.id\+'\/'\)/);
 assert.match(route,/path\.includes\('\.\.'\)/);
 assert.match(route,/studio-outputs'\)\.createSignedUrl\(path,60/);
 assert.match(route,/Cache-Control':'no-store/);
});
