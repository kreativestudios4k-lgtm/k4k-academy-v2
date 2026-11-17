import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareHiggsfieldCustomerQuote,verifyHiggsfieldCustomerQuote} from '../lib/server/higgsfield-customer-quote.mjs';
const userId='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const host='https://d2ol7oe51mr4n9.cloudfront.net/user_x/';
const job={id,user_id:userId,status:'draft',provider:'higgsfield',model:'genjutsu-motion',media_kind:'video',
 input:{video_url:host+'source.mp4',image_urls:[host+'photo.jpg'],resolution:'480p',prompt:'Swap foreground person only'}};
const verifiedMedia={verified:true,userId,jobId:id,contentType:'video/mp4',seconds:4.766667};
const env={VERCEL_ENV:'preview',K4K_HIGGSFIELD_CUSTOMER_QUOTE_PREVIEW:'true',
 K4K_HIGGSFIELD_RATE_CARD_APPROVED:'true',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',
 K4K_PROVIDER_USD_PER_CREDIT:'0.10',K4K_GENERATION_MAX_USD:'2',
 K4K_GENERATION_QUOTE_SECRET:'a-long-secret-that-is-only-for-tests-and-not-production'};
test('server-verified 4.77s at 480p bills 5 seconds $0.77 and 8 credits',()=>{
 const q=prepareHiggsfieldCustomerQuote({job,userId,verifiedMedia,env});
 assert.equal(q.usd,0.77);
 assert.equal(q.quoteMicros,770000);
 assert.equal(q.duration,5);
 assert.equal(q.credits,8);
 assert.equal(q.dispatchEnabled,false);
 const check=verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia,token:q.quoteToken,env});
 assert.equal(check.credits,8);
 assert.equal(check.fingerprint.length,64);
 assert.equal(check.dispatchEnabled,false);
});
test('modified prompt, image, owner, timing and price invalidate signed quote',()=>{
 const q=prepareHiggsfieldCustomerQuote({job,userId,verifiedMedia,env});
 for(const changed of [
  {...job,input:{...job.input,prompt:'different'}},
  {...job,input:{...job.input,image_urls:[host+'other.jpg']}},
  {...job,user_id:'44444444-4444-4444-8444-444444444444'},
  {...job,input:{...job.input,resolution:'720p'}}
 ])assert.throws(()=>verifyHiggsfieldCustomerQuote({job:changed,userId,verifiedMedia,token:q.quoteToken,env}),/QUOTE_CHANGED|INVALID_HIGGSFIELD_DRAFT|PROVIDER_BUDGET_BLOCKED/);
 assert.throws(()=>verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia:{...verifiedMedia,seconds:4.1},token:q.quoteToken,env}),/QUOTE_CHANGED/);
 assert.throws(()=>verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia,token:q.quoteToken+'corrupt',env}),/QUOTE_INVALID/);
});
test('unverified source or arbitrary reference URL blocks quote issuance',()=>{
 for(const media of [{...verifiedMedia,verified:false},{...verifiedMedia,seconds:31},{...verifiedMedia,userId:'44444444-4444-4444-8444-444444444444'}])
  assert.throws(()=>prepareHiggsfieldCustomerQuote({job,userId,verifiedMedia:media,env}),/REFERENCE_VIDEO_VERIFICATION_REQUIRED/);
 for(const video_url of ['https://127.0.0.1/private.mp4','http://localhost:3000/x.mp4','https://attacker.example.com/x.mp4',host+'source.mp4?open=1'])
  assert.throws(()=>prepareHiggsfieldCustomerQuote({job:{...job,input:{...job.input,video_url}},userId,verifiedMedia,env}),/UNTRUSTED_REFERENCE_URL|INVALID_PROVIDER_INPUT/);
});
test('rate-card approval, preview flag, price config and cap all fail closed',()=>{
 for(const patch of [{VERCEL_ENV:'production'},{K4K_HIGGSFIELD_CUSTOMER_QUOTE_PREVIEW:'false'},{K4K_HIGGSFIELD_RATE_CARD_APPROVED:'false'},{K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'false'},{K4K_GENERATION_MAX_USD:'0.5'}])
  assert.throws(()=>prepareHiggsfieldCustomerQuote({job,userId,verifiedMedia,env:{...env,...patch}}));
});
test('quote expires after five minutes; future default dispatch remains disabled',()=>{
 const now=1770000000000;
 const q=prepareHiggsfieldCustomerQuote({job,userId,verifiedMedia,env,now});
 assert.throws(()=>verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia,token:q.quoteToken,env,now:now+300001}),/QUOTE_EXPIRED/);
});
test('new input CDN passes quote preparation and verification with identical credit terms',()=>{
 const current='https://d3snorpfx4xhv8.cloudfront.net/user_x/';
 const updated={...job,input:{...job.input,video_url:current+'source.mp4',image_urls:[current+'photo.jpg']}};
 const q=prepareHiggsfieldCustomerQuote({job:updated,userId,verifiedMedia,env});
 assert.equal(q.credits,8);
 assert.equal(verifyHiggsfieldCustomerQuote({job:updated,userId,verifiedMedia,token:q.quoteToken,env}).credits,8);
 assert.throws(()=>prepareHiggsfieldCustomerQuote({job:updated,userId,verifiedMedia,env:{...env,K4K_HIGGSFIELD_APPROVED_MEDIA_HOSTS:'d2ol7oe51mr4n9.cloudfront.net'}}),/UNTRUSTED_REFERENCE_URL/);
});

test('explicit 720p approval allows a 13-second video at 45 credits but not 14 seconds',()=>{
 const approved={...env,K4K_GENERATION_MAX_USD:'4.5',K4K_MOTION_720P_APPROVED:'true'};
 const video13={...verifiedMedia,seconds:13};
 const job720={...job,input:{...job.input,resolution:'720p'}};
 const q=prepareHiggsfieldCustomerQuote({job:job720,userId,verifiedMedia:video13,env:approved});
 assert.equal(q.usd,4.4798);
 assert.equal(q.duration,13);
 assert.equal(q.credits,45);
 assert.equal(verifyHiggsfieldCustomerQuote({job:job720,userId,verifiedMedia:video13,token:q.quoteToken,env:approved}).credits,45);
 assert.throws(()=>prepareHiggsfieldCustomerQuote({job:job720,userId,verifiedMedia:{...video13,seconds:14},env:approved}),/PROVIDER_BUDGET_BLOCKED/);
 assert.throws(()=>prepareHiggsfieldCustomerQuote({job:job720,userId,verifiedMedia:video13,env:{...approved,K4K_MOTION_720P_APPROVED:'false'}}),/PROVIDER_BUDGET_BLOCKED/);
 const job1080={...job,input:{...job.input,resolution:'1080p'}};
 assert.throws(()=>prepareHiggsfieldCustomerQuote({job:job1080,userId,verifiedMedia:{...video13,seconds:5},env:approved}),/PROVIDER_BUDGET_BLOCKED/);
 const job480={...job,input:{...job.input,resolution:'480p'}};
 const at14=prepareHiggsfieldCustomerQuote({job:job480,userId,verifiedMedia:{...video13,seconds:14},env:approved});
 assert.equal(at14.credits,22);
 assert.throws(()=>prepareHiggsfieldCustomerQuote({job:job480,userId,verifiedMedia:{...video13,seconds:30},env:approved}),/PROVIDER_BUDGET_BLOCKED/);
 const at30=prepareHiggsfieldCustomerQuote({job:job480,userId,verifiedMedia:{...video13,seconds:30},env:{...approved,K4K_GENERATION_MAX_USD:'5'}});
 assert.equal(at30.credits,47);
});
