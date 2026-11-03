import test from 'node:test';
import assert from 'node:assert/strict';
import {createVideoProvider} from '../lib/server/higgsfield-video.mjs';
const handle={requestId:'job',statusUrl:'https://api.higgsfield.ai/requests/job/status'};
const fakeFetch=url=>({ok:true,json:async()=>({request_id:'job',status:'completed',video:{url}})});
test('accepts completed video from explicitly trusted HTTPS CDN',async()=>{
 const provider=createVideoProvider({credentials:'test:key',trustedOutputOrigins:['https://media.example'],fetchImpl:async()=>fakeFetch('https://media.example/video.mp4')});
 assert.equal((await provider.status(handle)).videoUrl,'https://media.example/video.mp4');
});
test('rejects completed video on attacker-controlled origin',async()=>{
 const provider=createVideoProvider({credentials:'test:key',trustedOutputOrigins:['https://media.example'],fetchImpl:async()=>fakeFetch('https://evil.example/video.mp4')});
 await assert.rejects(()=>provider.status(handle),/Untrusted provider output origin/);
});
test('fails closed if trusted output origins are not configured',async()=>{
 const provider=createVideoProvider({credentials:'test:key',fetchImpl:async()=>fakeFetch('https://media.example/video.mp4')});
 await assert.rejects(()=>provider.status(handle),/Untrusted provider output origin/);
});
test('rejects unsafe origin configuration',async()=>{
 const provider=createVideoProvider({credentials:'test:key',trustedOutputOrigins:['http://media.example'],fetchImpl:async()=>fakeFetch('https://media.example/video.mp4')});
 await assert.rejects(()=>provider.status(handle),/Untrusted provider output origin/);
});
test('does not require output origin for queued jobs',async()=>{
 const provider=createVideoProvider({credentials:'test:key',fetchImpl:async()=>({ok:true,json:async()=>({request_id:'job',status:'queued'})})});
 assert.equal((await provider.status(handle)).status,'queued');
});
