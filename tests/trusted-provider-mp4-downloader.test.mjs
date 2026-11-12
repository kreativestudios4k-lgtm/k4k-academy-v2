import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrustedProviderMp4Downloader} from '../lib/server/trusted-provider-mp4-downloader.mjs';
const id='request_123',host='approved-cdn.example';
const bytes=new Uint8Array(2048);bytes.set([0,0,0,24,102,116,121,112],0);
const response=(payload=bytes,mime='video/mp4')=>({ok:true,headers:{get:key=>key==='content-type'?mime:key==='content-length'?String(payload.length):null},body:new ReadableStream({start(controller){controller.enqueue(payload);controller.close()}})});
const setup=(overrides={})=>createTrustedProviderMp4Downloader({enabled:true,allowedHosts:[host],resolveTrustedUrl:async()=>`https://${host}/video.mp4`,fetchImpl:async()=>response(),...overrides});
test('disabled by default',async()=>{await assert.rejects(createTrustedProviderMp4Downloader()({providerJobId:id}),/PROVIDER_DOWNLOAD_DISABLED/)});
test('downloads approved MP4 without redirects',async()=>{let opts;const result=await setup({fetchImpl:async(url,o)=>{opts=o;assert.equal(url,`https://${host}/video.mp4`);return response()}})({providerJobId:id});assert.deepEqual(result.bytes,bytes);assert.equal(opts.redirect,'error')});
test('blocks unapproved domains, http and embedded credentials before fetching',async()=>{
 for(const url of ['https://evil.example/video.mp4','http://approved-cdn.example/video.mp4','https://user:pass@approved-cdn.example/video.mp4','https://approved-cdn.example:8443/video.mp4']){
  let called=false;const download=setup({resolveTrustedUrl:async()=>url,fetchImpl:async()=>{called=true}});
  await assert.rejects(download({providerJobId:id}),/UNTRUSTED_PROVIDER_MEDIA_HOST/);assert.equal(called,false);
 }
});
test('blocks oversized payload and incorrect MIME',async()=>{
 await assert.rejects(setup({maxBytes:1000})({providerJobId:id}),/PROVIDER_MEDIA_TOO_LARGE/);
 await assert.rejects(setup({fetchImpl:async()=>response(bytes,'text/html')})({providerJobId:id}),/INVALID_PROVIDER_MEDIA_TYPE/);
});
test('blocks malformed MP4 and invalid provider IDs',async()=>{
 await assert.rejects(setup({fetchImpl:async()=>response(new Uint8Array(2048))})({providerJobId:id}),/INVALID_MP4_HEADER/);
 await assert.rejects(setup()({providerJobId:'../bad'}),/INVALID_PROVIDER_JOB_ID/);
});
