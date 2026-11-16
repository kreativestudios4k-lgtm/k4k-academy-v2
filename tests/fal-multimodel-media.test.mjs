import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFalMultimodelOutput} from '../lib/server/fal-multimodel-media.mjs';
import {createFalMultimodelMediaRetriever} from '../lib/server/fal-multimodel-media-retriever.mjs';
const png=new Uint8Array(2048);png.set([137,80,78,71,13,10,26,10]);png.set([73,72,68,82],12);
const mp4=new Uint8Array(2048);mp4.set([0,0,0,24,102,116,121,112,105,115,111,109]);
const imgUrl='https://v3b.fal.media/files/b/example/image.png';
const videoUrl='https://storage.googleapis.com/falserverless/example/video.mp4';
const imageResult={images:[{url:imgUrl,content_type:'image/png',file_size:2048}]};
const videoResult={video:{url:videoUrl,content_type:'video/mp4',file_size:2048}};
function fakeResponse(bytes,mime){
 return {ok:true,headers:{get(k){if(k==='content-type')return mime;if(k==='content-length')return String(bytes.length);return null;}},body:{getReader(){let done=false;return {async read(){if(done)return {done:true};done=true;return {done:false,value:bytes};},async cancel(){}}}}};
}
test('models accept only their documented output shapes',()=>{
 assert.equal(parseFalMultimodelOutput('flux3-t2i',imageResult).contentType,'image/png');
 assert.equal(parseFalMultimodelOutput('nano-banana-21-t2i',imageResult).contentType,'image/png');
 assert.equal(parseFalMultimodelOutput('kling-flash-t2v',videoResult).contentType,'video/mp4');
 assert.equal(parseFalMultimodelOutput('seedance-25-t2v',videoResult).contentType,'video/mp4');
 assert.throws(()=>parseFalMultimodelOutput('flux3-t2i',{images:[]}),/INVALID_PROVIDER_RESULT/);
 assert.throws(()=>parseFalMultimodelOutput('flux3-t2i',{images:[imageResult.images[0],imageResult.images[0]]}),/INVALID_PROVIDER_RESULT/);
 assert.throws(()=>parseFalMultimodelOutput('kling-flash-t2v',imageResult),/INVALID_PROVIDER_RESULT/);
});
test('rejects hostile and non-fal media paths before fetch',()=>{
 for(const url of ['http://v3b.fal.media/files/x','https://evil.test/x.png','https://127.0.0.1/x.png','https://storage.googleapis.com/otherbucket/x.png','https://user:pass@v3b.fal.media/file.png','https://v3b.fal.media/file.png#frag']){
  assert.throws(()=>parseFalMultimodelOutput('flux3-t2i',{images:[{url,content_type:'image/png'}]}),/UNTRUSTED_PROVIDER_MEDIA/);
 }
});
test('bounded verified PNG and MP4 outputs return only private bytes',async()=>{
 for(const [model,result,bytes,mime] of [['flux3-t2i',imageResult,png,'image/png'],['kling-flash-t2v',videoResult,mp4,'video/mp4']]){
  const urls=[];
  const retrieve=createFalMultimodelMediaRetriever({enabled:true,fetchImpl:async(url,options)=>{urls.push(url);assert.equal(options.redirect,'error');return fakeResponse(bytes,mime);}});
  const res=await retrieve({model,authenticatedResult:result});
  assert.equal(res.contentType,mime);assert.deepEqual(res.bytes,bytes);
  assert.equal(urls.length,1);
 }
});
test('MIME mismatch, corrupt bytes, and overlimit claims are rejected',async()=>{
 const wrong=createFalMultimodelMediaRetriever({enabled:true,fetchImpl:async()=>fakeResponse(png,'text/html')});
 await assert.rejects(wrong({model:'flux3-t2i',authenticatedResult:imageResult}),/INVALID_PROVIDER_MEDIA_TYPE/);
 const invalid=createFalMultimodelMediaRetriever({enabled:true,fetchImpl:async()=>fakeResponse(new Uint8Array(2048),'image/png')});
 await assert.rejects(invalid({model:'flux3-t2i',authenticatedResult:imageResult}),/INVALID_OUTPUT_HEADER/);
 assert.throws(()=>parseFalMultimodelOutput('flux3-t2i',{images:[{url:imgUrl,content_type:'image/png',file_size:25*1024*1024}]}),/INVALID_PROVIDER_MEDIA_SIZE/);
});
test('disabled retriever cannot fetch a provider URL',async()=>{
 let calls=0;
 const retrieve=createFalMultimodelMediaRetriever({fetchImpl:async()=>{calls++;return fakeResponse(png,'image/png')}});
 await assert.rejects(retrieve({model:'flux3-t2i',authenticatedResult:imageResult}),/MULTIMODEL_MEDIA_RETRIEVAL_DISABLED/);
 assert.equal(calls,0);
});
