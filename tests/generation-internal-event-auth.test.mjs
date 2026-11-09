import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createInternalGenerationEventAuthenticator} from '../lib/server/generation-internal-event-auth.mjs';
const secret='a'.repeat(64),timestamp='1794268800000',nonce='random_nonce_123456789',rawBody=JSON.stringify({jobId:'mock'});
const signature='sha256='+createHmac('sha256',secret).update(timestamp+'.'+nonce+'.'+rawBody).digest('hex');
const headers={'x-k4k-event-timestamp':timestamp,'x-k4k-event-nonce':nonce,'x-k4k-event-signature':signature};
test('accepts a fresh valid signed internal event exactly once',async()=>{
 const seen=new Set();const auth=createInternalGenerationEventAuthenticator({secret,now:()=>Number(timestamp),claimNonce:async n=>{if(seen.has(n))return false;seen.add(n);return true}});
 assert.equal(await auth({headers,rawBody}),true);assert.equal(await auth({headers,rawBody}),false);
});
test('rejects tampered payload, stale timestamp and missing nonce store',async()=>{
 const options={secret,now:()=>Number(timestamp),claimNonce:async()=>true};
 assert.equal(await createInternalGenerationEventAuthenticator(options)({headers,rawBody:rawBody+'!'}),false);
 assert.equal(await createInternalGenerationEventAuthenticator({...options,now:()=>Number(timestamp)+300001})({headers,rawBody}),false);
 assert.equal(await createInternalGenerationEventAuthenticator({secret,now:()=>Number(timestamp)})({headers,rawBody}),false);
});
test('rejects missing or short secrets',async()=>{
 assert.equal(await createInternalGenerationEventAuthenticator({secret:'short',now:()=>Number(timestamp),claimNonce:async()=>true})({headers,rawBody}),false);
});
