import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationProviderStatusAdapter} from '../lib/server/generation-provider-status-adapter.mjs';
const providerJobId='provider-job-123';
test('disabled by default',async()=>{
 const get=createGenerationProviderStatusAdapter({lookup:async()=>({providerJobId,status:'completed'})});
 await assert.rejects(get({providerJobId}),/PROVIDER_STATUS_DISABLED/);
});
test('requires authenticated lookup dependency',async()=>{
 const get=createGenerationProviderStatusAdapter({enabled:true});
 await assert.rejects(get({providerJobId}),/PROVIDER_LOOKUP_UNAVAILABLE/);
});
test('accepts only a matching known status',async()=>{
 const get=createGenerationProviderStatusAdapter({enabled:true,lookup:async()=>({providerJobId,status:'completed',url:'https://untrusted.example/video.mp4'})});
 assert.deepEqual(await get({providerJobId}),{providerJobId,status:'completed'});
});
test('rejects mismatched job IDs and unknown statuses',async()=>{
 for(const response of [{providerJobId:'different',status:'completed'},{providerJobId,status:'unknown'},null]){
  const get=createGenerationProviderStatusAdapter({enabled:true,lookup:async()=>response});
  await assert.rejects(get({providerJobId}),/PROVIDER_JOB_MISMATCH|INVALID_PROVIDER_STATUS|INVALID_PROVIDER_RESPONSE/);
 }
});
test('rejects invalid job identifiers before lookup',async()=>{
 let called=false;
 const get=createGenerationProviderStatusAdapter({enabled:true,lookup:async()=>{called=true}});
 await assert.rejects(get({providerJobId:' '}),/INVALID_PROVIDER_JOB_ID/);
 assert.equal(called,false);
});
