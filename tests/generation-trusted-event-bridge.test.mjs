import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createTrustedGenerationEventBridge} from '../lib/server/generation-trusted-event-bridge.mjs';
const secret='s'.repeat(64),timestamp='1794268800000',nonce='nonce_12345678901234567890';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222';
const rawBody=JSON.stringify({userId,jobId,providerJobId:'mock-provider',outcome:'completed',outputPath:userId+'/'+jobId+'.mp4'});
const headers={'x-k4k-event-timestamp':timestamp,'x-k4k-event-nonce':nonce,'x-k4k-event-signature':'sha256='+createHmac('sha256',secret).update(timestamp+'.'+nonce+'.'+rawBody).digest('hex')};
test('signed event settles once and replay cannot settle again',async()=>{
 const used=new Set();let calls=0;
 const bridge=createTrustedGenerationEventBridge({secret,enabled:true,now:()=>Number(timestamp),claimNonce:async n=>{if(used.has(n))return false;used.add(n);return true},pipeline:{complete:async args=>{calls++;assert.equal(args.jobId,jobId);assert.equal(args.outputPath,userId+'/'+jobId+'.mp4');return {status:'settled'}}}});
 assert.deepEqual(await bridge.handle({headers,rawBody}),{status:'settled'});
 await assert.rejects(bridge.handle({headers,rawBody}),/UNAUTHENTICATED/);assert.equal(calls,1);
});
test('tampered body cannot trigger settlement',async()=>{
 let calls=0;const bridge=createTrustedGenerationEventBridge({secret,enabled:true,now:()=>Number(timestamp),claimNonce:async()=>true,pipeline:{complete:async()=>{calls++}}});
 await assert.rejects(bridge.handle({headers,rawBody:rawBody.replace('completed','failed')}),/UNAUTHENTICATED/);assert.equal(calls,0);
});
test('bridge is disabled by default',async()=>{
 await assert.rejects(createTrustedGenerationEventBridge().handle({headers,rawBody}),/PROVIDER_EVENTS_DISABLED/);
});
