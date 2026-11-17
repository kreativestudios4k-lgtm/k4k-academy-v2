import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMultimodelJobStore} from '../lib/server/multimodel-job-store.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
test('owner-scoped lookup requires enabled server adapter',async()=>{
 let invoked=0;
 const store=createMultimodelJobStore({client:{from:()=>{invoked++;return {}}}});
 await assert.rejects(store.getOwnedJob(userId,jobId),/MULTIMODEL_JOB_LOOKUP_DISABLED/);
 assert.equal(invoked,0);
});
test('owner-scoped query uses job ID and caller identity, never supplied row owner',async()=>{
 const events=[];
 const row={id:jobId,user_id:userId,status:'completed',output_mime:'image/png'};
 const chain={
  select(columns){events.push(['select',columns]);return chain;},
  eq(field,value){events.push(['eq',field,value]);return chain;},
  async maybeSingle(){events.push(['maybeSingle']);return {data:row,error:null};}
 };
 const store=createMultimodelJobStore({enabled:true,client:{from:name=>{events.push(['from',name]);return chain;}}});
 assert.deepEqual(await store.getOwnedJob(userId,jobId),row);
 assert.deepEqual(events.filter(e=>e[0]==='eq'),[['eq','id',jobId],['eq','user_id',userId]]);
 assert.equal(events[0][1],'k4k_multimodel_jobs');
});
test('invalid user/job ID stops a database query',async()=>{
 let count=0;
 const store=createMultimodelJobStore({enabled:true,client:{from:()=>{count++;return {};}}});
 await assert.rejects(store.getOwnedJob('unknown',jobId),/INVALID_JOB/);
 await assert.rejects(store.getOwnedJob(userId,'../wrong'),/INVALID_JOB/);
 assert.equal(count,0);
});
test('new read-only HTTP route requires preview switch, auth and owner-scoped signed delivery',()=>{
 const source=readFileSync(new URL('../app/api/multimodel/jobs/download/route.js',import.meta.url),'utf8');
 assert.match(source,/VERCEL_ENV!=='preview'/);
 assert.match(source,/K4K_MULTIMODEL_DELIVERY_PREVIEW!=='true'/);
 assert.match(source,/auth\.auth\.getUser\(token\)/);
 assert.match(source,/getSignedUrl\(\{userId:user\.id,jobId/);
 assert.match(source,/Cache-Control':'private, no-store'/);
 assert.doesNotMatch(source,/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)/);
});
