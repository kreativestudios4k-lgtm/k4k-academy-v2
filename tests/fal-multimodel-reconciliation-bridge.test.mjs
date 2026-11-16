import test from 'node:test';
import assert from 'node:assert/strict';
import {createFalMultimodelTransport} from '../lib/server/fal-multimodel-transport.mjs';
import {createFalMultimodelMediaRetriever} from '../lib/server/fal-multimodel-media-retriever.mjs';
import {createFalMultimodelReconciliationBridge} from '../lib/server/fal-multimodel-reconciliation-bridge.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
const providerRequestId='fal_req_123';
const model='flux3-t2i';
const url='https://v3b.fal.media/files/example/image.png';
const png=new Uint8Array(2048);
png.set([137,80,78,71,13,10,26,10],0);png.set([73,72,68,82],12);
const job={id:jobId,user_id:userId,model,media_kind:'image',status:'processing',provider_request_id:providerRequestId};
const response=(v)=>({ok:true,async json(){return v;}});
function imageResponse(){
 let read=false;
 return {ok:true,headers:{get(name){return name==='content-type'?'image/png':name==='content-length'?'2048':null;}},body:{getReader(){return {async read(){if(read)return {done:true};read=true;return {done:false,value:png};},async cancel(){}}}}};
}
function harness({providerStatus='COMPLETED',badUrl=false,owner=userId,kind='image'}={}){
 const calls=[];
 const transport=createFalMultimodelTransport({enabled:true,credentials:'fixture-key',fetchImpl:async(path,options)=>{
  calls.push({kind:'queue',path,auth:options.headers.Authorization});
  if(path.endsWith('/status'))return response({request_id:providerRequestId,status:providerStatus});
  return response({images:[{url:badUrl?'https://127.0.0.1/media.png':url,content_type:'image/png',file_size:2048}]});
 }});
 const retrieveMedia=createFalMultimodelMediaRetriever({enabled:true,fetchImpl:async(path,options)=>{
  calls.push({kind:'media',path,redirect:options.redirect});
  return imageResponse();
 }});
 const reconcile=createFalMultimodelReconciliationBridge({
  transport,retrieveMedia,enabled:true,
  getOwnedJob:async()=>({...job,user_id:owner,media_kind:kind}),
  ingest:async({providerJobId,bytes,contentType})=>{
   calls.push({kind:'ingest',providerJobId,bytes:bytes.length,contentType});
   return {providerJobId,outputPath:userId+'/'+jobId+'.png'};
  },
  ledger:{finish:async x=>{calls.push({kind:'settle',args:x});return {status:'settled'};}}
 });
 return {reconcile,calls};
}
test('completed provider image flows through authenticated result, bounded download, private ingestion, settlement',async()=>{
 const h=harness();
 const result=await h.reconcile({userId,jobId});
 assert.equal(result.status,'completed');
 assert.deepEqual(h.calls.map(c=>c.kind),['queue','queue','queue','media','ingest','settle']);
 assert.equal(h.calls.filter(c=>c.kind==='queue').every(c=>c.auth==='Key fixture-key'),true);
 assert.equal(h.calls.find(c=>c.kind==='media').redirect,'error');
 assert.equal(h.calls.at(-1).args.outputPath,userId+'/'+jobId+'.png');
});
test('pending provider status never retrieves bytes or settles',async()=>{
 const h=harness({providerStatus:'IN_PROGRESS'});
 assert.equal((await h.reconcile({userId,jobId})).status,'pending');
 assert.deepEqual(h.calls.map(c=>c.kind),['queue']);
});
test('wrong owner blocks provider calls',async()=>{
 const h=harness({owner:'33333333-3333-4333-8333-333333333333'});
 await assert.rejects(h.reconcile({userId,jobId}),/JOB_NOT_FOUND/);
 assert.equal(h.calls.length,0);
});
test('malicious provider media host fails closed before download or charging credits',async()=>{
 const h=harness({badUrl:true});
 await assert.rejects(h.reconcile({userId,jobId}),/UNTRUSTED_PROVIDER_MEDIA_HOST/);
 assert.equal(h.calls.some(c=>c.kind==='media'||c.kind==='ingest'||c.kind==='settle'),false);
});
test('provider output mismatched to job kind cannot settle',async()=>{
 const h=harness({kind:'video'});
 await assert.rejects(h.reconcile({userId,jobId}),/INVALID_PROVIDER_MEDIA_TYPE/);
 assert.equal(h.calls.some(c=>c.kind==='settle'),false);
});
test('bridge and transport disabled by default',async()=>{
 let called=false;
 const reconcile=createFalMultimodelReconciliationBridge({
  transport:{lookupAuthenticated:async()=>{called=true;}},
  getOwnedJob:async()=>{called=true;}
 });
 await assert.rejects(reconcile({userId,jobId}),/MULTIMODEL_RECONCILIATION_DISABLED/);
 assert.equal(called,false);
});
