import test from 'node:test';
import assert from 'node:assert/strict';
import {ReadableStream} from 'node:stream/web';
import {prepareHiggsfieldCustomerQuote} from '../lib/server/higgsfield-customer-quote.mjs';
import {createHiggsfieldCustomerDispatch} from '../lib/server/higgsfield-customer-dispatch.mjs';
import {createHiggsfieldCustomerCompletion} from '../lib/server/higgsfield-customer-completion.mjs';
const userId='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const rid='01a1e884-0fb7-70e0-bf45-b42cfd747410';
const host='https://d2ol7oe51mr4n9.cloudfront.net/user_x/';
const input={video_url:host+'source.mp4',image_urls:[host+'photo.jpg'],resolution:'480p',prompt:'Replace foreground actor only'};
const media={verified:true,userId,jobId:id,contentType:'video/mp4',seconds:4.766667};
const env={VERCEL_ENV:'preview',K4K_HIGGSFIELD_CUSTOMER_QUOTE_PREVIEW:'true',
 K4K_HIGGSFIELD_CUSTOMER_DISPATCH_PREVIEW:'true',K4K_HIGGSFIELD_RATE_CARD_APPROVED:'true',
 K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_PROVIDER_USD_PER_CREDIT:'0.10',
 K4K_GENERATION_MAX_USD:'2',K4K_GENERATION_QUOTE_SECRET:'test-secret-only-for-quote-verify-0123456789'};
const draft={id,user_id:userId,status:'draft',provider:'higgsfield',model:'genjutsu-motion',media_kind:'video',input};
function prepared(){
 const q=prepareHiggsfieldCustomerQuote({job:draft,userId,verifiedMedia:media,env});
 const job={...draft,status:'queued',input_fingerprint:'',quoted_usd_micros:q.quoteMicros,credits_quoted:q.credits,quote_expires_at:new Date(Date.now()+300000).toISOString()};
 return {q,job};
}
test('dispatch is disabled by default and does not call paid provider',async()=>{
 let calls=0;const {q,job}=prepared();
 const run=createHiggsfieldCustomerDispatch({enabled:false,env,lookupJob:async()=>job,
  getVerifiedMedia:async()=>media,provider:{submit:async()=>{calls++}},database:{rpc:async()=>{calls++}}});
 await assert.rejects(run.submitReserved({userId,jobId:id,quoteToken:q.quoteToken}),/HIGGSFIELD_CUSTOMER_DISPATCH_DISABLED/);
 assert.equal(calls,0);
});
test('verified queued quote gets irreversible single dispatch claim; replay does not submit twice',async()=>{
 const {q,job}=prepared();
 const check=await import('../lib/server/higgsfield-customer-quote.mjs');
 job.input_fingerprint=check.verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia:media,token:q.quoteToken,env}).fingerprint;
 let claim=0,submit=0,record=0;
 const adapter=createHiggsfieldCustomerDispatch({enabled:true,env,lookupJob:async()=>job,
  getVerifiedMedia:async()=>media,
  provider:{submit:async(tier,request,config)=>{
   submit++;assert.equal(config.sourceSeconds,media.seconds);assert.equal(config.quotedUsd,1.59);
   assert.deepEqual(request,input);return {request_id:rid};
  }},
  database:{rpc:async(name,args)=>{
   if(name==='k4k_multimodel_claim_dispatch'){claim++;return {data:{job_id:id,claimed:claim===1,state:'provider_recorded'},error:null};}
   if(name==='k4k_multimodel_record_provider_request'){record++;assert.equal(args.p_provider_request,rid);return {data:{job_id:id,status:'processing'},error:null};}
   throw Error('UNEXPECTED_RPC');
  }}});
 assert.equal((await adapter.submitReserved({userId,jobId:id,quoteToken:q.quoteToken})).status,'processing');
 assert.equal((await adapter.submitReserved({userId,jobId:id,quoteToken:q.quoteToken})).dispatched,false);
 assert.equal(submit,1);assert.equal(record,1);assert.equal(claim,2);
});
test('changed reserved price fails before any paid dispatch claim',async()=>{
 const {q,job}=prepared();job.quoted_usd_micros=1500000;
 let calls=0;
 const adapter=createHiggsfieldCustomerDispatch({enabled:true,env,lookupJob:async()=>job,
  getVerifiedMedia:async()=>media,provider:{submit:async()=>{calls++}},database:{rpc:async()=>{calls++}}});
 await assert.rejects(adapter.submitReserved({userId,jobId:id,quoteToken:q.quoteToken}),/RESERVED_QUOTE_MISMATCH/);
 assert.equal(calls,0);
});
test('submission timeout leaves claim uncertain, with no automatic retry or refund',async()=>{
 const {q,job}=prepared();
 const check=await import('../lib/server/higgsfield-customer-quote.mjs');
 job.input_fingerprint=check.verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia:media,token:q.quoteToken,env}).fingerprint;
 let calls=0;
 const adapter=createHiggsfieldCustomerDispatch({enabled:true,env,lookupJob:async()=>job,
  getVerifiedMedia:async()=>media,provider:{submit:async()=>{calls++;throw Error('timeout')}},
  database:{rpc:async()=>({data:{job_id:id,claimed:true},error:null})}});
 await assert.rejects(adapter.submitReserved({userId,jobId:id,quoteToken:q.quoteToken}),/PROVIDER_SUBMISSION_UNCERTAIN/);
 assert.equal(calls,1);
});
test('completed recorded Higgsfield request: verify bytes, store privately and settle customer once',async()=>{
 const output=new Uint8Array(2048);output.set([0,0,0,24,102,116,121,112,105,115,111,109]);
 const providerUrl='https://d3u0tzju9qaucj.cloudfront.net/95042270-a834-4075-88c0-26591ab26cdc/'+rid+'/dc9f3240-95c2-46ad-9657-55d36e56bd3d.mp4';
 const events=[];
 const provider={status:async request=>{events.push('status');return {request_id:request,status:'completed',video:{url:providerUrl}}}};
 const fetchImpl=async()=>({status:200,headers:{get:h=>h==='content-type'?'video/mp4':h==='content-length'?String(output.length):null},body:new ReadableStream({start(c){c.enqueue(output);c.close();}})});
 const storage={from:bucket=>{assert.equal(bucket,'studio-generations');return {upload:async(path,bytes,opts)=>{events.push(['upload',path,opts]);assert.deepEqual(bytes,output);return {error:null};}}}};
 const ledger={finish:async({userId,jobId,outcome,contentType,outputPath})=>{
  assert.equal(outcome,'completed');assert.equal(contentType,'video/mp4');
  assert.equal(outputPath,userId+'/'+jobId+'.mp4');events.push('settled');return {status:'settled'};
 }};
 const adapter=createHiggsfieldCustomerCompletion({enabled:true,getOwnedJob:async(u,j)=>({id:j,user_id:u,provider:'higgsfield',model:'genjutsu-motion',media_kind:'video',status:'processing',provider_request_id:rid}),provider,storage,ledger,fetchImpl});
 const response=await adapter.reconcile({userId,jobId:id});
 assert.equal(response.status,'completed');
 assert.equal(events.at(-1),'settled');
 assert.equal(events.filter(x=>Array.isArray(x)&&x[0]==='upload').length,1);
});
test('completed but untrusted output URL cannot ingest or settle',async()=>{
 const adapter=createHiggsfieldCustomerCompletion({enabled:true,
  getOwnedJob:async(u,j)=>({id:j,user_id:u,provider:'higgsfield',model:'genjutsu-motion',media_kind:'video',status:'processing',provider_request_id:rid}),
  provider:{status:async()=>({request_id:rid,status:'completed',video:{url:'https://attacker.example.com/file.mp4'}})},
  storage:{from:()=>({upload:async()=>{throw Error('NO_STORAGE')}})},ledger:{finish:async()=>{throw Error('NO_SETTLE')}}});
 await assert.rejects(adapter.reconcile({userId,jobId:id}),/PROVIDER_OUTPUT_URL_UNTRUSTED/);
});
