import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationCoordinator} from '../lib/server/generation-coordinator.mjs';
const saved={id:'durable_job_123456',user_id:'owner',state:'submitting',input:{prompt:'saved'},provider_id:'provider123',provider_status_url:'https://api.higgsfield.ai/requests/provider123/status'};
test('ambiguous timeout retains reservation and retries with saved key/payload',async()=>{
 const calls=[];let refunds=0;
 const coordinator=createGenerationCoordinator({store:{reserve:async()=>saved,submitting:async()=>saved,settle:async()=>refunds++},provider:{submit:async(...args)=>{calls.push(args);throw Error('timeout')}}});
 for(let i=0;i<2;i++)await assert.rejects(coordinator.submit({userId:'owner',requestKey:'key',input:{prompt:'browser'},credits:1}));
 assert.deepEqual(calls,[[saved.input,saved.id],[saved.input,saved.id]]);assert.equal(refunds,0);
});
test('resuming a queued job never resubmits; failed verified poll goes to settlement',async()=>{
 let submits=0;const outcomes=[];const queued={...saved,state:'queued'};
 const coordinator=createGenerationCoordinator({store:{reserve:async()=>queued,read:async()=>queued,settle:async(...args)=>outcomes.push(args)},provider:{submit:async()=>submits++,status:async()=>({requestId:saved.provider_id,status:'failed',videoUrl:null})}});
 await coordinator.submit({userId:'owner'});await coordinator.refresh({userId:'owner',jobId:saved.id});
 assert.equal(submits,0);assert.deepEqual(outcomes,[['owner',saved.id,saved.provider_id,'failed',null]]);
});
test('wrong owner is rejected before provider polling',async()=>{
 let polls=0;const coordinator=createGenerationCoordinator({store:{read:async()=>({...saved,state:'queued'})},provider:{status:async()=>polls++}});
 await assert.rejects(coordinator.refresh({userId:'other',jobId:saved.id}),/Job not found/);assert.equal(polls,0);
});
test('accepted provider request with failed persistence is not refunded',async()=>{
 let refunds=0;const coordinator=createGenerationCoordinator({store:{reserve:async()=>saved,submitting:async()=>saved,attach:async()=>{throw Error('database unavailable')},settle:async()=>refunds++},provider:{submit:async()=>({requestId:'p',statusUrl:'https://api.higgsfield.ai/requests/p/status'})}});
 await assert.rejects(coordinator.submit({userId:'owner'}));assert.equal(refunds,0);
});
