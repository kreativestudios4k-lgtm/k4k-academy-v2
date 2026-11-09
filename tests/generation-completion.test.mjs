import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationCompletion} from '../lib/server/generation-completion.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',providerJobId='mock-provider';
const outputPath=userId+'/'+jobId+'.mp4';
const request={userId,jobId,providerJobId,outcome:'completed',outputPath};
function fixture(overrides={}){
 const calls=[];
 const job={id:jobId,user_id:userId,provider_job_id:providerJobId,status:'processing',...overrides.job};
 const completion=createGenerationCompletion({enabled:true,jobStore:{getOwnedJob:async()=>job},ledger:{finish:async(...args)=>{calls.push(args);return {status:'settled'}}},verifyOutput:async()=>overrides.verified??true});
 return {completion,calls};
}
test('disabled completion does not touch dependencies',async()=>{
 const completion=createGenerationCompletion();
 await assert.rejects(completion.settle(request),/GENERATION_COMPLETION_DISABLED/);
});
test('completed job requires verified private output and settles once',async()=>{
 const {completion,calls}=fixture();
 await completion.settle(request);
 assert.deepEqual(calls,[[userId,jobId,'completed',outputPath]]);
});
test('provider ID mismatch prevents settlement',async()=>{
 const {completion,calls}=fixture({job:{provider_job_id:'other'}});
 await assert.rejects(completion.settle(request),/JOB_OWNERSHIP_OR_PROVIDER_MISMATCH/);
 assert.equal(calls.length,0);
});
test('unverified output prevents settlement',async()=>{
 const {completion,calls}=fixture({verified:false});
 await assert.rejects(completion.settle(request),/OUTPUT_NOT_VERIFIED/);
 assert.equal(calls.length,0);
});
test('failure refunds without output only for owned processing job',async()=>{
 const {completion,calls}=fixture();
 await completion.settle({...request,outcome:'failed',outputPath:null});
 assert.deepEqual(calls,[[userId,jobId,'failed',null]]);
});
test('completed job cannot settle twice through coordinator',async()=>{
 const {completion,calls}=fixture({job:{status:'completed'}});
 await assert.rejects(completion.settle(request),/INVALID_JOB_STATE/);
 assert.equal(calls.length,0);
});

test('rejects another job output even within the same user folder',async()=>{
 const {completion,calls}=fixture();
 await assert.rejects(completion.settle({...request,outputPath:userId+'/33333333-3333-4333-8333-333333333333.mp4'}),/INVALID_OUTPUT/);
 assert.equal(calls.length,0);
});
