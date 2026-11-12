import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationOutputIngestor} from '../lib/server/generation-output-ingestion.mjs';

const userId='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
const providerJobId='provider-test-1';
const bytes=new Uint8Array(2048);
bytes.set([0,0,0,24,102,116,121,112,105,115,111,109],0);
function harness({enabled=true,uploadError=null}={}){
 const calls=[];
 const storage={from(bucket){assert.equal(bucket,'studio-generations');return {async upload(path,data,options){calls.push({path,data,options});return {error:uploadError};}}}};
 const ingest=createGenerationOutputIngestor({storage,enabled});
 return {ingest,calls};
}
const valid={userId,jobId,providerJobId,bytes};
test('disabled by default and does not upload',async()=>{
 const {ingest,calls}=harness({enabled:false});
 await assert.rejects(ingest(valid),/OUTPUT_INGESTION_DISABLED/);
 assert.equal(calls.length,0);
});
test('valid MP4 is uploaded once to exact owner/job path without upsert',async()=>{
 const {ingest,calls}=harness();
 const result=await ingest(valid);
 assert.equal(result.outputPath,userId+'/'+jobId+'.mp4');
 assert.equal(result.providerJobId,providerJobId);
 assert.equal(calls.length,1);
 assert.equal(calls[0].path,result.outputPath);
 assert.equal(calls[0].options.contentType,'video/mp4');
 assert.equal(calls[0].options.upsert,false);
 assert.equal(calls[0].options.cacheControl,'0');
});
test('rejects invalid identities before upload',async()=>{
 const {ingest,calls}=harness();
 await assert.rejects(ingest({...valid,userId:'../other'}),/INVALID_JOB_IDENTITY/);
 await assert.rejects(ingest({...valid,providerJobId:''}),/INVALID_JOB_IDENTITY/);
 assert.equal(calls.length,0);
});
test('rejects invalid type, size, and MP4 header before upload',async()=>{
 const {ingest,calls}=harness();
 await assert.rejects(ingest({...valid,contentType:'text/html'}),/INVALID_OUTPUT_TYPE/);
 await assert.rejects(ingest({...valid,bytes:new Uint8Array(10)}),/INVALID_OUTPUT_SIZE/);
 await assert.rejects(ingest({...valid,bytes:new Uint8Array(2048)}),/INVALID_MP4_HEADER/);
 assert.equal(calls.length,0);
});
test('fails closed on storage error',async()=>{
 const {ingest,calls}=harness({uploadError:{message:'already exists'}});
 await assert.rejects(ingest(valid),/OUTPUT_UPLOAD_FAILED/);
 assert.equal(calls.length,1);
});
