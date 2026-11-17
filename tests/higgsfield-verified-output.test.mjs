import test from 'node:test';
import assert from 'node:assert/strict';
import {ReadableStream} from 'node:stream/web';
import {createHiggsfieldVerifiedOutputRetriever} from '../lib/server/higgsfield-verified-output.mjs';
const rid='01a1e884-0fb7-70e0-bf45-b42cfd747410';
const url='https://d3u0tzju9qaucj.cloudfront.net/95042270-a834-4075-88c0-26591ab26cdc/'+rid+'/dc9f3240-95c2-46ad-9657-55d36e56bd3d.mp4';
const bytes=new Uint8Array(2048);bytes.set([0,0,0,24,102,116,121,112,105,115,111,109]);
function fixture({status='completed',link=url,type='video/mp4',length=2048,request=rid,media=bytes}={}){
 const seen=[];
 const provider={status:async id=>{seen.push(['status',id]);return {request_id:request,status,video:{url:link}};}};
 const fetchImpl=async(input,options)=>{
  seen.push(['fetch',input,options]);
  return {status:200,headers:{get:head=>head==='content-type'?type:head==='content-length'?String(length):null},
   body:new ReadableStream({start(controller){controller.enqueue(media);controller.close();}})};
 };
 return {retriever:createHiggsfieldVerifiedOutputRetriever({provider,fetchImpl,enabled:true}),seen};
}
test('verified completed request retrieves bounded valid MP4 from fixed CDN',async()=>{
 const {retriever,seen}=fixture();
 const result=await retriever.retrieve({providerRequestId:rid,expectedKind:'video'});
 assert.equal(result.providerRequestId,rid);
 assert.equal(result.contentType,'video/mp4');
 assert.deepEqual(result.bytes,bytes);
 assert.equal(seen.length,2);assert.equal(seen[1][1],url);
 assert.equal(seen[1][2].redirect,'error');
});
test('no fetch on fake completed status, mismatch or unapproved CDN path',async()=>{
 for(const args of [
  {status:'failed'},{request:'wrong'},{link:'https://internal.example.com/video.mp4'},
  {link:'https://127.0.0.1/private.mp4'}, {link:url+'?redirect=1'},
  {link:url.replace(rid,'different-request')},
  {link:url.replace('https://','http://')}
 ]){
  const {retriever,seen}=fixture(args);
  await assert.rejects(retriever.retrieve({providerRequestId:rid}),/PROVIDER_COMPLETION_NOT_VERIFIED|PROVIDER_OUTPUT_URL_UNTRUSTED/);
  assert.equal(seen.length,1);
 }
});
test('rejects MIME spoof, too-large or truncated response, malformed MP4',async()=>{
 for(const args of [{type:'text/html'},{length:100*1024*1024+1},{length:512},{media:new Uint8Array(2048)}]){
  const {retriever}=fixture(args);
  await assert.rejects(retriever.retrieve({providerRequestId:rid}),/PROVIDER_OUTPUT_INVALID|PROVIDER_OUTPUT_LENGTH_MISMATCH|INVALID_MP4_HEADER/);
 }
});
test('disabled adapter rejects before any external request',async()=>{
 const {retriever}=fixture();
 await assert.rejects(createHiggsfieldVerifiedOutputRetriever({enabled:false}).retrieve({providerRequestId:rid}),/HIGGSFIELD_OUTPUT_RETRIEVAL_DISABLED/);
 await assert.rejects(retriever.retrieve({providerRequestId:rid,expectedKind:'image'}),/INVALID_PROVIDER_JOB_ID/);
});
