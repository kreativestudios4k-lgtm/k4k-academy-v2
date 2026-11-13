import test from 'node:test';
import assert from 'node:assert/strict';
import {createFalWanRest,falMotionEstimate,prepareFalMotionInput} from '../lib/server/fal-wan.mjs';
import {generationProviderName,generationSigningSecret} from '../lib/server/generation-provider.mjs';
import {generationUserAllowed} from '../lib/server/generation-policy.mjs';
import {draftFingerprint,quoteSigner} from '../lib/server/generation-quote.mjs';
import {createGenerationSubmitService} from '../lib/server/generation-submit-service.mjs';
const id='11111111-1111-4111-8111-111111111111';
const input={video_url:'https://private.example/reference.mp4',image_urls:['https://private.example/face.jpg'],resolution:'720p',prompt:'Keep the motion.'};
const env={FAL_KEY:'secret',K4K_FAL_WAN_ENABLED:'true',K4K_FAL_RATE_CARD_APPROVED:'true'};
const ok=body=>({ok:true,json:async()=>body});
test('Lite is fixed to 720p; Pro is fixed to 1080p; both bill output seconds only',()=>{
 assert.equal(falMotionEstimate('lite',{resolution:'720p',sourceSeconds:5}).usd,0.7);
 assert.equal(falMotionEstimate('pro',{resolution:'1080p',sourceSeconds:5}).usd,1.4);
 assert.equal(falMotionEstimate('lite',{resolution:'720p',sourceSeconds:5.01}).usd,0.84);
 assert.equal(falMotionEstimate('pro',{resolution:'1080p',sourceSeconds:15}).usd,4.2);
 for(const tier of ['lite','pro'])for(const seconds of [0,1.9,15.01,30,NaN])assert.throws(()=>falMotionEstimate(tier,{resolution:tier==='lite'?'720p':'1080p',sourceSeconds:seconds}),/REFERENCE_DURATION/);
 assert.throws(()=>falMotionEstimate('lite',{resolution:'1080p',sourceSeconds:5}),/INVALID_RESOLUTION/);
 assert.throws(()=>falMotionEstimate('pro',{resolution:'720p',sourceSeconds:5}),/INVALID_RESOLUTION/);
});
test('payload uses verified duration, reference roles and moderation',()=>{
 const result=prepareFalMotionInput('lite',input,{sourceSeconds:5.2});
 assert.equal(result.duration,6);assert.equal(result.enable_safety_checker,true);
 assert.deepEqual(result.reference_video_urls,[input.video_url]);
 assert.deepEqual(result.reference_image_urls,input.image_urls);
 assert.throws(()=>prepareFalMotionInput('lite',{...input,video_url:'http://local/private'},{sourceSeconds:5}));
});
test('estimate is local, explicitly unverified, and cannot use an unapproved rate card',async()=>{
 let calls=0;const rest=createFalWanRest({credentials:'key',env,fetchImpl:async()=>{calls++}});
 const estimate=await rest.estimate('lite',input,{sourceSeconds:5});
 assert.equal(estimate.providerAuthenticated,false);assert.equal(estimate.providerQuoteVerified,false);assert.equal(calls,0);
 await assert.rejects(createFalWanRest({credentials:'key',env:{}}).estimate('lite',input,{sourceSeconds:5}),/RATE_CARD_NOT_APPROVED/);
});
test('submission guards prevent network access; accepted job URLs must match fal queue exactly',async()=>{
 const calls=[];const base='https://queue.fal.run/alibaba/wan-3.0-prime/requests/'+id;
 const rest=createFalWanRest({credentials:'key',env,fetchImpl:async(url,options)=>{calls.push({url,options});return ok({request_id:id,status_url:base+'/status',response_url:base})}});
 const options={enabled:true,idempotencyKey:id,maxUsd:5,quotedUsd:0.7,sourceSeconds:5};
 await assert.rejects(rest.submit('lite',input),/GENERATION_DISABLED/);
 await assert.rejects(rest.submit('lite',input,{...options,maxUsd:0.5}),/BUDGET_BLOCKED/);
 assert.equal(calls.length,0);
 assert.equal((await rest.submit('lite',input,options)).request_id,id);
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://queue.fal.run/alibaba/wan-3.0-prime/reference-to-video');
 assert.equal(calls[0].options.headers.Authorization,'Key key');
 assert.equal(JSON.parse(calls[0].options.body).duration,5);
});
test('COMPLETED is only success after authenticated result; model failures remain failures',async()=>{
 for(const status of ['IN_QUEUE','IN_PROGRESS']){
  const rest=createFalWanRest({credentials:'key',env,fetchImpl:async()=>ok({request_id:id,status})});
  assert.equal((await rest.status(id)).status,status==='IN_QUEUE'?'queued':'in_progress');
 }
 const calls=[];const rest=createFalWanRest({credentials:'key',env,fetchImpl:async url=>{calls.push(url);return ok(calls.length===1?{request_id:id,status:'COMPLETED'}:{video:{url:'https://v3b.fal.media/output.mp4'}})}});
 assert.equal((await rest.status(id)).status,'completed');assert.equal(calls.length,2);
 const failed=createFalWanRest({credentials:'key',env,fetchImpl:async()=>ok({request_id:id,status:'COMPLETED',error:'moderated'})});
 assert.equal((await failed.status(id)).status,'failed');
});
test('fal approval and signing are separate from Higgsfield; a provider change invalidates the draft',()=>{
 const config={...env,VERCEL_ENV:'preview',K4K_ENABLE_TEST_GENERATION:'true',K4K_GENERATION_TEST_USERS:id};
 assert.equal(generationUserAllowed(id,config,'fal'),true);assert.equal(generationUserAllowed(id,config,'higgsfield'),false);
 assert.equal(generationSigningSecret(config,'fal'),'secret');
 assert.equal(generationProviderName({}),'fal');assert.throws(()=>generationProviderName({provider:'other'}));assert.throws(()=>generationProviderName({provider:'higgsfield'}),/LEGACY_PROVIDER_RETIRED/);assert.throws(()=>generationSigningSecret(config,'higgsfield'),/UNSUPPORTED_PROVIDER/);
 assert.notEqual(draftFingerprint({id,provider:'fal'},'720p'),draftFingerprint({id,provider:'higgsfield'},'720p'));
});
test('customer fal submission reserves once, passes trusted duration, and records provider request',async()=>{
 const config={...env,VERCEL_ENV:'preview',K4K_ENABLE_TEST_GENERATION:'true',K4K_GENERATION_TEST_USERS:id,K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_PROVIDER_USD_PER_CREDIT:'0.1',K4K_GENERATION_MAX_USD:'5'};
 const job={id,user_id:id,status:'draft',provider:'fal',model:'lite'};
 const token=quoteSigner('secret').issue({provider:'fal',userId:id,jobId:id,resolution:'720p',usd:0.7,credits:7,fingerprint:draftFingerprint(job,'720p')});
 const calls=[];
 const database={rpc:async()=>{calls.push('reserve');return {data:{newly_reserved:true}}},from:()=>({update:()=>({eq:()=>({eq:()=>({eq:()=>({is:()=>({select:()=>({maybeSingle:async()=>({data:{id,user_id:id,provider_job_id:id,status:'processing'}})})})})})})})})};
 const provider={estimate:async()=>({usd:0.7}),submit:async(tier,body,options)=>{calls.push('submit');assert.equal(options.sourceSeconds,5);return {request_id:id}}};
 const submit=createGenerationSubmitService({database,provider,env:config,prepare:async()=>({input,sourceSeconds:5})});
 assert.equal((await submit({userId:id,job,quoteToken:token,requestKey:id})).status,'processing');
 assert.deepEqual(calls,['reserve','submit']);
 const invalid=quoteSigner('secret').issue({provider:'higgsfield',userId:id,jobId:id,resolution:'720p',usd:0.7,credits:7,fingerprint:draftFingerprint(job,'720p')});
 await assert.rejects(submit({userId:id,job,quoteToken:invalid,requestKey:id}),/QUOTE_CHANGED/);
});
