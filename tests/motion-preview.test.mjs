import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMotionInputs} from '../lib/motion-preview.mjs';
const video={type:'video/mp4',size:1024*1024};
const image={type:'image/png',size:500_000};
const input={video,image,durationSeconds:5.2,mode:'replace',prompt:'Preserve timing'};

test('valid local-only manifest is free while provider rendering remains unavailable',()=>{
 const r=inspectMotionInputs(input);
 assert.equal(r.ok,true);
 assert.equal(r.manifest.execution,'dry-run-only');
 assert.equal(r.manifest.estimatedChargeGbpPence,0);
 assert.equal(r.manifest.requiresGpuForRendering,false);
 assert.equal(r.manifest.requiresProviderPayment,true);
 assert.equal(r.manifest.clipDurationSeconds,5.2);
});
test('both replacement and animation modes validate',()=>{
 assert.equal(inspectMotionInputs({...input,mode:'animate'}).ok,true);
});
test('missing files and untrusted file types reject without charging',()=>{
 const r=inspectMotionInputs({...input,video:{type:'text/html',size:100},image:null});
 assert.equal(r.ok,false);assert.ok(r.errors.length>=2);
});
test('rejects oversized files and unsupported mode',()=>{
 const r=inspectMotionInputs({...input,video:{...video,size:70*1024*1024},image:{...image,size:16*1024*1024},mode:'bill'});
 assert.equal(r.ok,false);assert.equal(r.errors.length,3);
});
test('alpha duration range, unknown duration, and prompt limit enforced',()=>{
 for(const durationSeconds of [NaN,1.9,10.1,Infinity]){
  assert.equal(inspectMotionInputs({...input,durationSeconds}).ok,false);
 }
 assert.equal(inspectMotionInputs({...input,prompt:'a'.repeat(1201)}).ok,false);
});
