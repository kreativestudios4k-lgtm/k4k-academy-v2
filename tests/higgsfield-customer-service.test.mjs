import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiggsfieldCustomerService} from '../lib/server/higgsfield-customer-service.mjs';
import {createHiggsfieldCustomerHttp} from '../lib/server/higgsfield-customer-http.mjs';
const owner='0ef1af08-4df8-4858-967b-eac1a16f9f2c',id='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const env={VERCEL_ENV:'preview',K4K_HIGGSFIELD_CUSTOMER_FLOW_PREVIEW:'true',K4K_HIGGSFIELD_CUSTOMER_QUOTE_PREVIEW:'true',K4K_HIGGSFIELD_CUSTOMER_DISPATCH_PREVIEW:'true',K4K_HIGGSFIELD_GENERATION_PILOT_ENABLED:'true',K4K_HIGGSFIELD_RATE_CARD_APPROVED:'true',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_PROVIDER_USD_PER_CREDIT:'0.1',K4K_GENERATION_MAX_USD:'2.1',K4K_GENERATION_QUOTE_SECRET:'x'.repeat(48),K4K_PROVIDER_DAILY_BUDGET_USD:'20',K4K_PROVIDER_TOTAL_BUDGET_USD:'200',K4K_MAX_ACTIVE_JOBS_PER_USER:'1'};
const input={jobId:id,videoPath:owner+'/'+id+'.mp4',referencePaths:[owner+'/'+id+'.png'],resolution:'480p',prompt:'Replace central character'};
function fixture(overrides={}){
 const jobs=new Map(),events=[];let claimed=false,credits=40;
 const store={getOwnedJob:async(u,j)=>jobs.get(j)?.user_id===u?jobs.get(j):null,insert:async j=>{events.push('save');jobs.set(j.id,{...j,created_at:new Date().toISOString()});},listOwned:async u=>[...jobs.values()].filter(j=>j.user_id===u)};
 const transfer=async({userId,jobId,beforeTransfer})=>{await beforeTransfer(4.77);events.push('transfer');return {input:{video_url:'https://d2ol7oe51mr4n9.cloudfront.net/input.mp4',image_urls:['https://d2ol7oe51mr4n9.cloudfront.net/ref.png']},verifiedMedia:{userId,jobId,verified:true,contentType:'video/mp4',seconds:4.77}};};
 const ledger={reserve:async q=>{events.push('reserve');if(jobs.get(q.jobId).status==='draft'){credits-=q.credits;jobs.get(q.jobId).status='queued';}},finish:async q=>{events.push('finish');jobs.get(q.jobId).status='completed';return {status:'settled'};}};
 const database={rpc:async(name,args)=>{
  if(name==='k4k_multimodel_claim_dispatch'){events.push('claim');const won=!claimed;claimed=true;return {data:{job_id:id,claimed:won,state:'dispatch_uncertain'}};}
  if(name==='k4k_multimodel_record_provider_request'){events.push('record');jobs.get(id).status='processing';jobs.get(id).provider_request_id=args.p_provider_request;return {data:{job_id:id,status:'processing'}};}
  if(name==='k4k_multimodel_refund_confirmed_provider_failure'){events.push('refund');if(jobs.get(id).status!=='failed')credits+=jobs.get(id).credits_quoted;jobs.get(id).status='failed';return {data:{job_id:id,status:'refunded',newly_finished:true}};}
  throw Error('Unexpected RPC');
 }};
 const provider={ready:true,submit:async()=>{events.push('submit');return {request_id:'provider_1'};},status:async()=>({request_id:'provider_1',status:'failed'})};
 const service=createHiggsfieldCustomerService({store,transfer,ledger,database,provider,env:{...env,...overrides.env},...overrides});
 return {service,jobs,events,balance:()=>credits};
}
test('website flow creates signed draft, reserves once, dispatches once and refunds confirmed failure once',async()=>{
 const f=fixture(),q=await f.service.prepare(owner,input);
 assert.equal(q.credits,8);assert.equal(q.usd,0.77);assert.equal(f.balance(),40);
 const submit={jobId:id,quoteToken:q.quoteToken,requestKey:other};
 assert.equal((await f.service.submit(owner,submit)).status,'processing');
 await f.service.submit(owner,submit);
 assert.equal(f.balance(),32);assert.equal(f.events.filter(e=>e==='submit').length,1);
 assert.deepEqual(f.events.slice(0,6),['transfer','save','reserve','claim','submit','record']);
 assert.equal((await f.service.status(owner,{jobId:id})).status,'failed');
 await f.service.status(owner,{jobId:id});assert.equal(f.balance(),40);assert.equal(f.events.filter(e=>e==='refund').length,1);
});
test('foreign job, changed token and disabled dispatch never debit',async()=>{
 const f=fixture(),q=await f.service.prepare(owner,input);
 await assert.rejects(f.service.submit(other,{jobId:id,quoteToken:q.quoteToken,requestKey:other}),/JOB_NOT_FOUND/);
 await assert.rejects(f.service.submit(owner,{jobId:id,quoteToken:q.quoteToken+'bad',requestKey:other}),/QUOTE_INVALID/);
 assert.equal(f.balance(),40);assert.equal(f.events.includes('reserve'),false);
 const disabled=fixture({env:{...env,K4K_HIGGSFIELD_CUSTOMER_DISPATCH_PREVIEW:'false'}});
 await assert.rejects(disabled.service.submit(owner,{jobId:id,quoteToken:q.quoteToken,requestKey:other}),/DISABLED/);
});
test('bad budget or unavailable provider fails before reserve and overpriced draft before upload',async()=>{
 const f=fixture({env:{...env,K4K_PROVIDER_DAILY_BUDGET_USD:'NaN'}}),q=await f.service.prepare(owner,input);
 await assert.rejects(f.service.submit(owner,{jobId:id,quoteToken:q.quoteToken,requestKey:other}),/BUDGET_NOT_CONFIGURED/);assert.equal(f.balance(),40);
 const expensive=fixture();await assert.rejects(expensive.service.prepare(owner,{...input,resolution:'1080p'}),/PROVIDER_BUDGET_BLOCKED/);assert.deepEqual(expensive.events,[]);
 const noProvider=fixture({provider:{ready:false}}),nq=await noProvider.service.prepare(owner,input);
 await assert.rejects(noProvider.service.submit(owner,{jobId:id,quoteToken:nq.quoteToken,requestKey:other}),/PROVIDER_UNAVAILABLE/);assert.equal(noProvider.balance(),40);
});
test('uncertain submit keeps reservation and irreversible claim, retry cannot pay twice',async()=>{
 let calls=0;const f=fixture({provider:{ready:true,submit:async()=>{calls++;throw Error('timeout');}}});const q=await f.service.prepare(owner,input);
 const submit={jobId:id,quoteToken:q.quoteToken,requestKey:other};
 await assert.rejects(f.service.submit(owner,submit),/PROVIDER_SUBMISSION_UNCERTAIN/);
 assert.equal((await f.service.submit(owner,submit)).status,'dispatch_uncertain');assert.equal(calls,1);assert.equal(f.balance(),32);
});
test('rejects client evidence and price; existing draft cannot be overwritten',async()=>{
 const f=fixture();await assert.rejects(f.service.prepare(owner,{...input,verifiedMedia:{seconds:4}}),/INVALID_REQUEST/);
 await f.service.prepare(owner,input);await assert.rejects(f.service.prepare(owner,input),/DRAFT_ALREADY_EXISTS/);
 assert.equal(f.events.filter(e=>e==='transfer').length,1);
});
const req=(body,headers={})=>new Request('https://preview.example/api/higgsfield/customer-jobs',{method:'POST',headers:{origin:'https://preview.example',authorization:'Bearer owner','content-type':'application/json',...headers},body:JSON.stringify(body)});
test('HTTP boundary rejects production, foreign origins/users, unknown fields and client identities',async()=>{
 let calls=0;const createService=()=>{calls++;return {list:async()=>[]}};
 for(const [changes,headers,user,status] of [[{VERCEL_ENV:'production'},{},{id:owner},404],[{},{origin:'https://evil.example'},{id:owner},403],[{},{authorization:''},{id:owner},401],[{},{},{id:other},404],[{},{},{id:owner,is_anonymous:true},401]]){
  const handler=createHiggsfieldCustomerHttp({env:{...env,...changes},authenticate:async()=>user,createService});assert.equal((await handler(req({action:'list'},headers))).status,status);
 }
 assert.equal(calls,0);
 const handler=createHiggsfieldCustomerHttp({env,authenticate:async()=>({id:owner}),createService});
 assert.equal((await handler(req({action:'list',userId:other}))).status,400);
 assert.equal((await handler(req({action:'cancel'}))).status,400);
 assert.equal((await handler(req({action:'list'}))).status,200);assert.equal(calls,1);
});

test('Lite follows production customer reserve and exactly-once provider dispatch with saved model tier',async()=>{
 let submittedTier='',submittedPayload;
 const f=fixture({
  env:{...env,K4K_HIGGSFIELD_LIGHT_RATE_CARD_APPROVED:'true',K4K_GENERATION_MAX_USD:'5'},
  transfer:async({userId,jobId,beforeTransfer})=>{
   await beforeTransfer(30);
   return {input:{video_url:'https://d2ol7oe51mr4n9.cloudfront.net/input.mp4',image_urls:['https://d2ol7oe51mr4n9.cloudfront.net/ref.png']},verifiedMedia:{userId,jobId,verified:true,contentType:'video/mp4',seconds:30}};
  },
  provider:{ready:true,submit:async(tier,payload)=>{submittedTier=tier;submittedPayload=payload;return {request_id:'lite_request_01'};},status:async()=>({request_id:'lite_request_01',status:'queued'})}
 });
 const quote=await f.service.prepare(owner,{...input,motionModel:'lite'});
 assert.equal(quote.motionModel,'lite');
 assert.equal(quote.duration,15);
 assert.equal(quote.credits,12);
 assert.equal(f.jobs.get(id).normalized_input.motionModel,'lite');
 const sent=await f.service.submit(owner,{jobId:id,quoteToken:quote.quoteToken,requestKey:other});
 assert.equal(sent.status,'processing');
 assert.equal(submittedTier,'lite');
 assert.deepEqual(Object.keys(submittedPayload).sort(),['image_urls','prompt','resolution','video_url']);
 assert.equal(f.balance(),28);
 await f.service.submit(owner,{jobId:id,quoteToken:quote.quoteToken,requestKey:other});
 assert.equal(submittedTier,'lite');
 assert.equal(f.events.filter(e=>e==='claim').length,1);
});
