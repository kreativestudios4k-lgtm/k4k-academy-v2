import test from 'node:test';
import assert from 'node:assert/strict';
import {buildK4KProviderRequest as build,PROVIDER_MODELS} from '../lib/server/k4k-provider-router.mjs';
const base={videoUrls:['https://media.example/video.mp4'],imageUrls:['https://media.example/a.png'],
 prompt:'Preserve original movement',durationSeconds:5,allowedMediaOrigins:['https://media.example']};
test('routes all three K4K models to exact Higgsfield endpoints',()=>{
 for(const [model,item] of Object.entries(PROVIDER_MODELS)){
  const request=build({...base,model});
  assert.equal(request.url,'https://api.higgsfield.ai/'+item.path);
  assert.equal(request.body.resolution,'720p');
 }
});
test('Wan 3 Prime uses video_urls and Genjutsu uses video_url',()=>{
 const wan=build({...base,model:'create'});
 const lite=build({...base,model:'lite'});
 assert.deepEqual(wan.body.video_urls,base.videoUrls);
 assert.equal(wan.body.generate_audio,false);
 assert.equal(lite.body.video_url,base.videoUrls[0]);
 assert.equal('video_urls' in lite.body,false);
});
for(const [key,value] of [['model','random'],['durationSeconds',1],['prompt',''],
 ['imageUrls',[]],['videoUrls',[]],['allowedMediaOrigins',[]]]){
 test('rejects unsafe '+key,()=>assert.throws(()=>build({...base,model:'create',[key]:value})));
}
test('rejects arbitrary remote and local media URLs',()=>{
 for(const url of ['http://media.example/a.png','https://evil.example/a.png','https://user:pass@media.example/a.png']){
  assert.throws(()=>build({...base,model:'pro',imageUrls:[url]}));
 }
});
test('motion models require 4 seconds',()=>assert.throws(()=>build({...base,model:'lite',durationSeconds:3})));
