import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationSubmitService} from '../lib/server/generation-submit-service.mjs';
import {draftFingerprint,quoteSigner} from '../lib/server/generation-quote.mjs';
const user='25d0e48c-5dd5-4d84-a3b9-0e5bd6227a65';
const id='d7411f09-a330-49b4-a953-2838b75eb99a';
const key='7c92fe60-10eb-4185-9b2d-36a8f23ab3d3';
const env={VERCEL_ENV:'preview',K4K_ENABLE_TEST_GENERATION:'true',K4K_FAL_WAN_ENABLED:'true',K4K_GENERATION_TEST_USERS:user,K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_PROVIDER_USD_PER_CREDIT:'0.01',K4K_GENERATION_BUDGET_GUARD_ENABLED:'true',K4K_PROVIDER_DAILY_BUDGET_USD:'15',K4K_PROVIDER_TOTAL_BUDGET_USD:'200',K4K_MAX_ACTIVE_JOBS_PER_USER:'1',K4K_GENERATION_MAX_USD:'5',K4K_GENERATION_QUOTE_SECRET:'test-only'};
const job={id,user_id:user,provider:'fal',model:'lite',status:'draft',reference_paths:[user+'/'+id+'.jpg'],reference_video_path:user+'/'+id+'.mp4',prompt:''};
const quoteToken=()=>quoteSigner('test-only').issue({provider:'fal',userId:user,jobId:id,resolution:'720p',fingerprint:draftFingerprint(job,'720p'),usd:0.3,credits:30});
function setup({reject=null}={}){
 let calls=0,reservations=0,refunds=0,balance=100;
 const database={rpc:async(name)=>{
  if(name==='k4k_generation_reserve_budgeted'){
   if(reservations)return {data:{newly_reserved:false,status:'reserved'}};
   reservations++;balance-=30;return {data:{newly_reserved:true,status:'reserved'}};
  }
  if(name==='k4k_generation_finish'){refunds++;balance+=30;return {data:{status:'refunded'}}}
  throw Error('unexpected RPC');
 },from(){const chain={update:()=>chain,eq:()=>chain,is:()=>chain,select:()=>chain,maybeSingle:async()=>({data:{id,user_id:user,provider_job_id:'provider-1',status:'processing'}})};return chain}};
 const provider={estimate:async()=>({usd:0.3}),submit:async()=>{calls++;if(reject)throw reject;return {request_id:'provider-1'}}};
 const submit=createGenerationSubmitService({database,provider,prepare:async()=>({input:{},sourceSeconds:5}),env});
 return {submit,stats:()=>({calls,reservations,refunds,balance})};
}
test('concurrent identical requests dispatch one provider request and reserve once',async()=>{
 const s=setup();const args={userId:user,job,quoteToken:quoteToken(),requestKey:key};
 const results=await Promise.all([s.submit(args),s.submit(args)]);
 assert.equal(s.stats().calls,1);assert.equal(s.stats().balance,70);assert.ok(results.some(x=>x.status==='already_reserved'));
});
test('confirmed provider rejection releases all reserved credits exactly once',async()=>{
 const s=setup({reject:Object.assign(Error('rejected'),{httpStatus:422})});
 const args={userId:user,job,quoteToken:quoteToken(),requestKey:key};
 const result=await s.submit(args);
 assert.equal(result.creditsRefunded,true);assert.equal(s.stats().balance,100);assert.equal(s.stats().refunds,1);
 const replay=await s.submit({...args,job:{...job,status:'failed'},quoteToken:'expired'});
 assert.equal(replay.replayed,true);assert.equal(s.stats().calls,1);assert.equal(s.stats().refunds,1);
});
test('timeout retains credits, never retries or refunds without confirmation',async()=>{
 const s=setup({reject:Error('timeout')});
 const args={userId:user,job,quoteToken:quoteToken(),requestKey:key};
 await assert.rejects(s.submit(args),/PROVIDER_SUBMISSION_UNCERTAIN/);
 const replay=await s.submit({...args,job:{...job,status:'queued',credits_reserved:30},quoteToken:'expired'});
 assert.equal(replay.reconciliationRequired,true);assert.equal(s.stats().calls,1);assert.equal(s.stats().refunds,0);assert.equal(s.stats().balance,70);
});
