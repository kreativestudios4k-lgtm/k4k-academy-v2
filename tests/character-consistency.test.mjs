import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCharacterDirection} from '../lib/character-direction.mjs';
import {buildCharacterConsistencyPrompt,CHARACTER_CONSISTENCY_VERSION} from '../lib/server/character-consistency.mjs';
import {prepareFalMotionInput,createFalWanRest} from '../lib/server/fal-wan.mjs';
import {draftFingerprint} from '../lib/server/generation-quote.mjs';
const refs=['https://private.example/1.jpg','https://private.example/2.jpg','https://private.example/3.jpg'];
const input={video_url:'https://private.example/scene.mp4',image_urls:refs,resolution:'720p',prompt:''};
test('blank prompt automatically gets a source/identity/wardrobe lock for every reference',()=>{
 const result=prepareFalMotionInput('lite',input,{sourceSeconds:11.04});
 assert.equal(result.duration,12);
 assert.deepEqual(result.reference_image_urls,refs);
 assert.deepEqual(result.reference_video_urls,[input.video_url]);
 assert.match(result.prompt,/Video 1 drives motion/);
 for(let n=1;n<=3;n++)assert.match(result.prompt,new RegExp('Image '+n+': reference for replacement identity, character '+n));
 assert.match(result.prompt,/Never swap identities/);
 assert.match(result.prompt,/No clothing transfer from Video 1/);
 assert.match(result.prompt,/Never duplicate/);
 assert.match(result.prompt,/Leave all unassigned people unchanged/);
 assert.match(result.prompt,/legitimately enter, exit, or be offscreen/);
 assert.equal(result.enable_safety_checker,true);
 assert.equal(result.audio,true);
 assert.equal(result.resolution,'720p');
});
test('source assignments and creative direction survive in order and cannot remove the automatic consistency layer',()=>{
 const direction=buildCharacterDirection('Keep the restaurant scene.', ['seated left','seated next to the first person','person revealed by the rightward camera pan']);
 assert.match(direction,/Image 1 replaces source person: seated left/);
 assert.match(direction,/Image 2 replaces source person: seated next to the first person/);
 assert.match(direction,/Image 3 replaces source person: person revealed by the rightward camera pan/);
 const prompt=buildCharacterConsistencyPrompt(direction,3);
 assert.ok(prompt.includes(direction));
 assert.match(prompt,/named source role takes priority/);
 assert.match(prompt,/IDENTITY LOCK/);
 assert.match(prompt,/WARDROBE LOCK/);
 assert.match(prompt,/FINAL QUALITY/);
 assert.ok(prompt.length<20000);
});
test('default order applies only where no explicit assignments exist; references are numbered by upload order',()=>{
 for(const n of [1,3,8]){
  const p=buildCharacterConsistencyPrompt('',n);
  assert.match(p,/first clear appearance/);
  assert.match(p,/screen left to right/);
  assert.match(p,new RegExp('Image '+n+': reference for replacement identity, character '+n));
  assert.ok(!p.includes('Image '+(n+1)+':'));
 }
 assert.equal(buildCharacterDirection('  keep the scene  ',['','','']), 'keep the scene');
 assert.equal(buildCharacterDirection('',[]),'');
 assert.throws(()=>buildCharacterConsistencyPrompt('',0),/INVALID_PROVIDER_INPUT/);
 assert.throws(()=>buildCharacterConsistencyPrompt('',9),/INVALID_PROVIDER_INPUT/);
 assert.throws(()=>buildCharacterDirection('a'.repeat(1200),['left']),/1200 characters/);
 assert.throws(()=>buildCharacterDirection('', ['a'.repeat(81)]),/Invalid character target/);
});
test('custom scene and wardrobe changes remain possible without dropping identity locks',()=>{
 const p=buildCharacterConsistencyPrompt('Move to a beach; Image 2 wears a white shirt.',2);
 assert.match(p,/Move to a beach; Image 2 wears a white shirt/);
 assert.match(p,/unless the user explicitly requests a wardrobe change/);
 assert.match(p,/Identity|IDENTITY LOCK/);
});
test('quote fingerprint binds reference order, user mapping and consistency compiler version',()=>{
 assert.equal(CHARACTER_CONSISTENCY_VERSION,'k4k-character-lock-v1');
 const job={id:'job',user_id:'user',provider:'fal',model:'lite',reference_paths:['a','b','c'],reference_video_path:'video',prompt:'Image 1 replaces source person: left.'};
 const a=draftFingerprint(job,'720p');
 assert.notEqual(a,draftFingerprint({...job,reference_paths:['b','a','c']},'720p'));
 assert.notEqual(a,draftFingerprint({...job,prompt:'Image 1 replaces source person: right.'},'720p'));
});
test('mocked provider dispatch contains the compiled prompt, ordered refs and unchanged cost; no real request',async()=>{
 const calls=[];
 const id='11111111-1111-4111-8111-111111111111';
 const base='https://queue.fal.run/alibaba/wan-3.0-prime/requests/'+id;
 const rest=createFalWanRest({credentials:'test-key',env:{K4K_FAL_WAN_ENABLED:'true',K4K_FAL_RATE_CARD_APPROVED:'true'},fetchImpl:async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({request_id:id,status_url:base+'/status',response_url:base})}}});
 const cost=await rest.estimate('lite',input,{sourceSeconds:11.04});
 assert.equal(cost.usd,1.68);
 assert.equal(calls.length,0);
 await rest.submit('lite',input,{enabled:true,idempotencyKey:id,maxUsd:2.1,quotedUsd:cost.usd,sourceSeconds:11.04});
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0].reference_image_urls,refs);
 assert.match(calls[0].prompt,/IDENTITY LOCK/);
 assert.match(calls[0].prompt,/WARDROBE LOCK/);
 assert.equal(calls[0].duration,12);
 assert.throws(()=>prepareFalMotionInput('lite',{...input,prompt:'Create a sexual deepfake'},{sourceSeconds:5}),/CONTENT_POLICY_BLOCKED/);
});
