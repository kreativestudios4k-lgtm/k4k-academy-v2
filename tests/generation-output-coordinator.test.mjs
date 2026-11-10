import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationOutputCoordinator} from '../lib/server/generation-output-coordinator.mjs';
const userId='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
const providerJobId='provider-1';
const valid={userId,jobId,providerJobId,bytes:new Uint8Array(2048),providerStatus:'completed'};
function harness({enabled=true,jobOverride={}}={}){
 const calls=[];
 const job={user_id:userId,id:jobId,provider_job_id:providerJobId,status:'processing',...jobOverride};
 const coordinator=createGenerationOutputCoordinator({
  enabled,jobStore:{getOwnedJob:async()=>job},
  ingest:async args=>{calls.push(['ingest',args]);return {outputPath:userId+'/'+jobId+'.mp4'}},
  pipeline:{complete:async args=>{calls.push(['complete',args]);return {status:'settled'}}}
 });
 return {coordinator,calls};
}
test('disabled by default prevents ingestion',async()=>{const {coordinator,calls}=harness({enabled:false});await assert.rejects(coordinator(valid),/OUTPUT_COORDINATION_DISABLED/);assert.equal(calls.length,0)});
test('rejects unconfirmed provider state',async()=>{const {coordinator,calls}=harness();await assert.rejects(coordinator({...valid,providerStatus:'processing'}),/PROVIDER_NOT_COMPLETED/);assert.equal(calls.length,0)});
test('rejects mismatched provider and completed jobs before upload',async()=>{for(const jobOverride of [{provider_job_id:'other'},{status:'completed'}]){const {coordinator,calls}=harness({jobOverride});await assert.rejects(coordinator(valid),/JOB_OWNERSHIP_OR_PROVIDER_MISMATCH/);assert.equal(calls.length,0)}});
test('ingests before invoking completion',async()=>{const {coordinator,calls}=harness();assert.deepEqual(await coordinator(valid),{status:'settled'});assert.deepEqual(calls.map(x=>x[0]),['ingest','complete']);assert.equal(calls[1][1].outputPath,userId+'/'+jobId+'.mp4')});
