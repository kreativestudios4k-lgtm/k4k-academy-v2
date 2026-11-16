import test from 'node:test';
import assert from 'node:assert/strict';
import {createMultimodelPrivateDelivery} from '../lib/server/multimodel-private-delivery.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
const formats=[['image/png','png','image'],['image/jpeg','jpg','image'],['video/mp4','mp4','video']];
function setup(mime,ext,kind,overrides={}){
 const path=userId+'/'+jobId+'.'+ext;
 const calls=[];
 const job={id:jobId,user_id:userId,status:'completed',provider_request_id:'request_123',media_kind:kind,output_mime:mime,output_path:path,...overrides.job};
 const storage={from(bucket){
  assert.equal(bucket,'studio-generations');
  return {
   info:async p=>{calls.push(['info',p]);return {data:overrides.storage??{size:2048,contentType:mime},error:null};},
   createSignedUrl:async(p,expires,options)=>{
    calls.push(['sign',p,expires,options]);
    return {data:{signedUrl:'https://project.supabase.co/storage/v1/object/sign/studio-generations/private?token=ok'},error:null};
   }
  };
 }};
 const delivery=createMultimodelPrivateDelivery({jobStore:{getOwnedJob:async()=>job},storage,enabled:true});
 return {delivery,calls,path};
}
for(const [mime,ext,kind] of formats){
 test('private '+mime+' delivery signs only verified owned output',async()=>{
  const s=setup(mime,ext,kind);
  const result=await s.delivery.getSignedUrl({userId,jobId,download:true});
  assert.equal(result.contentType,mime);
  assert.equal(result.fileName,'K4K-'+jobId+'.'+ext);
  assert.deepEqual(s.calls.map(c=>c[0]),['info','sign']);
  assert.equal(s.calls[1][2],120);
  assert.deepEqual(s.calls[1][3],{download:'K4K-'+jobId+'.'+ext});
 });
}
test('no URL is signed for wrong owner, mismatched path, bad MIME or pending job',async()=>{
 for(const changes of [
  {job:{user_id:'33333333-3333-4333-8333-333333333333'}},
  {job:{output_path:userId+'/elsewhere.png'}},
  {job:{status:'processing'}},
  {job:{media_kind:'video'}},
  {job:{provider_request_id:null}},
  {storage:{size:2048,contentType:'text/html'}},
  {storage:{size:0,contentType:'image/png'}}
 ]){
  const s=setup('image/png','png','image',changes);
  await assert.rejects(s.delivery.getSignedUrl({userId,jobId}));
  assert.equal(s.calls.some(c=>c[0]==='sign'),false);
 }
});
test('disabled output cannot sign any URL',async()=>{
 let touched=false;
 const delivery=createMultimodelPrivateDelivery({enabled:false,jobStore:{getOwnedJob:async()=>{touched=true;}}});
 await assert.rejects(delivery.getSignedUrl({userId,jobId}),/MULTIMODEL_DELIVERY_DISABLED/);
 assert.equal(touched,false);
});
test('view mode does not force attachment disposition',async()=>{
 const s=setup('image/png','png','image');
 const result=await s.delivery.getSignedUrl({userId,jobId});
 assert.equal(Object.hasOwn(result,'fileName'),false);
 assert.equal(s.calls[1][3],undefined);
});
