import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyOwnedMediaObject,verifyOwnedReferenceImages} from '../lib/server/generation-media-storage.mjs';
const user='25d0e48c-5dd5-4d84-a3b9-0e5bd6227a65';
const other='7c92fe60-10eb-4185-9b2d-36a8f23ab3d3';
const job='d7411f09-a330-49b4-a953-2838b75eb99a';
const path=user+'/'+job+'/image_12345678.webp';
function storage(data,error=null) { return {from(bucket){assert.equal(bucket,'k4k-generation-inputs');return {async info(name){assert.equal(name,path);return {data,error};}};}}; }
test('accepts existing owned object with safe metadata',async()=>{
 const v=await verifyOwnedMediaObject(storage({metadata:{size:2000,mimetype:'image/webp'}}),user,path,'image');
 assert.deepEqual({bytes:v.bytes,mime:v.mime},{bytes:2000,mime:'image/webp'});
 assert.equal((await verifyOwnedReferenceImages(storage({metadata:{size:2000,mimetype:'image/webp'}}),user,[path])).length,1);
});
test('rejects cross-account reference before any storage lookup',async()=>{
 let called=false;
 await assert.rejects(verifyOwnedMediaObject({from(){called=true;}},user,path.replace(user,other),'image'));
 assert.equal(called,false);
});
test('fails closed for missing objects, metadata errors, missing info API',async()=>{
 await assert.rejects(verifyOwnedMediaObject(storage(null,{message:'not found'}),user,path,'image'));
 await assert.rejects(verifyOwnedMediaObject({from:()=>({})},user,path,'image'));
 await assert.rejects(verifyOwnedMediaObject({from:()=>({info:async()=>{throw Error('network')}})},user,path,'image'));
});
test('rejects forged MIME, oversized, zero or malformed size',async()=>{
 for(const metadata of [{size:100,mimetype:'image/jpeg'},{size:100,mimetype:'text/html'},{size:16000000,mimetype:'image/webp'},{size:0,mimetype:'image/webp'},{size:'NaN',mimetype:'image/webp'}]){
  await assert.rejects(verifyOwnedMediaObject(storage({metadata}),user,path,'image'));
 }
});
