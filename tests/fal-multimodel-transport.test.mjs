import test from 'node:test';
import assert from 'node:assert/strict';
import {createFalMultimodelTransport} from '../lib/server/fal-multimodel-transport.mjs';
const id='019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b';
const endpoint='kling/v4/flash/text-to-video';
const base='https://queue.fal.run/kling/v4';
function json(data,ok=true){return {ok,async json(){return data;}};}
test('disabled transport never makes paid request',async()=>{
 let count=0;
 const t=createFalMultimodelTransport({credentials:'test-key',fetchImpl:async()=>{count++;return json({});}});
 await assert.rejects(t.submitAuthenticated({endpoint,input:{prompt:'A mountain'}}),/MULTIMODEL_TRANSPORT_DISABLED/);
 assert.equal(count,0);
});
test('POST uses exact allowlisted fal route, authentication and no automatic retries',async()=>{
 const calls=[];
 const t=createFalMultimodelTransport({enabled:true,credentials:'test-key',fetchImpl:async(url,options)=>{
  calls.push({url,options});
  return json({request_id:id,status:'IN_QUEUE',response_url:base+'/requests/'+id,status_url:base+'/requests/'+id+'/status'});
 }});
 assert.deepEqual(await t.submitAuthenticated({endpoint,input:{prompt:'A mountain'}}),{request_id:id});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://queue.fal.run/'+endpoint);
 assert.equal(calls[0].options.headers.Authorization,'Key test-key');
 assert.equal(calls[0].options.headers['X-Fal-No-Retry'],'true');
 assert.equal(calls[0].options.redirect,'error');
});
test('submission timeout, rejection, and forged response never trigger retry',async()=>{
 for(const response of [null,json({status:'IN_QUEUE',request_id:id,status_url:'https://evil.test/steal',response_url:base+'/requests/'+id}),json({error:'failure'},false)]){
  let count=0;
  const t=createFalMultimodelTransport({enabled:true,credentials:'test-key',fetchImpl:async()=>{
   count++;
   if(response===null)throw Error('timeout');
   return response;
  }});
  await assert.rejects(t.submitAuthenticated({endpoint,input:{prompt:'A mountain'}}),/PROVIDER_SUBMISSION_UNCERTAIN|INVALID_PROVIDER_JOB_ID/);
  assert.equal(count,1);
 }
});
test('polling is model bound; COMPLETED requires result lookup',async()=>{
 const paths=[];
 const t=createFalMultimodelTransport({enabled:true,credentials:'test-key',fetchImpl:async(url)=>{
  paths.push(url);
  if(url.endsWith('/status'))return json({request_id:id,status:'COMPLETED'});
  return json({images:[{url:'https://untrusted.test/image.png'}]});
 }});
 const result=await t.lookupAuthenticated({model:'kling-flash-t2v',providerRequestId:id});
 assert.deepEqual(result,{request_id:id,status:'completed'});
 assert.deepEqual(paths,[base+'/requests/'+id+'/status',base+'/requests/'+id]);
 assert.equal(JSON.stringify(result).includes('untrusted.test'),false);
});
test('terminal error cannot be mistaken for successful output',async()=>{
 const t=createFalMultimodelTransport({enabled:true,credentials:'test-key',fetchImpl:async(url)=>
  json(url.endsWith('/status')?{request_id:id,status:'COMPLETED'}:{error:'generation failed'})
 });
 assert.equal((await t.lookupAuthenticated({model:'kling-flash-t2v',providerRequestId:id})).status,'failed');
});
test('rejects arbitrary endpoints, models and invalid request IDs without network access',async()=>{
 let count=0;
 const t=createFalMultimodelTransport({enabled:true,credentials:'test-key',fetchImpl:async()=>{count++;return json({});}});
 await assert.rejects(t.submitAuthenticated({endpoint:'attacker/other',input:{prompt:'A mountain'}}),/MODEL_NOT_CONFIGURED/);
 await assert.rejects(t.lookupAuthenticated({providerRequestId:'../evil',model:'kling-flash-t2v'}),/INVALID_PROVIDER_JOB_ID/);
 await assert.rejects(t.lookupAuthenticated({providerRequestId:id,model:'not-allowed'}),/MODEL_NOT_CONFIGURED/);
 assert.equal(count,0);
});
