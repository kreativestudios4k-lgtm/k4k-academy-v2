import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationPipeline} from '../lib/server/generation-pipeline.mjs';

const userId='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
const requestKey='33333333-3333-4333-8333-333333333333';
const providerJobId='mock-provider-123';
const outputPath=userId+'/'+jobId+'.mp4';
const submission={userId,jobId,requestKey,tier:'lite',input:{reference:'mock'}};
const completed={userId,jobId,providerJobId,outcome:'completed',outputPath};
function harness({balance=20,providerFails=false,invalidOutput=false}={}){
 const state={balance,submissions:0,refunds:0,reservation:null,job:{id:jobId,user_id:userId,status:'draft',provider_job_id:null},files:new Map()};
 const database={
  rpc:async(name,args)=>{
   if(name==='k4k_generation_reserve_draft'){
    if(state.reservation)return {data:{newly_reserved:false,status:state.reservation.status},error:null};
    if(state.balance<args.p_credits)return {data:null,error:{message:'insufficient'}};
    state.balance-=args.p_credits;state.reservation={status:'reserved',credits:args.p_credits};state.job.status='queued';
    return {data:{newly_reserved:true,status:'reserved'},error:null};
   }
   if(name==='k4k_generation_finish'){
    if(!state.reservation)return {data:null,error:{message:'missing'}};
    if(state.reservation.status!=='reserved')return {data:{status:state.reservation.status},error:null};
    if(args.p_outcome==='completed'){
     if(args.p_output_path!==outputPath)return {data:null,error:{message:'invalid output'}};
     state.reservation.status='settled';state.job.status='completed';
    }else{
     state.reservation.status='refunded';state.job.status='failed';state.balance+=state.reservation.credits;state.refunds++;
    }
    return {data:{status:state.reservation.status},error:null};
   }
   return {data:null,error:{message:'unknown RPC'}};
  },
  from:table=>{
   assert.equal(table,'studio_generation_jobs');
   return {update:values=>{
    const filters={};
    const query={
     eq:(k,v)=>{filters[k]=v;return query},
     is:(k,v)=>{filters[k]=v;return query},
     select:()=>query,
     maybeSingle:async()=>{
      if(state.job.id!==filters.id||state.job.user_id!==filters.user_id||state.job.status!==filters.status||state.job.provider_job_id!==filters.provider_job_id)return {data:null,error:null};
      Object.assign(state.job,values);return {data:{...state.job},error:null};
     }
    };
    return query;
   }};
  }
 };
 const storage={from:bucket=>{
  assert.equal(bucket,'studio-generations');
  return {info:async path=>({data:state.files.get(path)??null,error:state.files.has(path)?null:{message:'not found'}})};
 }};
 const provider={submit:async()=>{state.submissions++;if(providerFails)throw Error('simulated timeout');return {request_id:providerJobId}}};
 const jobStore={getOwnedJob:async(user,job)=>user===userId&&job===jobId?{...state.job}:null};
 const pipeline=createGenerationPipeline({database,storage,provider,jobStore,priceCredits:()=>7,enabled:true,providerEnabled:true});
 return {state,pipeline,upload:()=>state.files.set(outputPath,{size:invalidOutput?0:9000,contentType:'video/mp4'})};
}
test('customer journey: reserve -> submit -> store MP4 -> verify -> settle',async()=>{
 const {state,pipeline,upload}=harness();
 const submitted=await pipeline.submit(submission);
 assert.equal(submitted.status,'submitted');assert.equal(state.balance,13);assert.equal(state.submissions,1);
 assert.equal(state.job.provider_job_id,providerJobId);assert.equal(state.job.status,'processing');
 upload();
 assert.deepEqual(await pipeline.complete(completed),{status:'settled'});
 assert.equal(state.job.status,'completed');assert.equal(state.balance,13);assert.equal(state.refunds,0);
 await assert.rejects(pipeline.complete(completed),/INVALID_JOB_STATE/);
 await assert.rejects(pipeline.submit(submission),/RESERVATION_NOT_NEW/);
 assert.equal(state.submissions,1);
});
test('missing private MP4 cannot settle or consume additional credits',async()=>{
 const {state,pipeline}=harness();
 await pipeline.submit(submission);
 await assert.rejects(pipeline.complete(completed),/OUTPUT_NOT_FOUND/);
 assert.equal(state.balance,13);assert.equal(state.reservation.status,'reserved');
});
test('failed provider job refunds once after trusted reconciliation',async()=>{
 const {state,pipeline}=harness();
 await pipeline.submit(submission);
 await pipeline.complete({...completed,outcome:'failed',outputPath:null});
 assert.equal(state.balance,20);assert.equal(state.refunds,1);
 await assert.rejects(pipeline.complete({...completed,outcome:'failed',outputPath:null}),/INVALID_JOB_STATE/);
 assert.equal(state.refunds,1);
});
test('ambiguous provider timeout keeps reservation for manual reconciliation',async()=>{
 const {state,pipeline}=harness({providerFails:true});
 await assert.rejects(pipeline.submit(submission),/PROVIDER_SUBMISSION_UNCERTAIN/);
 assert.equal(state.balance,13);assert.equal(state.refunds,0);assert.equal(state.submissions,1);
 await assert.rejects(pipeline.submit(submission),/RESERVATION_NOT_NEW/);
 assert.equal(state.submissions,1);
});
test('unverified or wrong job MP4 cannot settle',async()=>{
 const {state,pipeline,upload}=harness({invalidOutput:true});
 await pipeline.submit(submission);upload();
 await assert.rejects(pipeline.complete(completed),/INVALID_OUTPUT_SIZE/);
 await assert.rejects(pipeline.complete({...completed,outputPath:userId+'/'+requestKey+'.mp4'}),/INVALID_OUTPUT/);
 assert.equal(state.reservation.status,'reserved');
});
test('pipeline is disabled by default and makes no provider request',async()=>{
 let called=false;
 const pipeline=createGenerationPipeline({provider:{submit:async()=>{called=true}}});
 await assert.rejects(pipeline.submit(submission),/GENERATION_DISABLED/);
 assert.equal(called,false);
});
