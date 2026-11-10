import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationDeliveryService} from '../lib/server/generation-delivery-service.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',providerJobId='request_123';
const ids={userId,jobId,providerJobId},bytes=new Uint8Array(2048);
bytes.set([0,0,0,24,102,116,121,112],0);
function harness(owner=userId,enabled=true){
 const calls=[];
 const jobStore={getOwnedJob:async()=>{calls.push('authorize');return {user_id:owner,id:jobId,provider_job_id:providerJobId,status:'processing'}}};
 const service=createGenerationDeliveryService({enabled,jobStore,allowedHosts:['media.example'],resolveTrustedUrl:async()=>{calls.push('resolve');return 'https://media.example/out.mp4'},getStatus:async()=>{calls.push('status');return {providerJobId,status:'completed'}},fetchImpl:async()=>{calls.push('download');return {ok:true,headers:{get:k=>k==='content-type'?'video/mp4':null},body:new ReadableStream({start(c){c.enqueue(bytes);c.close()}})}},storage:{from:()=>({upload:async()=>{calls.push('upload');return {error:null}}})},pipeline:{complete:async()=>{calls.push('settle');return {status:'settled'}}}});
 return {service,calls};
}
test('delivers completed provider output through private storage and settlement',async()=>{const {service,calls}=harness();assert.deepEqual(await service(ids),{status:'settled'});assert.deepEqual(calls,['authorize','status','resolve','download','authorize','upload','settle'])});
test('rejects foreign jobs before provider access',async()=>{const {service,calls}=harness('99999999-9999-4999-8999-999999999999');await assert.rejects(service(ids),/JOB_OWNERSHIP_OR_PROVIDER_MISMATCH/);assert.deepEqual(calls,['authorize'])});
test('disabled gate prevents all side effects',async()=>{const {service,calls}=harness(userId,false);await assert.rejects(service(ids),/OUTPUT_RECONCILIATION_DISABLED/);assert.deepEqual(calls,[])});
