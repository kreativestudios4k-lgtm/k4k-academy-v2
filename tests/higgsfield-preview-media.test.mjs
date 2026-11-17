import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectHiggsfieldPreviewMedia,createHiggsfieldPreviewMediaHandler} from '../lib/server/higgsfield-preview-media.mjs';
const owner='0ef1af08-4df8-4858-967b-eac1a16f9f2c',other='11111111-1111-4111-8111-111111111111';
const file='22222222-2222-4222-8222-222222222222';
const body={videoPath:owner+'/'+file+'.mp4',referencePaths:[owner+'/'+file+'.png'],resolution:'480p'};
const box=(type,data)=>{const b=Buffer.alloc(8+data.length);b.writeUInt32BE(b.length);b.write(type,4);data.copy(b,8);return b;};
function video(seconds=4.77){const mvhd=Buffer.alloc(20);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(seconds*1000,16);return Buffer.concat([box('ftyp',Buffer.from('isom0000')),box('moov',box('mvhd',mvhd))]);}
const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(512,16);png.writeUInt32BE(512,20);
function client({bytes=video(),userId=owner}={}){
 const reads=[];
 return {reads,auth:{getUser:async()=>({data:{user:{id:userId}}})},storage:{from:bucket=>({download:async path=>{
  reads.push([bucket,path]);return {data:new Blob([bucket==='studio-videos'?bytes:png])};
 }})}};
}
test('reads owned private bytes, uses MP4 duration and cannot authorize dispatch',async()=>{
 const c=client(),r=await inspectHiggsfieldPreviewMedia({client:c,userId:owner,body});
 assert.equal(r.sourceSeconds,4.77);assert.equal(r.billedSeconds,5);assert.equal(r.estimatedProviderUsd,0.77);
 assert.equal(r.verifiedVideoDuration,true);assert.equal(r.verifiedInputStorage,true);
 for(const key of ['signedQuote','creditsReserved','providerDispatched','generationEnabled'])assert.equal(r[key],false);
 assert.equal(c.reads.length,2);
});
test('cross-user paths, duplicate references, URLs and browser pricing rejected before storage',async()=>{
 for(const changed of [{videoPath:other+'/'+file+'.mp4'},{referencePaths:[other+'/'+file+'.png']},{referencePaths:[...body.referencePaths,...body.referencePaths]},{videoPath:'https://example.com/input.mp4'},{seconds:4},{credits:1},{resolution:'4k'}]){
  const c=client();await assert.rejects(inspectHiggsfieldPreviewMedia({client:c,userId:owner,body:{...body,...changed}}));assert.equal(c.reads.length,0);
 }
});
test('malformed and out-of-range MP4s cannot produce verified estimates',async()=>{
 for(const bytes of [Buffer.from('not an MP4 file'),video(3),video(31)]){
  await assert.rejects(inspectHiggsfieldPreviewMedia({client:client({bytes}),userId:owner,body}));
 }
});
const env={VERCEL_ENV:'preview',NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-key'};
const req=(data=body,headers={})=>new Request('https://preview.example/api/higgsfield/customer-preview-media',{method:'POST',headers:{origin:'https://preview.example',authorization:'Bearer test-token','Content-Type':'application/json',...headers},body:JSON.stringify(data)});
test('production, wrong origin, missing token and wrong owner fail closed',async()=>{
 for(const [changes,headers,userId,status] of [[{VERCEL_ENV:'production'},{},owner,404],[{},{origin:'https://evil.example'},owner,403],[{},{authorization:''},owner,401],[{},{},other,404]]){
  const c=client({userId}),handler=createHiggsfieldPreviewMediaHandler({env:{...env,...changes},createClient:()=>c});
  assert.equal((await handler(req(body,headers))).status,status);assert.equal(c.reads.length,0);
 }
});
test('owner preflight is read-only and verification retains user JWT for storage RLS',async()=>{
 const c=client();let options;
 const handler=createHiggsfieldPreviewMediaHandler({env,createClient:(_url,key,opts)=>{assert.equal(key,'public-key');options=opts;return c;}});
 const preflight=await handler(req({preflight:true}));assert.equal(preflight.status,200);assert.equal(c.reads.length,0);
 assert.deepEqual(await preflight.json(),{uploadAllowed:true,generationEnabled:false});
 const response=await handler(req());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.equal(options.global.headers.Authorization,'Bearer test-token');assert.equal((await response.json()).verifiedVideoDuration,true);
});
