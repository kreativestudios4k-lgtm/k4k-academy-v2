import test from 'node:test';
import assert from 'node:assert/strict';
import {K4K_MODELS,estimateK4KProviderCost,validateK4KGeneration,createK4KModelProvider} from '../lib/server/k4k-models.mjs';
const input={video_url:'https://example.com/video.mp4',image_urls:['https://example.com/character.png'],resolution:'720p'};
test('only two models and their exact endpoints are allowed',()=>{
 assert.deepEqual(Object.keys(K4K_MODELS),['lite','pro']);
 assert.equal(K4K_MODELS.pro.modelId,'higgsfield/genjutsu/motion-transfer/v1.0');
 assert.throws(()=>validateK4KGeneration('kling',input));
 assert.deepEqual(validateK4KGeneration('pro',input),{...input,prompt:''});
});
test('pricing and duration caps differ by tier',()=>{
 assert.equal(estimateK4KProviderCost('lite',{sourceSeconds:15}),1.5);
 assert.equal(estimateK4KProviderCost('pro',{sourceSeconds:15}),10.215);
 assert.equal(estimateK4KProviderCost('pro',{sourceSeconds:30,resolution:'1080p'}),48.96);
 assert.throws(()=>estimateK4KProviderCost('lite',{sourceSeconds:16}));
 assert.throws(()=>estimateK4KProviderCost('pro',{sourceSeconds:31}));
});
test('no paid request without explicit enablement',async()=>{
 const p=createK4KModelProvider({credentials:'id:secret',fetchImpl:()=>{throw Error('should not call')}});
 await assert.rejects(p.submit('pro',input),/disabled/);
});
test('Pro routes only to documented Genjutsu endpoint',async()=>{
 let url;
 const p=createK4KModelProvider({enabled:true,credentials:'id:secret',maxUsd:5,providerQuoteUsd:3,verifiedSourceSeconds:4,verifiedReferenceSeconds:0,fetchImpl:async(u)=>{url=u;return {ok:true,json:async()=>({request_id:'test-id',status:'queued'})}}});
 await p.submit('pro',input);
 assert.equal(url,K4K_MODELS.pro.endpoint);
});

test('actual K4K provider blocks billable requests without independent quote and verified duration',async()=>{
 let calls=0;
 const base={enabled:true,credentials:'id:secret',fetchImpl:async()=>{calls++;throw Error('unexpected network call')}};
 await assert.rejects(createK4KModelProvider(base).submit('lite',input),/spending cap/);
 await assert.rejects(createK4KModelProvider({...base,maxUsd:5}).submit('lite',input),/media duration/);
 await assert.rejects(createK4KModelProvider({...base,maxUsd:5,verifiedSourceSeconds:5,verifiedReferenceSeconds:0}).submit('lite',input),/provider USD quote/);
 await assert.rejects(createK4KModelProvider({...base,maxUsd:5,verifiedSourceSeconds:5,verifiedReferenceSeconds:0,providerQuoteUsd:5.01}).submit('lite',input),/quote exceeds/);
 await assert.rejects(createK4KModelProvider({...base,maxUsd:5,verifiedSourceSeconds:15,verifiedReferenceSeconds:0,providerQuoteUsd:4}).submit('pro',input),/Estimated cost exceeds/);
 assert.equal(calls,0);
});

test('active K4K provider requires key-secret credentials and rejects malformed credentials',async()=>{
 const base={enabled:true,maxUsd:5,providerQuoteUsd:1,verifiedSourceSeconds:4,verifiedReferenceSeconds:0};
 await assert.rejects(createK4KModelProvider({...base,credentials:'  '}).submit('lite',input),/Missing server credentials/);
 let auth;
 const provider=createK4KModelProvider({...base,credentials:'key:secret',fetchImpl:async(_url,options)=>{
  auth=options.headers.Authorization;
  return {ok:true,json:async()=>({request_id:'test-id',status:'queued'})};
 }});
 await provider.submit('lite',input);
 assert.equal(auth,'Key key:secret');
});
