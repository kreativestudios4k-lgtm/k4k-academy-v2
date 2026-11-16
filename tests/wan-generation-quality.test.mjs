import test from 'node:test';import assert from 'node:assert/strict';import {wanQualitySettings,referenceRejectionHoldCount,generationRejectionHold} from '../lib/server/wan-generation-quality.mjs';import {prepareFalMotionInput} from '../lib/server/fal-wan.mjs';
const input={video_url:'https://media.example/reference.mp4',image_urls:['https://media.example/person.jpg'],resolution:'720p',prompt:'Recreate the activity with the referenced adult performer.'};
test('Wan thinking is explicitly preview-only, prompt expansion and safety stay enabled',()=>{
 const preview=wanQualitySettings({VERCEL_ENV:'preview',K4K_WAN_QUALITY_PILOT:'true'});assert.equal(preview.enable_thinking,true);assert.equal(preview.enable_safety_checker,true);assert.equal(preview.enable_prompt_expansion,true);
 const prod=wanQualitySettings({VERCEL_ENV:'production',K4K_WAN_QUALITY_PILOT:'true'});assert.equal(prod.enable_thinking,false);assert.equal(prod.enable_safety_checker,true);
 const payload=prepareFalMotionInput('lite',input,{sourceSeconds:5,env:{VERCEL_ENV:'preview',K4K_WAN_QUALITY_PILOT:'true'}});assert.equal(payload.enable_thinking,true);assert.equal(payload.enable_safety_checker,true);assert.equal(payload.reference_video_urls.length,1);
});
test('two confirmed policy failures stop the same user/template before credits, not other templates',async()=>{
 const rows=[{status:'failed',error_message:'CONTENT_POLICY_BLOCKED'},{status:'failed',error_message:'CONTENT_POLICY_BLOCKED'}];const calls=[];
 const db={from:()=>({select:()=>({eq:()=>({eq:()=>({gte:()=>({eq:()=>({eq:()=>({limit:async()=>{calls.push('read');return {data:rows,error:null}}})})})})})})})};
 const job={user_id:'user',template_id:'custom-scene'};assert.equal(referenceRejectionHoldCount(rows),2);
 assert.equal(await generationRejectionHold(db,job),'REPEATED_PROVIDER_REJECTION');assert.deepEqual(calls,['read']);
 assert.equal(await generationRejectionHold(db,{...job,template_id:'creator-upload-preview'}),null);
 assert.equal(referenceRejectionHoldCount([{status:'completed',error_message:null}]),0);
});
