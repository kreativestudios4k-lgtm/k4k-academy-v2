import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiggsfieldRest} from '../lib/server/higgsfield-rest.mjs';
import {quoteSigner,draftFingerprint,generationCredits} from '../lib/server/generation-quote.mjs';
import {createGenerationSubmitService} from '../lib/server/generation-submit-service.mjs';
const user='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',key='33333333-3333-4333-8333-333333333333';
const input={video_url:'https://storage.example/video.mp4',image_urls:['https://storage.example/image.jpg'],resolution:'720p',prompt:''};
const env={K4K_GENERATION_TEST_USERS:user,VERCEL_ENV:'preview',HF_CREDENTIALS:'opaque_copied_key',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_PROVIDER_USD_PER_CREDIT:'0.1',K4K_GENERATION_MAX_USD:'5',K4K_ENABLE_TEST_GENERATION:'true',HIGGSFIELD_GENJUTSU_ENABLED:'true'};
const job={id:jobId,user_id:user,status:'draft',model:'pro',reference_paths:['owned.jpg'],reference_video_path:'owned.mp4',prompt:''};
function setup({newlyReserved=true,providerError=false,usd=1.2}={}){
 const calls=[];
 const database={rpc:async(name,args)=>{calls.push({name,args});return {data:{newly_reserved:newlyReserved,status:'reserved'}}},from:()=>({update:()=>({eq:()=>({eq:()=>({eq:()=>({is:()=>({select:()=>({maybeSingle:async()=>{calls.push({name:'record'});return {data:{id:jobId,user_id:user,provider_job_id:'provider_job',status:'processing'}}}})})})})})})})};
 const provider={estimate:async()=>{calls.push({name:'estimate'});return {usd}},submit:async(tier,payload,options)=>{calls.push({name:'submit',options});if(providerError){const error=Error('timeout');if(typeof providerError==='number')error.httpStatus=providerError;throw error;}return {request_id:'provider_job'}}};
 const token=quoteSigner(env.HF_CREDENTIALS).issue({userId:user,jobId,resolution:'720p',usd:1.2,credits:12,fingerprint:draftFingerprint(job,'720p')});
 const run=createGenerationSubmitService({database,provider,prepare:async()=>input,env});
 return {calls,run,args:{userId:user,job,quoteToken:token,requestKey:key}};
}
test('estimate calls only the documented non-generating endpoint with copied-key auth',async()=>{
 const calls=[];const rest=createHiggsfieldRest({credentials:'copied_key',fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({usd:'1.25'})}}});
 assert.deepEqual(await rest.estimate('pro',input),{usd:1.25});
 assert.equal(calls[0].url,'https://api.higgsfield.ai/estimate/higgsfield/genjutsu/motion-transfer/v1.0');
 assert.equal(calls[0].options.headers.Authorization,'Key copied_key');
 assert.equal(calls[0].options.redirect,'error');
});
test('provider estimate rejects errors and invalid quotes without reading raw error bodies',async()=>{
 for(const status of [401,403,404,500]){
  const rest=createHiggsfieldRest({credentials:'key',fetchImpl:async()=>({ok:false,status,json:()=>{throw Error('must not read')}})});
  await assert.rejects(rest.estimate('pro',input));
 }
 for(const usd of [null,'',0,-1,'NaN',Infinity]){
  const rest=createHiggsfieldRest({credentials:'key',fetchImpl:async()=>({ok:true,json:async()=>({usd})})});
  await assert.rejects(rest.estimate('pro',input),/PROVIDER_QUOTE_INVALID/);
 }
});
test('billable submission remains disabled and capped before network access',async()=>{
 let calls=0;const rest=createHiggsfieldRest({credentials:'key',fetchImpl:async()=>{calls++}});
 await assert.rejects(rest.submit('pro',input),/GENERATION_DISABLED/);
 await assert.rejects(rest.submit('pro',input,{enabled:true,idempotencyKey:jobId,maxUsd:1,quotedUsd:2}),/PROVIDER_BUDGET_BLOCKED/);
 assert.equal(calls,0);
});
test('signed quotes reject expiry, tampering and key rotation',()=>{
 const signer=quoteSigner('secret'),token=signer.issue({usd:1},1000);
 assert.equal(signer.verify(token,1001).usd,1);
 assert.throws(()=>signer.verify(token,301000),/QUOTE_EXPIRED/);
 assert.throws(()=>quoteSigner('rotated').verify(token,1001),/QUOTE_INVALID/);
 assert.throws(()=>signer.verify('x'+token,1001),/QUOTE_INVALID/);
});
test('credit pricing requires explicit approval and a configured conversion',()=>{
 assert.throws(()=>generationCredits(1,{}),/CREDIT_PRICING_NOT_APPROVED/);
 assert.throws(()=>generationCredits(1,{K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true'}),/CREDIT_PRICING_NOT_CONFIGURED/);
 assert.equal(generationCredits(1.21,env),13);
 assert.equal(generationCredits(1.2,env),12);
});
test('submission verifies quote then atomically reserves before one provider call and recording',async()=>{
 const {run,args,calls}=setup();const result=await run(args);
 assert.equal(result.status,'processing');assert.equal(result.creditsReserved,12);
 assert.deepEqual(calls.map(c=>c.name),['estimate','k4k_generation_reserve_draft','submit','record']);
 assert.equal(calls[2].options.idempotencyKey,jobId);
});
test('duplicate reservation cannot trigger another paid submission',async()=>{
 const {run,args,calls}=setup({newlyReserved:false});assert.equal((await run(args)).status,'already_reserved');
 assert.deepEqual(calls.map(c=>c.name),['estimate','k4k_generation_reserve_draft']);
});
test('changed price and changed draft fail before reservation or submission',async()=>{
 const first=setup({usd:1.3});await assert.rejects(first.run(first.args),/QUOTE_CHANGED/);
 assert.deepEqual(first.calls.map(c=>c.name),['estimate']);
 const second=setup();await assert.rejects(second.run({...second.args,job:{...job,prompt:'changed'}}),/QUOTE_CHANGED/);assert.equal(second.calls.length,0);
});
test('wrong owner and non-draft jobs never reserve credits',async()=>{
 const {run,args,calls}=setup();await assert.rejects(run({...args,userId:key}),/INVALID_JOB/);
 await assert.rejects(run({...args,job:{...job,status:'processing'}}),/JOB_NOT_DRAFT/);assert.equal(calls.length,0);
});
test('ambiguous provider submission preserves reservation without a refund or retry',async()=>{
 const {run,args,calls}=setup({providerError:true});await assert.rejects(run(args),/PROVIDER_SUBMISSION_UNCERTAIN/);
 assert.deepEqual(calls.map(c=>c.name),['estimate','k4k_generation_reserve_draft','submit']);
});

test('definitive synchronous rejection refunds through the atomic ledger',async()=>{
 const {run,args,calls}=setup({providerError:401});const result=await run(args);
 assert.equal(result.creditsRefunded,true);assert.equal(result.status,'failed');
 assert.deepEqual(calls.map(c=>c.name),['estimate','k4k_generation_reserve_draft','submit','k4k_generation_finish']);
});
