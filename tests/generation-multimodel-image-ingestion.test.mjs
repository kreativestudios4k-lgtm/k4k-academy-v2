import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationOutputIngestor,verifyGenerationOutputBytes} from '../lib/server/generation-output-ingestion.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
const png=new Uint8Array(2048);
png.set([137,80,78,71,13,10,26,10],0);
png.set([73,72,68,82],12);
const jpeg=new Uint8Array(2048);
jpeg.set([255,216,255,224],0);
jpeg.set([255,217],jpeg.length-2);
function harness(){
 const calls=[];
 const storage={from(bucket){assert.equal(bucket,'studio-generations');return {async upload(path,bytes,opts){calls.push({path,bytes,opts});return {error:null};}}}};
 return {calls,ingest:createGenerationOutputIngestor({storage,enabled:true})};
}
for(const [name,bytes,type,ext] of [['PNG',png,'image/png','png'],['JPEG',jpeg,'image/jpeg','jpg']]){
 test('accepts trusted '+name+' into a private unique media path',async()=>{
  const {calls,ingest}=harness();
  const output=await ingest({userId,jobId,providerJobId:'trusted-job',bytes,contentType:type});
  assert.equal(output.outputPath,userId+'/'+jobId+'.'+ext);
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0].opts,{contentType:type,upsert:false,cacheControl:'0'});
 });
}
test('rejects forged signatures, HTML and MIME confusion before storage',async()=>{
 const {calls,ingest}=harness();
 for(const [bytes,type] of [[jpeg,'image/png'],[png,'image/jpeg'],[new Uint8Array(2048),'image/png'],[png,'text/html']]){
  await assert.rejects(ingest({userId,jobId,providerJobId:'trusted-job',bytes,contentType:type}),/INVALID_OUTPUT_(HEADER|TYPE)/);
 }
 assert.equal(calls.length,0);
});
test('rejects oversized images even if video storage cap is larger',()=>{
 const oversized=new Uint8Array(21*1024*1024);
 oversized.set(png.subarray(0,33));
 assert.throws(()=>verifyGenerationOutputBytes(oversized,'image/png'),/INVALID_OUTPUT_SIZE/);
});
test('rejects incomplete JPEG termination',()=>{
 const bad=jpeg.slice();bad[bad.length-1]=0;
 assert.throws(()=>verifyGenerationOutputBytes(bad,'image/jpeg'),/INVALID_OUTPUT_HEADER/);
});
