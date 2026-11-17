import test from 'node:test';
import assert from 'node:assert/strict';
import {createMultimodelProviderLifecycle} from '../lib/server/multimodel-provider-lifecycle.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const job={id:'22222222-2222-4222-8222-222222222222',user_id:userId,model:'kling-flash-t2v',input:{prompt:'A bright coastal sunrise',duration:5,resolution:'720p',aspect_ratio:'9:16'}};
test('default disabled: no RPC or paid provider request',async()=>{
 let calls=0;
 const lifecycle=createMultimodelProviderLifecycle({database:{rpc:async()=>{calls++;return {data:{}};}},submitAuthenticated:async()=>{calls++;}});
 await assert.rejects(lifecycle.dispatch({userId,job}),/MULTIMODEL_DISPATCH_DISABLED/);
 assert.equal(calls,0);
});
test('one database claim wins provider submission; retries never dispatch',async()=>{
 let submits=0,claims=0,records=0;
 const db={rpc:async(name,args)=>{
  if(name==='k4k_multimodel_claim_dispatch'){claims++;return {data:{job_id:job.id,claimed:claims===1,state:'dispatch_uncertain'}};}
  if(name==='k4k_multimodel_record_provider_request'){records++;assert.equal(args.p_provider_request,'provider_123');return {data:{job_id:job.id,recorded:true,status:'processing'}};}
  throw Error('Unexpected RPC');
 }};
 const lifecycle=createMultimodelProviderLifecycle({database:db,enabled:true,submitAuthenticated:async()=>{submits++;return {request_id:'provider_123'};}});
 const a=await lifecycle.dispatch({userId,job});
 const b=await lifecycle.dispatch({userId,job});
 assert.equal(a.dispatched,true);assert.equal(b.dispatched,false);
 assert.equal(submits,1);assert.equal(records,1);
});
test('provider timeout leaves an uncertain claim and does not retry',async()=>{
 let calls=0;
 const lifecycle=createMultimodelProviderLifecycle({
 enabled:true,database:{rpc:async()=>({data:{job_id:job.id,claimed:++calls===1,state:'dispatch_uncertain'}})},
 submitAuthenticated:async()=>{throw Error('network timeout');}
 });
 await assert.rejects(lifecycle.dispatch({userId,job}),/PROVIDER_SUBMISSION_UNCERTAIN/);
 const retry=await lifecycle.dispatch({userId,job});
 assert.equal(retry.dispatched,false);assert.equal(retry.status,'dispatch_uncertain');
});
test('bad identity/input cannot consume the database dispatch claim',async()=>{
 let calls=0;
 const lifecycle=createMultimodelProviderLifecycle({
 enabled:true,database:{rpc:async()=>{calls++;return {data:{job_id:job.id,claimed:true}}}},
 submitAuthenticated:async()=>({request_id:'ok'})
 });
 await assert.rejects(lifecycle.dispatch({userId,job:{...job,user_id:'other'}}),/INVALID_JOB/);
 await assert.rejects(lifecycle.dispatch({userId,job:{...job,input:{...job.input,extra:'hack'}}}),/INVALID_PROVIDER_INPUT/);
 assert.equal(calls,0);
});
test('authenticated status lookup binds provider request and never exposes URLs',async()=>{
 const lifecycle=createMultimodelProviderLifecycle({
 enabled:true,lookupAuthenticated:async()=>({request_id:'abc123',status:'completed',url:'https://provider.example/secret'})
 });
 assert.deepEqual(await lifecycle.status({model:job.model,providerRequestId:'abc123'}),{status:'completed',providerRequestId:'abc123'});
 await assert.rejects(lifecycle.status({model:job.model,providerRequestId:'wrong'}),/PROVIDER_REQUEST_MISMATCH/);
});
