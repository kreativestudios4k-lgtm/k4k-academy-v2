import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiggsfieldReferenceTransfer,validateHiggsfieldUploadLink} from '../lib/server/higgsfield-reference-transfer.mjs';
import {createGenerationOutputIngestor} from '../lib/server/generation-output-ingestion.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222';
const link={upload_url:'https://higgsfield-inputs.s3.us-east-1.amazonaws.com/file?signature=test',public_url:'https://d2ol7oe51mr4n9.cloudfront.net/file',upload_headers:{'Content-Type':'video/mp4','x-amz-tagging':'input=1'}};
test('upload destinations and headers cannot redirect provider credentials or references',()=>{
 assert.equal(validateHiggsfieldUploadLink(link).headers['x-amz-tagging'],'input=1');
 for(const changed of [{upload_url:'http://127.0.0.1/file'},{upload_url:'https://evil.example/file'},{public_url:'https://evil.example/file'},{public_url:link.public_url+'?token=x'},{upload_headers:{Authorization:'Key leak'}},{upload_headers:{Cookie:'secret'}},{upload_headers:{'x-amz-tagging':'x\r\ny'}}])assert.throws(()=>validateHiggsfieldUploadLink({...link,...changed}));
});
const box=(type,data)=>{const b=Buffer.alloc(8+data.length);b.writeUInt32BE(b.length);b.write(type,4);data.copy(b,8);return b;};
const mvhd=Buffer.alloc(20);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(4770,16);
const video=Buffer.concat([box('ftyp',Buffer.from('isom0000')),box('moov',box('mvhd',mvhd))]);
const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(512,16);png.writeUInt32BE(512,20);
test('transfers exactly the server-verified bytes once with returned storage headers, never API credentials',async()=>{
 let reads=0;const calls=[];
 const transfer=createHiggsfieldReferenceTransfer({credentials:'test-key-123456789',storageClient:{storage:{from:b=>({download:async()=>{reads++;return {data:new Blob([b==='studio-videos'?video:png])};}})}},fetchImpl:async(url,options)=>{
  calls.push({url,options});return url.startsWith('https://api.higgsfield.ai/')?{ok:true,json:async()=>link}:{ok:true};
 }});
 const result=await transfer({userId,jobId,videoPath:userId+'/'+jobId+'.mp4',referencePaths:[userId+'/'+jobId+'.png'],beforeTransfer:seconds=>assert.equal(seconds,4.77)});
 assert.equal(reads,2);assert.equal(calls.length,4);assert.equal(result.verifiedMedia.receipts.length,2);
 assert.deepEqual(calls[1].options.body,new Uint8Array(video));assert.equal(calls[1].options.credentials,'omit');assert.equal(calls[1].options.headers.Authorization,undefined);assert.equal(calls[1].options.headers['x-amz-tagging'],'input=1');
 assert.match(result.verifiedMedia.receipts[0].sha256,/^[a-f0-9]{64}$/);
});
test('private output replay recovers only identical bytes after previous upload',async()=>{
 const bytes=new Uint8Array(2048);bytes.set([0,0,0,24,102,116,121,112]);
 for(const same of [true,false]){
  const previous=bytes.slice();if(!same)previous[100]=1;
  const storage={from:()=>({upload:async()=>({error:{message:'already exists'}}),download:async()=>({data:new Blob([previous])})})};
  const ingest=createGenerationOutputIngestor({storage,enabled:true,reuseIdentical:true});
  const run=ingest({userId,jobId,providerJobId:'request_1',bytes});
  if(same)assert.equal((await run).outputPath,userId+'/'+jobId+'.mp4');else await assert.rejects(run,/OUTPUT_UPLOAD_FAILED/);
 }
});
