import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiggsfieldStatusLookup} from '../lib/server/higgsfield-status-lookup.mjs';
const providerJobId='request_123';
test('status lookup is disabled by default',async()=>{
 const lookup=createHiggsfieldStatusLookup({apiKey:'mock',fetchImpl:async()=>({})});
 await assert.rejects(lookup({providerJobId}),/HIGGSFIELD_STATUS_DISABLED/);
});
test('polls documented API origin and normalizes in_progress',async()=>{
 let request;
 const lookup=createHiggsfieldStatusLookup({enabled:true,apiKey:'mock',fetchImpl:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({request_id:providerJobId,status:'in_progress',video:{url:'https://untrusted.example/video.mp4'}})}}});
 assert.deepEqual(await lookup({providerJobId}),{providerJobId,status:'processing'});
 assert.equal(request.url,'https://platform.higgsfield.ai/requests/request_123/status');
 assert.equal(request.options.headers.Authorization,'Key mock');
 assert.equal(request.options.redirect,'error');
 assert.equal(request.options.cache,'no-store');
});
test('maps terminal moderation and cancellation states to failed',async()=>{
 for(const status of ['failed','nsfw','canceled']){
  const lookup=createHiggsfieldStatusLookup({enabled:true,apiKey:'mock',fetchImpl:async()=>({ok:true,json:async()=>({request_id:providerJobId,status})})});
  assert.deepEqual(await lookup({providerJobId}),{providerJobId,status:'failed'});
 }
});
test('rejects invalid request IDs before network',async()=>{
 let called=false;
 const lookup=createHiggsfieldStatusLookup({enabled:true,apiKey:'mock',fetchImpl:async()=>{called=true}});
 await assert.rejects(lookup({providerJobId:'../other'}),/INVALID_PROVIDER_JOB_ID/);
 assert.equal(called,false);
});
test('rejects mismatched provider response and HTTP failures',async()=>{
 for(const response of [{ok:false},{ok:true,json:async()=>({request_id:'other',status:'completed'})},{ok:true,json:async()=>({request_id:providerJobId,status:'unknown'})}]){
  const lookup=createHiggsfieldStatusLookup({enabled:true,apiKey:'mock',fetchImpl:async()=>response});
  await assert.rejects(lookup({providerJobId}),/HIGGSFIELD_STATUS_REQUEST_FAILED|HIGGSFIELD_STATUS_MISMATCH|HIGGSFIELD_STATUS_UNKNOWN/);
 }
});
