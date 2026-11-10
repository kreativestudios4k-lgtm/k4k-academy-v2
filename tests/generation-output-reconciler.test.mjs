import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationOutputReconciler} from '../lib/server/generation-output-reconciler.mjs';
const ids={userId:'11111111-1111-4111-8111-111111111111',jobId:'22222222-2222-4222-8222-222222222222',providerJobId:'provider-1'};
const bytes=new Uint8Array(2048);
function harness(status='completed',enabled=true){
 const calls=[];
 const reconcile=createGenerationOutputReconciler({enabled,
  authorizeJob:async()=>{calls.push('owner');return true},
  getStatus:async({providerJobId})=>{calls.push('status');return {providerJobId,status}},
  retrieve:async()=>{calls.push('media');return {bytes,contentType:'video/mp4'}},
  completeWithBytes:async args=>{calls.push('complete');assert.equal(args.bytes,bytes);return {status:'settled'}}
 });
 return {reconcile,calls};
}
test('disabled reconciliation performs no calls',async()=>{const {reconcile,calls}=harness('completed',false);await assert.rejects(reconcile(ids),/OUTPUT_RECONCILIATION_DISABLED/);assert.deepEqual(calls,[])});
test('completed job runs status then media then completion',async()=>{const {reconcile,calls}=harness();assert.deepEqual(await reconcile(ids),{status:'settled'});assert.deepEqual(calls,['owner','status','media','complete'])});
test('pending job never downloads or settles',async()=>{for(const state of ['queued','processing']){const {reconcile,calls}=harness(state);assert.deepEqual(await reconcile(ids),{status:'pending'});assert.deepEqual(calls,['owner','status'])}});
test('failed provider job requires review, no automatic refund',async()=>{const {reconcile,calls}=harness('failed');assert.deepEqual(await reconcile(ids),{status:'provider_failed_review_required'});assert.deepEqual(calls,['owner','status'])});
test('mismatched provider response never downloads',async()=>{
 let mediaCalled=false;
 const reconcile=createGenerationOutputReconciler({enabled:true,authorizeJob:async()=>true,getStatus:async()=>({providerJobId:'other',status:'completed'}),retrieve:async()=>{mediaCalled=true},completeWithBytes:async()=>{}});
 await assert.rejects(reconcile(ids),/PROVIDER_JOB_MISMATCH/);
 assert.equal(mediaCalled,false);
});
test('invalid media cannot settle',async()=>{
 let settled=false;
 const reconcile=createGenerationOutputReconciler({enabled:true,authorizeJob:async()=>true,getStatus:async()=>({providerJobId:ids.providerJobId,status:'completed'}),retrieve:async()=>({bytes:'not-bytes',contentType:'video/mp4'}),completeWithBytes:async()=>{settled=true}});
 await assert.rejects(reconcile(ids),/INVALID_PROVIDER_MEDIA/);
 assert.equal(settled,false);
});
