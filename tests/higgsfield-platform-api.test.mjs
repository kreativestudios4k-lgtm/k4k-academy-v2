import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiggsfieldPlatformApi,higgsfieldModelAccess,higgsfieldPreviewCredential} from '../lib/server/higgsfield-platform-api.mjs';
const reply=data=>({ok:true,json:async()=>data});
test('pilot is disabled by default and requires preview plus server key',()=>{
 assert.equal(higgsfieldModelAccess({}),false);
 assert.equal(higgsfieldModelAccess({VERCEL_ENV:'production',HF_API_KEY:'opaque',K4K_HIGGSFIELD_API_PILOT:'true'}),false);
 assert.equal(higgsfieldModelAccess({VERCEL_ENV:'preview',HF_API_KEY:'opaque',K4K_HIGGSFIELD_API_PILOT:'true'}),true);
 assert.equal(higgsfieldModelAccess({VERCEL_ENV:'preview',HF_CREDENTIALS:'id:secret',K4K_HIGGSFIELD_API_PILOT:'true'}),true);
 assert.equal(higgsfieldPreviewCredential({VERCEL_ENV:'preview',HF_CREDENTIALS:'id:secret'}),'id:secret');
 assert.equal(higgsfieldPreviewCredential({VERCEL_ENV:'production',HF_API_KEY:'prod_secret'}),null);
});
test('submit is opt-in, uses the exact copied key, fixed origin and verified model path',async()=>{
 const requests=[];const api=createHiggsfieldPlatformApi({credentials:'opaque-key',fetchImpl:async(url,init)=>{requests.push({url,init});return reply({request_id:'safe_123',status_url:'https://api.higgsfield.ai/requests/safe_123/status'})}});
 await assert.rejects(api.submit({modelPath:'higgsfield/genjutsu/motion-transfer/v1.0',input:{prompt:'test'}}),/GENERATION_DISABLED/);
 assert.equal(requests.length,0);
 await assert.rejects(api.submit({enabled:true,modelPath:'https://evil.example/a',input:{}}),/MODEL_PATH_INVALID/);
 const result=await api.submit({enabled:true,modelPath:'higgsfield/genjutsu/motion-transfer/v1.0',input:{prompt:'test'}});
 assert.equal(result.request_id,'safe_123');
 assert.equal(requests[0].url,'https://api.higgsfield.ai/higgsfield/genjutsu/motion-transfer/v1.0');
 assert.equal(requests[0].init.headers.Authorization,'Key opaque-key');
 assert.equal(requests[0].init.redirect,'error');
 assert.equal(JSON.parse(requests[0].init.body).prompt,'test');
});
test('poll status and cancel always use a pinned origin, never provider-supplied URLs',async()=>{
 const paths=[];const api=createHiggsfieldPlatformApi({credentials:'complete',fetchImpl:async(url)=>{paths.push(url);return reply(paths.length===1?{status:'completed',video:{url:'https://cdn.example/output.mp4'}}:{ok:true})}});
 assert.equal((await api.status('safe_123')).status,'completed');
 assert.equal(paths[0],'https://api.higgsfield.ai/requests/safe_123/status');
 await assert.rejects(api.cancel('safe_123'),/CANCEL_DISABLED/);
 await api.cancel('safe_123',{enabled:true});
 assert.equal(paths[1],'https://api.higgsfield.ai/requests/safe_123/cancel');
 await assert.rejects(api.status('../admin'),/REQUEST_ID_INVALID/);
});
test('uploads require explicit opt in and typed image, and do not upload browser media with key',async()=>{
 const requests=[];const api=createHiggsfieldPlatformApi({credentials:'complete',fetchImpl:async(url,init)=>{requests.push({url,init});return reply({upload_url:'https://upload.example/signed',upload_headers:{'x-upload-token':'temporary'},public_url:'https://cdn.example/ref.png'})}});
 await assert.rejects(api.createImageUpload({contentType:'image/png'}),/UPLOAD_DISABLED/);
 await assert.rejects(api.createImageUpload({contentType:'video/mp4',enabled:true}),/MEDIA_TYPE_INVALID/);
 const data=await api.createImageUpload({contentType:'image/png',enabled:true});
 assert.equal(data.public_url,'https://cdn.example/ref.png');
 assert.equal(requests[0].url,'https://api.higgsfield.ai/files/generate-upload-url');
 assert.equal(requests[0].init.headers.Authorization,'Key complete');
});
