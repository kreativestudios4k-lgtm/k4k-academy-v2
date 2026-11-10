import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiggsfieldStatusLookup} from '../lib/server/higgsfield-status-lookup.mjs';
import {createGenerationProviderStatusAdapter} from '../lib/server/generation-provider-status-adapter.mjs';
import {createGenerationProviderMediaAdapter} from '../lib/server/generation-provider-media-adapter.mjs';
import {createGenerationOutputIngestor} from '../lib/server/generation-output-ingestion.mjs';
import {createGenerationOutputCoordinator} from '../lib/server/generation-output-coordinator.mjs';
import {createGenerationOutputReconciler} from '../lib/server/generation-output-reconciler.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
const providerJobId='request_123';
const ids={userId,jobId,providerJobId};
const bytes=new Uint8Array(2048);
bytes.set([0,0,0,24,102,116,121,112,105,115,111,109],0);
function build({status='completed',providerResponseId=providerJobId,uploadError=null,owner=userId}={}){
 const events=[];
 const lookup=createHiggsfieldStatusLookup({enabled:true,apiKey:'mock-only',fetchImpl:async()=>{events.push('provider-status');return {ok:true,json:async()=>({request_id:providerResponseId,status})}}});
 const getStatus=createGenerationProviderStatusAdapter({enabled:true,lookup});
 const retrieve=createGenerationProviderMediaAdapter({enabled:true,download:async()=>{events.push('provider-media');return {bytes,contentType:'video/mp4'}}});
 const ingest=createGenerationOutputIngestor({enabled:true,storage:{from:()=>({upload:async()=>{events.push('private-upload');return {error:uploadError}}})}});
 const jobStore={getOwnedJob:async()=>({user_id:owner,id:jobId,provider_job_id:providerJobId,status:'processing'})};
 const completeWithBytes=createGenerationOutputCoordinator({enabled:true,jobStore,ingest,pipeline:{complete:async()=>{events.push('settle');return {status:'settled'}}}});
 const reconcile=createGenerationOutputReconciler({enabled:true,authorizeJob:async({userId:u,jobId:j,providerJobId:p})=>{events.push('owner');const job=await jobStore.getOwnedJob(u,j);return !!job&&job.user_id===u&&job.id===j&&job.provider_job_id===p&&['queued','processing'].includes(job.status)},getStatus,retrieve,completeWithBytes});
 return {reconcile,events};
}
test('mock provider completion -> verified media -> private upload -> settlement',async()=>{
 const {reconcile,events}=build();
 assert.deepEqual(await reconcile(ids),{status:'settled'});
 assert.deepEqual(events,['owner','provider-status','provider-media','private-upload','settle']);
});
test('pending provider response never downloads or settles',async()=>{
 const {reconcile,events}=build({status:'in_progress'});
 assert.deepEqual(await reconcile(ids),{status:'pending'});
 assert.deepEqual(events,['owner','provider-status']);
});
test('failed provider response never settles automatically',async()=>{
 const {reconcile,events}=build({status:'failed'});
 assert.deepEqual(await reconcile(ids),{status:'provider_failed_review_required'});
 assert.deepEqual(events,['owner','provider-status']);
});
test('provider request mismatch blocks all downstream effects',async()=>{
 const {reconcile,events}=build({providerResponseId:'other'});
 await assert.rejects(reconcile(ids),/HIGGSFIELD_STATUS_MISMATCH/);
 assert.deepEqual(events,['owner','provider-status']);
});
test('cross-user job mismatch blocks provider calls and settlement',async()=>{
 const {reconcile,events}=build({owner:'99999999-9999-4999-8999-999999999999'});
 await assert.rejects(reconcile(ids),/JOB_OWNERSHIP_OR_PROVIDER_MISMATCH/);
 assert.deepEqual(events,['owner']);
});
test('private upload error blocks settlement',async()=>{
 const {reconcile,events}=build({uploadError:{message:'already exists'}});
 await assert.rejects(reconcile(ids),/OUTPUT_UPLOAD_FAILED/);
 assert.deepEqual(events,['owner','provider-status','provider-media','private-upload']);
});
