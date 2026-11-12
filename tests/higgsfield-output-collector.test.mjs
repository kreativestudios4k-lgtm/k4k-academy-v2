import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiggsfieldOutputCollector} from '../lib/server/higgsfield-output-collector.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',providerJobId='provider_123';
const ids={userId,jobId,providerJobId};
function harness({owner=userId,exists=false,uploadError=false,settleError=false,enabled=true,allowedHosts}={}){
 const calls=[];let stored=exists;
 const storage={from:bucket=>({info:async path=>stored?{data:{size:2048,contentType:'video/mp4'}}:{error:{message:'not found'}},upload:async(path,bytes,options)=>{calls.push(['upload',bucket,path,options.upsert]);if(uploadError)return {error:{}};stored=true;return {error:null}}})};
 const jobStore={getOwnedJob:async()=>({id:jobId,user_id:owner,provider_job_id:providerJobId,status:'processing'})};
 const ledger={finish:async(...args)=>{calls.push(['settle',...args]);if(settleError)throw Error('SETTLEMENT_UNAVAILABLE');return {status:'settled'}}};
 const bytes=new Uint8Array(2048);bytes.set([0,0,0,24,102,116,121,112]);
 const fetchImpl=async()=>{calls.push(['download']);return {ok:true,headers:{get:key=>key==='content-type'?'video/mp4':null},body:new ReadableStream({start(c){c.enqueue(bytes);c.close()}})}};
 const collect=createHiggsfieldOutputCollector({storage,jobStore,ledger,fetchImpl,enabled,...(allowedHosts?{allowedHosts}:{} )});
 return {collect,calls};
}
const status={request_id:providerJobId,status:'completed',video:{url:'https://d3u0tzju9qaucj.cloudfront.net/out.mp4'}};
test('completed authenticated provider video is stored privately before settlement',async()=>{const {collect,calls}=harness();assert.deepEqual(await collect({...ids,status}),{status:'completed'});assert.deepEqual(calls.map(c=>c[0]),['download','upload','settle']);assert.deepEqual(calls[1],['upload','studio-generations',userId+'/'+jobId+'.mp4',false]);});
test('foreign owner and mismatched provider status cannot download or settle',async()=>{for(const opts of [{owner:'other'},{}]){const {collect,calls}=harness(opts);await assert.rejects(collect({...ids,status:opts.owner?status:{...status,request_id:'wrong'}}));assert.deepEqual(calls,[])}});
test('untrusted output host cannot fetch bytes or settle',async()=>{const {collect,calls}=harness();await assert.rejects(collect({...ids,status:{...status,video:{url:'https://internal.example/out.mp4'}}}),/UNTRUSTED/);assert.deepEqual(calls,[])});
test('failed storage does not mark completed',async()=>{const {collect,calls}=harness({uploadError:true});await assert.rejects(collect({...ids,status}));assert.ok(!calls.some(c=>c[0]==='settle'))});
test('retry after storage success reconciles immutable output without a second download',async()=>{const {collect,calls}=harness({exists:true});await collect({...ids,status});assert.deepEqual(calls.map(c=>c[0]),['settle'])});
test('disabled collector has no side effects',async()=>{const {collect,calls}=harness({enabled:false});await assert.rejects(collect({...ids,status}),/DISABLED/);assert.deepEqual(calls,[])});

test('fal completion uses the same private library ingestion and atomic settlement',async()=>{
 const {collect,calls}=harness({allowedHosts:['v3b.fal.media']});
 await collect({...ids,status:{...status,video:{url:'https://v3b.fal.media/out.mp4'}}});
 assert.deepEqual(calls.map(c=>c[0]),['download','upload','settle']);
 assert.equal(calls[1][1],'studio-generations');
});
