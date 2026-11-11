import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationOutputDelivery} from '../lib/server/generation-output-delivery.mjs';
const userId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',path=userId+'/'+jobId+'.mp4';
function setup({owner=userId,status='completed',outputPath=path,verified=true,enabled=true}={}){
 let signed=0,optionsReceived;
 const jobStore={getOwnedJob:async()=>({id:jobId,user_id:owner,status,output_path:outputPath})};
 const storage={from:bucket=>{assert.equal(bucket,'studio-generations');return {createSignedUrl:async(p,ttl,options)=>{signed++;optionsReceived=options;assert.equal(p,path);assert.equal(ttl,120);return {data:{signedUrl:'https://example.test/private?token=mock'},error:null}}}}};
 const delivery=createGenerationOutputDelivery({jobStore,storage,verifyOutput:async()=>verified,enabled});
 return {delivery,get signed(){return signed},get options(){return optionsReceived}};
}
test('completed owned MP4 receives a short-lived signed URL',async()=>{
 const s=setup();assert.deepEqual(await s.delivery.getSignedUrl({userId,jobId}),{url:'https://example.test/private?token=mock',expiresIn:120});assert.equal(s.signed,1);
});
test('disabled delivery does not sign URLs',async()=>{
 const s=setup({enabled:false});await assert.rejects(s.delivery.getSignedUrl({userId,jobId}),/OUTPUT_DELIVERY_DISABLED/);assert.equal(s.signed,0);
});
test('other user, incomplete job or mismatched output cannot sign URLs',async()=>{
 for(const options of [{owner:'33333333-3333-4333-8333-333333333333'},{status:'processing'},{outputPath:userId+'/other.mp4'},{verified:false}]){
  const s=setup(options);await assert.rejects(s.delivery.getSignedUrl({userId,jobId}));assert.equal(s.signed,0);
 }
});

test('explicit MP4 download signs an attachment filename while playback stays inline',async()=>{
 const download=setup();const result=await download.delivery.getSignedUrl({userId,jobId,download:true});
 assert.deepEqual(download.options,{download:'K4K-'+jobId+'.mp4'});
 assert.equal(result.fileName,'K4K-'+jobId+'.mp4');
 const preview=setup();await preview.delivery.getSignedUrl({userId,jobId});assert.equal(preview.options,undefined);
});
test('download mode cannot bypass owner or completion checks',async()=>{
 for(const options of [{owner:'33333333-3333-4333-8333-333333333333'},{status:'processing'},{verified:false}]){
  const s=setup(options);await assert.rejects(s.delivery.getSignedUrl({userId,jobId,download:true}));assert.equal(s.signed,0);
 }
});
