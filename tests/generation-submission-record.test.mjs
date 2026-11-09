import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationSubmissionRecorder} from '../lib/server/generation-submission-record.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',providerJobId='provider-request';
function mock({row=true,error=null}={}){
 const filters=[];
 const query={eq:(...args)=>{filters.push(['eq',...args]);return query},is:(...args)=>{filters.push(['is',...args]);return query},select:()=>query,maybeSingle:async()=>({data:row?{id:jobId,user_id:userId,provider_job_id:providerJobId,status:'processing'}:null,error})};
 const client={from:table=>{filters.push(['table',table]);return {update:values=>{filters.push(['update',values]);return query}}}};
 return {client,filters};
}
test('disabled recorder cannot mutate database',async()=>{
 let called=false;const recorder=createGenerationSubmissionRecorder({client:{from:()=>{called=true}}});
 await assert.rejects(recorder.record({userId,jobId,providerJobId}),/SUBMISSION_RECORDING_DISABLED/);
 assert.equal(called,false);
});
test('records provider ID once, scoped to user and queued state',async()=>{
 const {client,filters}=mock();const recorder=createGenerationSubmissionRecorder({client,enabled:true});
 assert.equal((await recorder.record({userId,jobId,providerJobId})).status,'processing');
 assert.deepEqual(filters.filter(x=>x[0]==='eq'),[['eq','id',jobId],['eq','user_id',userId],['eq','status','queued']]);
 assert.deepEqual(filters.filter(x=>x[0]==='is'),[['is','provider_job_id',null]]);
});
test('conflicting retry does not overwrite existing provider request',async()=>{
 const {client}=mock({row:false});const recorder=createGenerationSubmissionRecorder({client,enabled:true});
 await assert.rejects(recorder.record({userId,jobId,providerJobId}),/SUBMISSION_STATE_CONFLICT/);
});
test('rejects invalid identity and provider ID before database access',async()=>{
 let called=false;const recorder=createGenerationSubmissionRecorder({enabled:true,client:{from:()=>{called=true}}});
 await assert.rejects(recorder.record({userId:'bad',jobId,providerJobId}),/INVALID_SUBMISSION/);
 await assert.rejects(recorder.record({userId,jobId,providerJobId:''}),/INVALID_SUBMISSION/);
 assert.equal(called,false);
});
