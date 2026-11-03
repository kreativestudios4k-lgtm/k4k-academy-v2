import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesImageSignature,verifyOwnedImageBytes} from '../lib/server/generation-media-signatures.mjs';
const user='25d0e48c-5dd5-4d84-a3b9-0e5bd6227a65';
const job='d7411f09-a330-49b4-a953-2838b75eb99a';
const path=user+'/'+job+'/image_12345678.webp';
const webp=Uint8Array.from([82,73,70,70,4,0,0,0,87,69,66,80,86,80,56,32]);
const fakeBlob=(bytes)=>({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
function storage(bytes,opts={}){
 return {from(bucket){assert.equal(bucket,'k4k-generation-inputs');return {
  info:async p=>({data:{metadata:{size:opts.size??bytes.length,mimetype:opts.mime??'image/webp'}}}),
  download:async p=>({data:opts.failDownload?null:fakeBlob(bytes),error:opts.failDownload?{message:'no'}:null})
 };}};
}
test('recognizes PNG JPEG WebP headers and rejects mismatches',()=>{
 assert.equal(matchesImageSignature(Uint8Array.from([255,216,255,224]),'image/jpeg'),true);
 assert.equal(matchesImageSignature(Uint8Array.from([137,80,78,71,13,10,26,10]),'image/png'),true);
 assert.equal(matchesImageSignature(webp,'image/webp'),true);
 assert.equal(matchesImageSignature(webp,'image/png'),false);
 assert.equal(matchesImageSignature(Uint8Array.from([82,73,70,70]),'image/webp'),false);
});
test('verifies existing owned image actual bytes',async()=>{
 const out=await verifyOwnedImageBytes(storage(webp),user,path);
 assert.equal(out.signatureChecked,true);assert.equal(out.bytes,webp.length);
});
test('fails closed on forged MIME, truncated image and size mismatch',async()=>{
 await assert.rejects(verifyOwnedImageBytes(storage(webp,{mime:'image/png'}),user,path));
 await assert.rejects(verifyOwnedImageBytes(storage(webp,{size:123}),user,path));
 await assert.rejects(verifyOwnedImageBytes(storage(Uint8Array.from([82,73,70,70])),user,path));
});
test('rejects unavailable storage bytes and cross-account paths',async()=>{
 await assert.rejects(verifyOwnedImageBytes(storage(webp,{failDownload:true}),user,path));
 await assert.rejects(verifyOwnedImageBytes(storage(webp),'7c92fe60-10eb-4185-9b2d-36a8f23ab3d3',path));
});
