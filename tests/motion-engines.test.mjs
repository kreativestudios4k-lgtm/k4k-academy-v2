import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTION_ENGINES,estimateProviderUsdMills,inspectMotionInputs} from '../lib/motion-preview.mjs';
const sample={video:{type:'video/mp4',size:12345},image:{type:'image/png',size:1234},durationSeconds:5,mode:'replace',prompt:'Keep motion'};
test('three engines are available with stable identifiers',()=>{assert.deepEqual(Object.keys(MOTION_ENGINES),['wan','light','pro']);});
test('WAN never claims free inference',()=>{assert.equal(estimateProviderUsdMills('wan',5),null);});
test('Genjutsu Light 720p conservative estimate includes output and reference duration',()=>{assert.equal(estimateProviderUsdMills('light',5),1000);assert.equal(estimateProviderUsdMills('light',5.1),1200);});
test('Genjutsu Pro list-price cost rounds input seconds up',()=>{assert.equal(estimateProviderUsdMills('pro',5),3405);assert.equal(estimateProviderUsdMills('pro',5.01),4086);});
test('manifest never activates paid rendering or charges customer',()=>{
 for(const engine of ['wan','light','pro']){
  const r=inspectMotionInputs({...sample,engine});
  assert.equal(r.ok,true);assert.equal(r.manifest.engine,MOTION_ENGINES[engine].model);
  assert.equal(r.manifest.execution,'dry-run-only');assert.equal(r.manifest.estimatedChargeGbpPence,0);
 }
});
test('unknown engine and unsafe duration are rejected',()=>{
 assert.equal(inspectMotionInputs({...sample,engine:'unknown'}).ok,false);
 assert.throws(()=>estimateProviderUsdMills('unknown',5));
 assert.throws(()=>estimateProviderUsdMills('pro',11));
});
