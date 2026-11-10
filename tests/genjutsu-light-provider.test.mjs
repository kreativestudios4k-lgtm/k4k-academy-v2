import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenjutsuLightProvider,validateGenjutsuLightInput,estimateGenjutsuLightCost,GENJUTSU_LIGHT_ENDPOINT} from '../lib/server/genjutsu-light-provider.mjs';
const input={video_url:'https://example.com/video.mp4',image_urls:['https://example.com/face.png'],resolution:'720p'};
test('model accepts supported inputs and rejects invalid references',()=>{
 assert.deepEqual(validateGenjutsuLightInput(input),{...input,prompt:''});
 assert.throws(()=>validateGenjutsuLightInput({...input,image_urls:[]}));
 assert.throws(()=>validateGenjutsuLightInput({...input,resolution:'4k'}));
 assert.throws(()=>validateGenjutsuLightInput({...input,video_url:'http://example.com/video.mp4'}));
 assert.throws(()=>validateGenjutsuLightInput({...input,image_urls:Array(9).fill('https://example.com/x.png')}));
});
test('billing estimate includes rounded output seconds',()=>{
 assert.equal(estimateGenjutsuLightCost({resolution:'720p',outputSeconds:14.2}),1.5);
 assert.equal(estimateGenjutsuLightCost({resolution:'480p',outputSeconds:10,referenceSeconds:5}),0.75);
});
test('provider fails closed without explicit enablement',async()=>{
 const provider=createGenjutsuLightProvider({credentials:'key:secret',fetchImpl:()=>{throw new Error('must not call')}});
 await assert.rejects(provider.submit(input),/disabled/);
});
test('enabled provider posts the documented request with server authorization',async()=>{
 let call;
 const provider=createGenjutsuLightProvider({enabled:true,maxUsd:5,providerQuoteUsd:1,verifiedOutputSeconds:5,verifiedReferenceSeconds:5,credentials:'key:secret',fetchImpl:async(url,options)=>{call={url,options};return {ok:true,json:async()=>({status:'queued',request_id:'request-1'})}}});
 const result=await provider.submit(input);
 assert.equal(result.status,'queued');
 assert.equal(call.url,GENJUTSU_LIGHT_ENDPOINT);
 assert.equal(call.options.headers.Authorization,'Key key:secret');
 assert.equal(JSON.parse(call.options.body).video_url,input.video_url);
});

test('enabled provider rejects requests without verified budget and duration before network',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;throw Error('should not submit')};
 const base={enabled:true,credentials:'key:secret',fetchImpl};
 await assert.rejects(createGenjutsuLightProvider(base).submit(input),/spending cap/);
 await assert.rejects(createGenjutsuLightProvider({...base,maxUsd:5}).submit(input),/media duration/);
 await assert.rejects(createGenjutsuLightProvider({...base,maxUsd:5,verifiedOutputSeconds:15,verifiedReferenceSeconds:50}).submit(input),/exceeds authorized/);
 await assert.rejects(createGenjutsuLightProvider({...base,maxUsd:6,verifiedOutputSeconds:5,verifiedReferenceSeconds:5}).submit(input),/spending cap/);
 assert.equal(calls,0);
});

test('local USD estimate alone cannot authorize a billable provider call',async()=>{
 let calls=0;
 const base={enabled:true,credentials:'key:secret',maxUsd:5,verifiedOutputSeconds:5,verifiedReferenceSeconds:5,fetchImpl:async()=>{calls++;throw Error('unexpected request')}};
 await assert.rejects(createGenjutsuLightProvider(base).submit(input),/Verified provider USD quote required/);
 await assert.rejects(createGenjutsuLightProvider({...base,providerQuoteUsd:5.01}).submit(input),/quote exceeds/);
 assert.equal(calls,0);
});

test('opaque API keys are accepted and empty keys are rejected',async()=>{
 const base={enabled:true,maxUsd:5,providerQuoteUsd:1,verifiedOutputSeconds:5,verifiedReferenceSeconds:5};
 await assert.rejects(createGenjutsuLightProvider({...base,credentials:'  '}).submit(input),/credentials not configured/);
 let authorization;
 const provider=createGenjutsuLightProvider({...base,credentials:'opaque-api-key',fetchImpl:async(_url,options)=>{
  authorization=options.headers.Authorization;
  return {ok:true,json:async()=>({status:'queued',request_id:'test-id'})};
 }});
 await provider.submit(input);
 assert.equal(authorization,'Key opaque-api-key');
});
