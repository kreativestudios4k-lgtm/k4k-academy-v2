import test from 'node:test';
import assert from 'node:assert/strict';
import {GENJUTSU_MODEL_ID,GENJUTSU_RATE_USD,genjutsuInput,genjutsuEstimate,createGenjutsuProvider} from '../lib/server/higgsfield-genjutsu-motion.mjs';
const v='https://assets.example.com/input.mp4',images=['https://assets.example.com/character1.jpg','https://assets.example.com/character2.png'];
test('official endpoint and published second-based rates are preserved',()=>{
 assert.equal(GENJUTSU_MODEL_ID,'higgsfield/genjutsu/motion-transfer/v1.0');
 assert.deepEqual(GENJUTSU_RATE_USD,{'480p':0.318,'720p':0.681,'1080p':1.632});
 assert.equal(genjutsuEstimate({sourceSeconds:10,resolution:'720p'}).usd,6.81);
 assert.equal(genjutsuEstimate({sourceSeconds:14.2,resolution:'720p'}).usd,10.215);
 assert.equal(genjutsuEstimate({sourceSeconds:4.01,resolution:'480p'}).duration,5);
 assert.equal(genjutsuEstimate({sourceSeconds:4,resolution:'720p'}).usd,2.724);
 assert.equal(genjutsuEstimate({sourceSeconds:4,resolution:'1080p'}).usd,6.528);
 for(const seconds of [0,3.99,30.1,NaN])assert.throws(()=>genjutsuEstimate({sourceSeconds:seconds}),/REFERENCE_DURATION_OUT_OF_RANGE/);
});
test('model schema accepts video, 1–8 images, optional prompt and valid resolutions',()=>{
 assert.deepEqual(genjutsuInput({video_url:v,image_urls:images}),{video_url:v,image_urls:images,prompt:'',resolution:'720p'});
 for(const bad of [{video_url:'http://insecure',image_urls:images},{video_url:v,image_urls:[]},{video_url:v,image_urls:Array(9).fill(images[0])},{video_url:v,image_urls:images,resolution:'4k'},{video_url:v,image_urls:images,prompt:'a'.repeat(10001)},{video_url:v,image_urls:images,enable_safety_checker:false}])assert.throws(()=>genjutsuInput(bad),/INVALID_PROVIDER_INPUT/);
});
test('no paid request without preview pilot, approved rate and budget, independent of model availability',async()=>{
 let count=0;
 const env={VERCEL_ENV:'preview',K4K_HIGGSFIELD_GENERATION_PILOT_ENABLED:'true',HF_API_KEY:'complete-opaque-key-123',K4K_HIGGSFIELD_RATE_CARD_APPROVED:'true'};
 const make=environment=>createGenjutsuProvider({env:environment,fetchImpl:async()=>{count++;return {ok:true,json:async()=>({request_id:'generated_123',status_url:'https://api.higgsfield.ai/requests/generated_123/status'})}}});
 const input={video_url:v,image_urls:images,resolution:'720p'};
 const sdkEnv={...env,HF_API_KEY:undefined,HF_CREDENTIALS:'sample-id:sample-secret'};
 await assert.rejects(make(env).submit('pro',input,{enabled:false,sourceSeconds:4,maxUsd:5,quotedUsd:2.724}),/HIGGSFIELD_GENERATION_DISABLED/);
 await assert.rejects(make({...env,VERCEL_ENV:'production'}).submit('pro',input,{enabled:true,sourceSeconds:4,maxUsd:5,quotedUsd:2.724}),/HIGGSFIELD_GENERATION_DISABLED/);
 await assert.rejects(make(env).submit('pro',input,{enabled:true,sourceSeconds:10,maxUsd:5,quotedUsd:6.81}),/PROVIDER_BUDGET_BLOCKED/);
 await assert.rejects(make({...env,K4K_HIGGSFIELD_RATE_CARD_APPROVED:'false'}).submit('pro',input,{enabled:true,sourceSeconds:4,maxUsd:5,quotedUsd:2.724}),/PROVIDER_RATE_CARD_NOT_APPROVED/);
 assert.equal(count,0);
 assert.equal((await make(env).submit('pro',input,{enabled:true,sourceSeconds:4,maxUsd:5,quotedUsd:2.724})).request_id,'generated_123');
 assert.equal(count,1);
 assert.equal((await make(sdkEnv).submit('pro',input,{enabled:true,sourceSeconds:4,maxUsd:5,quotedUsd:2.724})).request_id,'generated_123');
 assert.equal(count,2);
 await assert.rejects(make(env).submit('pro',input,{enabled:true,sourceSeconds:4,maxUsd:5,quotedUsd:1.3784}),/PROVIDER_BUDGET_BLOCKED/);
 assert.equal(count,2);
});
