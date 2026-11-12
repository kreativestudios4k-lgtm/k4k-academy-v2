import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationOutputVerifier} from '../lib/server/generation-output-verifier.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',outputPath=userId+'/'+jobId+'.mp4';
const args={userId,jobId,outputPath};
function harness(data={size:5000,contentType:'video/mp4'}){
 const paths=[];
 const storage={from:bucket=>{assert.equal(bucket,'studio-generations');return {info:async path=>{paths.push(path);return {data,error:null}}}}};
 return {verify:createGenerationOutputVerifier({storage,enabled:true}),paths};
}
test('verifies private customer/job MP4 metadata',async()=>{
 const {verify,paths}=harness();assert.equal(await verify(args),true);assert.deepEqual(paths,[outputPath]);
});
test('disabled verifier never accesses storage',async()=>{
 let called=false;const verify=createGenerationOutputVerifier({storage:{from:()=>{called=true}},enabled:false});
 await assert.rejects(verify(args),/OUTPUT_VERIFICATION_DISABLED/);assert.equal(called,false);
});
test('rejects another job or customer path before storage access',async()=>{
 const {verify,paths}=harness();
 await assert.rejects(verify({...args,outputPath:userId+'/other.mp4'}),/INVALID_OUTPUT_PATH/);
 await assert.rejects(verify({...args,userId:'33333333-3333-4333-8333-333333333333'}),/INVALID_OUTPUT_PATH/);
 assert.equal(paths.length,0);
});
test('rejects non-MP4 and zero-sized objects',async()=>{
 await assert.rejects(harness({size:5000,contentType:'image/png'}).verify(args),/INVALID_OUTPUT_TYPE/);
 await assert.rejects(harness({size:0,contentType:'video/mp4'}).verify(args),/INVALID_OUTPUT_SIZE/);
});
test('rejects missing objects',async()=>{
 const verify=createGenerationOutputVerifier({enabled:true,storage:{from:()=>({info:async()=>({data:null,error:{message:'not found'}})})}});
 await assert.rejects(verify(args),/OUTPUT_NOT_FOUND/);
});
