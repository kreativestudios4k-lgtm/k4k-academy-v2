import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationJobStore} from '../lib/server/generation-job-store.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222';
test('job lookup is disabled by default',async()=>{
 let called=false;const store=createGenerationJobStore({client:{from:()=>{called=true}}});
 await assert.rejects(store.getOwnedJob(userId,jobId),/JOB_LOOKUP_DISABLED/);
 assert.equal(called,false);
});
test('job lookup always filters by owner and job ID',async()=>{
 const filters={};
 const query={eq:(k,v)=>{filters[k]=v;return query},maybeSingle:async()=>({data:{id:jobId,user_id:userId,status:'processing',provider_job_id:'provider-id'},error:null})};
 const client={from:table=>{assert.equal(table,'studio_generation_jobs');return {select:fields=>{assert.match(fields,/provider_job_id/);return query}}}};
 const store=createGenerationJobStore({client,enabled:true});
 const job=await store.getOwnedJob(userId,jobId);
 assert.equal(job.id,jobId);assert.deepEqual(filters,{id:jobId,user_id:userId});
});
test('invalid identity never queries storage',async()=>{
 let called=false;const store=createGenerationJobStore({enabled:true,client:{from:()=>{called=true}}});
 await assert.rejects(store.getOwnedJob('other',jobId),/INVALID_JOB/);
 assert.equal(called,false);
});
test('missing job returns null and database errors fail closed',async()=>{
 const make=reply=>createGenerationJobStore({enabled:true,client:{from:()=>({select:()=>({eq(){return this},maybeSingle:async()=>reply})})}});
 assert.equal(await make({data:null,error:null}).getOwnedJob(userId,jobId),null);
 await assert.rejects(make({data:null,error:{message:'failed'}}).getOwnedJob(userId,jobId),/JOB_LOOKUP_FAILED/);
});
