import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationProviderEventHandler} from '../lib/server/generation-provider-event.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222';
const payload={userId,jobId,providerJobId:'provider-123',outcome:'completed',outputPath:userId+'/'+jobId+'.mp4'};
test('provider event handling is disabled by default',async()=>{
 let called=false;const handler=createGenerationProviderEventHandler({pipeline:{complete:async()=>{called=true}},authenticate:async()=>true});
 await assert.rejects(handler.handle({payload}),/PROVIDER_EVENTS_DISABLED/);assert.equal(called,false);
});
test('unauthenticated provider event never settles credits',async()=>{
 let called=false;const handler=createGenerationProviderEventHandler({enabled:true,authenticate:async()=>false,pipeline:{complete:async()=>{called=true}}});
 await assert.rejects(handler.handle({payload}),/PROVIDER_EVENT_UNAUTHENTICATED/);assert.equal(called,false);
});
test('authenticated event delegates exact validated job to guarded completion',async()=>{
 let settled;const handler=createGenerationProviderEventHandler({enabled:true,authenticate:async()=>true,pipeline:{complete:async args=>{settled=args;return {status:'settled'}}}});
 assert.deepEqual(await handler.handle({headers:{},payload}),{status:'settled'});
 assert.deepEqual(settled,payload);
});
test('invalid output or provider job never settles',async()=>{
 let called=false;const handler=createGenerationProviderEventHandler({enabled:true,authenticate:async()=>true,pipeline:{complete:async()=>{called=true}}});
 await assert.rejects(handler.handle({payload:{...payload,outputPath:userId+'/other.mp4'}}),/INVALID_PROVIDER_OUTPUT/);
 await assert.rejects(handler.handle({payload:{...payload,providerJobId:''}}),/INVALID_PROVIDER_EVENT/);
 await assert.rejects(handler.handle({payload:{...payload,outcome:'failed'}}),/INVALID_PROVIDER_OUTPUT/);
 assert.equal(called,false);
});
test('missing authenticator fails closed',async()=>{
 const handler=createGenerationProviderEventHandler({enabled:true,pipeline:{complete:async()=>({})}});
 await assert.rejects(handler.handle({payload}),/PROVIDER_EVENT_HANDLER_UNAVAILABLE/);
});
