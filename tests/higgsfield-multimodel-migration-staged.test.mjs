import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 HIGGSFIELD_MIGRATION_CANDIDATES,
 higgsfieldMigrationStatus,
 assertHiggsfieldMigrationDispatchReady
} from '../lib/server/higgsfield-multimodel-migration.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('five K4K enabled model names have a provider-migration audit record',()=>{
 const ids=['wan-prime','seedance_2_5','kling4_0','nano_banana_2','flux_3_image'];
 assert.deepEqual(Object.keys(HIGGSFIELD_MIGRATION_CANDIDATES),ids);
 for(const id of ids){
  const item=higgsfieldMigrationStatus(id);
  assert.equal(item.id,id);
  assert.equal(item.currentProvider,'fal');
  assert.equal(item.targetProvider,'higgsfield');
  assert.equal(item.canDispatch,false);
  assert.throws(()=>assertHiggsfieldMigrationDispatchReady(id),/HIGGSFIELD_MIGRATION_NOT_LIVE/);
 }
});
test('only officially documented public REST model paths are recorded',()=>{
 assert.equal(higgsfieldMigrationStatus('wan-prime').documentedApiPath,'alibaba/wan-3.0-prime/reference-to-video');
 assert.equal(higgsfieldMigrationStatus('seedance_2_5').documentedApiPath,'bytedance/seedance-2.5/text-to-video');
 assert.equal(higgsfieldMigrationStatus('kling4_0').documentedApiPath,'kling-video/v4.0/text-to-video');
 for(const id of ['nano_banana_2','flux_3_image']){
  assert.equal(higgsfieldMigrationStatus(id).documentedApiPath,null);
  assert.equal(higgsfieldMigrationStatus(id).status,'endpoint-not-verified');
 }
});
test('no runtime flag can turn on new spending without approved billing integration',()=>{
 assert.equal(higgsfieldMigrationStatus('unknown-model').canDispatch,false);
 assert.throws(()=>assertHiggsfieldMigrationDispatchReady('unknown-model'),/HIGGSFIELD_MODEL_UNMAPPED/);
 for(const env of [true,false,'true','false']){
  process.env.K4K_HIGGSFIELD_MULTI_MODEL_DISPATCH=String(env);
  assert.throws(()=>assertHiggsfieldMigrationDispatchReady('kling4_0'),/HIGGSFIELD_MIGRATION_NOT_LIVE/);
 }
 delete process.env.K4K_HIGGSFIELD_MULTI_MODEL_DISPATCH;
});
test('live fal.ai customer credits, queue and output delivery remain unchanged',()=>{
 const route=read('app/api/creative/customer/route.js');
 const policy=read('lib/server/creative-customer-policy.mjs');
 assert.match(route,/provider:'fal'/);
 assert.match(route,/createMultimodelLedger/);
 assert.match(route,/createMultimodelPrivateDelivery/);
 assert.match(route,/k4k_multimodel_jobs/);
 assert.match(policy,/K4K_CREATIVE_CUSTOMER_MODELS/);
 assert.ok(!route.includes('higgsfield-multimodel-migration'));
});
