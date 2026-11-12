import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationProviderMediaAdapter} from '../lib/server/generation-provider-media-adapter.mjs';
const providerJobId='provider-123',verifiedStatus={providerJobId,status:'completed'};
const bytes=new Uint8Array(2048);
bytes.set([0,0,0,24,102,116,121,112,105,115,111,109],0);
test('disabled by default',async()=>{
 const retrieve=createGenerationProviderMediaAdapter({download:async()=>({bytes,contentType:'video/mp4'})});
 await assert.rejects(retrieve({providerJobId,verifiedStatus}),/PROVIDER_MEDIA_DISABLED/);
});
test('rejects unverified and mismatched provider jobs before download',async()=>{
 let calls=0;
 const retrieve=createGenerationProviderMediaAdapter({enabled:true,download:async()=>{calls++;return {bytes,contentType:'video/mp4'}}});
 await assert.rejects(retrieve({providerJobId,verifiedStatus:{providerJobId:'other',status:'completed'}}),/UNVERIFIED_PROVIDER_COMPLETION/);
 await assert.rejects(retrieve({providerJobId,verifiedStatus:{providerJobId,status:'processing'}}),/UNVERIFIED_PROVIDER_COMPLETION/);
 assert.equal(calls,0);
});
test('retrieves bytes using only verified provider ID',async()=>{
 const seen=[];
 const retrieve=createGenerationProviderMediaAdapter({enabled:true,download:async args=>{seen.push(args);return {bytes,contentType:'video/mp4',url:'https://ignored.invalid/video'}}});
 const result=await retrieve({providerJobId,verifiedStatus});
 assert.equal(result.bytes,bytes);
 assert.deepEqual(seen,[{providerJobId,maxBytes:100*1024*1024}]);
 assert.deepEqual(Object.keys(result),['bytes','contentType']);
});
test('rejects invalid media and fails closed',async()=>{
 for(const response of [null,{bytes,contentType:'text/html'},{bytes:new Uint8Array(10),contentType:'video/mp4'},{bytes:new Uint8Array(2048),contentType:'video/mp4'}]){
  const retrieve=createGenerationProviderMediaAdapter({enabled:true,download:async()=>response});
  await assert.rejects(retrieve({providerJobId,verifiedStatus}),/INVALID_PROVIDER_MEDIA|INVALID_PROVIDER_MEDIA_SIZE|INVALID_MP4_HEADER/);
 }
});
