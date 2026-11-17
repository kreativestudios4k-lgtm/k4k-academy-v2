import test from 'node:test';
import assert from 'node:assert/strict';
import {multimodelDraftFingerprint,prepareMultimodelQuote,verifyMultimodelQuote} from '../lib/server/multimodel-preview-quote.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const prompt='A sunrise over a quiet mountain range';
const job={id,user_id:userId,model:'kling-flash-t2v',provider:'fal',status:'draft',input:{prompt,duration:5,resolution:'720p',aspect_ratio:'9:16'}};
const env={VERCEL_ENV:'preview',K4K_MULTIMODEL_PREVIEW:'true',K4K_MULTIMODEL_RATE_CARD_VERIFIED:'true',K4K_GENERATION_MAX_USD:'2.1',K4K_GENERATION_QUOTE_SECRET:'x'.repeat(48),K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_PROVIDER_USD_PER_CREDIT:'0.1'};
const serverQuote={source:'server-verified',model:job.model,endpoint:'kling/v4/flash/text-to-video',usd:0.47};
test('creates preview-only bound quote with frozen credits and no dispatch',()=>{
 const quote=prepareMultimodelQuote({job,userId,serverQuote,env,now:1000000});
 assert.equal(quote.credits,5);
 assert.equal(quote.dispatchEnabled,false);
 const checked=verifyMultimodelQuote({job,userId,token:quote.quoteToken,env,now:1001000});
 assert.equal(checked.usd,0.47);
 assert.equal(checked.dispatchEnabled,false);
});
test('rejects public or unverified rate-card quotes',()=>{
 for(const changed of [{...env,VERCEL_ENV:'production'},{...env,K4K_MULTIMODEL_RATE_CARD_VERIFIED:'false'}]){
  assert.throws(()=>prepareMultimodelQuote({job,userId,serverQuote,env:changed}),/DISABLED|PENDING/);
 }
 assert.throws(()=>prepareMultimodelQuote({job,userId,serverQuote:{...serverQuote,source:'browser'},env}),/PROVIDER_QUOTE_REQUIRED/);
 assert.throws(()=>prepareMultimodelQuote({job,userId,serverQuote:{...serverQuote,usd:3},env}),/PROVIDER_BUDGET_BLOCKED/);
});
test('detects input mutation, ownership substitution and expired signature',()=>{
 const q=prepareMultimodelQuote({job,userId,serverQuote,env,now:1000000});
 assert.throws(()=>verifyMultimodelQuote({job:{...job,input:{...job.input,prompt:'changed'}},userId,token:q.quoteToken,env,now:1001000}),/QUOTE_CHANGED/);
 assert.throws(()=>verifyMultimodelQuote({job,userId:'33333333-3333-4333-8333-333333333333',token:q.quoteToken,env,now:1001000}),/INVALID_MULTIMODEL_DRAFT/);
 assert.throws(()=>verifyMultimodelQuote({job,userId,token:q.quoteToken,env,now:1400000}),/QUOTE_EXPIRED/);
});
test('rejects unwanted draft fields and unsupported legacy input shapes',()=>{
 assert.throws(()=>multimodelDraftFingerprint({...job,credits_reserved:0},userId),/INVALID_MULTIMODEL_DRAFT/);
 assert.throws(()=>multimodelDraftFingerprint({...job,model:'lite'},userId),/MODEL_NOT_CONFIGURED/);
 assert.throws(()=>multimodelDraftFingerprint({...job,input:{...job.input,user_id:userId}},userId),/INVALID_PROVIDER_INPUT/);
});
