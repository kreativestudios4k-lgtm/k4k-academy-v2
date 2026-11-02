import test from 'node:test';
import assert from 'node:assert/strict';
import {motionInput,normalizeStatus,createVideoProvider} from '../lib/server/higgsfield-video.mjs';
const input={videoUrl:'https://media.example/ref.mp4',imageUrls:['https://media.example/1.jpg'],durationSeconds:5};
test('validates trusted media and duration before submission',()=>{
 assert.equal(motionInput(input,['https://media.example']).resolution,'720p');
 for(const patch of [{videoUrl:'http://media.example/ref.mp4'},{videoUrl:'https://evil.example/ref.mp4'},{durationSeconds:3},{durationSeconds:31},{imageUrls:[]},{imageUrls:Array(9).fill(input.imageUrls[0])}]) assert.throws(()=>motionInput({...input,...patch},['https://media.example']));
});
test('requires matching request and playable completion; recognizes failure states',()=>{
 for(const status of ['queued','in_progress','failed','nsfw','canceled']) assert.equal(normalizeStatus({request_id:'job',status},'job').status,status);
 assert.throws(()=>normalizeStatus({request_id:'other',status:'completed'},'job'));
 assert.throws(()=>normalizeStatus({request_id:'job',status:'completed'},'job'));
 assert.equal(normalizeStatus({request_id:'job',status:'completed',video:{url:'https://media.example/out.mp4'}},'job').videoUrl,'https://media.example/out.mp4');
});
test('stable idempotency header, bounded request and trusted polling URL',async()=>{
 const calls=[];
 const provider=createVideoProvider({credentials:'test:key',fetchImpl:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>({request_id:'job',status_url:'https://api.higgsfield.ai/requests/job/status'})}}});
 await provider.submit(motionInput(input,['https://media.example']),'stable_job_key_123');
 assert.equal(calls[0].opts.headers['Idempotency-Key'],'stable_job_key_123');
 assert.equal(calls[0].opts.redirect,'error');
 await assert.rejects(()=>provider.status({requestId:'job',statusUrl:'https://evil.example/requests/job/status'}));
 assert.equal(calls.length,1);
});
test('does not retry ambiguous paid submissions or expose provider bodies',async()=>{
 let count=0;
 const provider=createVideoProvider({credentials:'test:key',fetchImpl:async()=>{count++;return {ok:false,status:503,json:()=>{throw Error('must not read body')}}}});
 await assert.rejects(()=>provider.submit({},'stable_job_key_123'),{message:'Provider request failed',status:503});
 assert.equal(count,1);
});
