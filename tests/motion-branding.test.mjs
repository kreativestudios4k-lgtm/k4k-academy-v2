import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTION_ENGINES,inspectMotionInputs,estimateProviderUsdMills} from '../lib/motion-preview.mjs';
const sample={video:{type:'video/mp4',size:12345},image:{type:'image/png',size:1234},durationSeconds:5,mode:'replace',engine:'wan'};
test('all customer-facing model names are K4K branded',()=>{
 for(const item of Object.values(MOTION_ENGINES)) assert.match(item.label,/^K4K /);
 assert.deepEqual(Object.values(MOTION_ENGINES).map(x=>x.label),['K4K Create','K4K Motion Lite','K4K Motion Pro']);
});
test('K4K Create uses reference-to-video model internally and never claims own inference',()=>{
 const m=inspectMotionInputs(sample).manifest;
 assert.equal(m.engine,'alibaba/wan-3.0-prime/reference-to-video');
 assert.equal(m.requiresProviderPayment,true);
 assert.equal(m.execution,'dry-run-only');
 assert.equal(m.estimatedChargeGbpPence,0);
 assert.equal(estimateProviderUsdMills('wan',5),null);
});
