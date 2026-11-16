import test from 'node:test';import assert from 'node:assert/strict';import {multimodelLiveAllowed,multimodelUserAllowed,multimodelQuote,safeFalMediaUrl,signMultimodelQuote,verifyMultimodelQuote} from '../lib/server/multimodel-live-service.mjs';
const env={VERCEL_ENV:'production',K4K_MULTIMODEL_LIVE_ENABLED:'true',K4K_WAITLIST_ONLY:'false',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',FAL_KEY:'fake',SUPABASE_SERVICE_ROLE_KEY:'fake',K4K_GENERATION_MAX_USD:'2.1',K4K_PROVIDER_USD_PER_CREDIT:'0.1'};
const id='a16da372-2b15-4cfa-b641-6b2344a80caa',uid='bf8dd9c3-a80d-4bb3-8d5e-b7a0b6c17b28';
test('requires explicit production opt in and unchanged credit price approval',()=>{
 assert.equal(multimodelLiveAllowed(env),true);assert.equal(multimodelLiveAllowed({...env,K4K_MULTIMODEL_LIVE_ENABLED:'false'}),false);
 assert.equal(multimodelLiveAllowed({...env,VERCEL_ENV:'preview'}),false);assert.equal(multimodelUserAllowed(uid,{...env,K4K_MULTIMODEL_PILOT_ONLY:'true',K4K_OWNER_LIVE_PILOT_USER_ID:uid}),true);assert.equal(multimodelUserAllowed(id,{...env,K4K_MULTIMODEL_PILOT_ONLY:'true',K4K_OWNER_LIVE_PILOT_USER_ID:uid}),false);
});
test('limits live models and affordable verified provider pricing',()=>{
 const q=multimodelQuote({modelId:'kling-flash-t2v',params:{prompt:'An original short film',duration:10,resolution:'720p',aspect_ratio:'9:16'},env});
 assert.equal(q.credits,10);assert.equal(q.quoteMicros,940000);
 const i=multimodelQuote({modelId:'nano-banana-21-t2i',params:{prompt:'An original landscape',resolution:'1K',aspect_ratio:'1:1'},env});
 assert.equal(i.credits,10);
 assert.throws(()=>multimodelQuote({modelId:'seedance-25-t2v',params:{prompt:'abc',duration:5,resolution:'720p',aspect_ratio:'9:16'},env}),/MODEL_DISABLED/);
 assert.throws(()=>multimodelQuote({modelId:'flux3-t2i',params:{prompt:'An image',resolution:'4k',aspect_ratio:'1:1'},env}),/MODEL_QUALITY_NOT_ENABLED/);
});
test('quote token binds owner, immutable parameters and charged credit amount',()=>{
 const job={id,user_id:uid,model_id:'kling-flash-t2v',parameters:{prompt:'scene'},quoted_credits:10,quote_micros:940000};
 const token=signMultimodelQuote(job,env);assert.ok(verifyMultimodelQuote(job,token,env));
 assert.throws(()=>verifyMultimodelQuote({...job,quoted_credits:11},token,env),/QUOTE_CHANGED/);
 assert.throws(()=>verifyMultimodelQuote({...job,user_id:id},token,env),/QUOTE_CHANGED/);
});
test('untrusted provider media links cannot be fetched',()=>{
 for(const u of ['https://evil.example/abc.mp4','http://v3.fal.media/x','https://v3.fal.media.evil.com/y','https://user@v3.fal.media/x'])assert.equal(safeFalMediaUrl(u),false);
 assert.equal(safeFalMediaUrl('https://v3b.fal.media/files/funny.png'),true);
});
