import test from 'node:test';
import assert from 'node:assert/strict';
import {getGenerationBetaGate} from '../lib/server/generation-beta-gate.mjs';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('beta generation is disabled by default',()=>{
 assert.equal(getGenerationBetaGate({}).authorize({userId:id}).allowed,false);
});
test('unverified provider flow remains disabled even when toggled on',()=>{
 const gate=getGenerationBetaGate({K4K_GENERATION_BETA_ENABLED:'true',K4K_GENERATION_BETA_USER_IDS:id});
 assert.equal(gate.authorize({userId:id}).reason,'GENERATION_NOT_VERIFIED');
});
test('beta access is restricted to explicit UUID allowlist',()=>{
 const gate=getGenerationBetaGate({K4K_GENERATION_BETA_ENABLED:'true',K4K_GENERATION_E2E_VERIFIED:'true',K4K_GENERATION_BETA_USER_IDS:id});
 assert.equal(gate.authorize({userId:id}).allowed,true);
 assert.equal(gate.authorize({userId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}).allowed,false);
 assert.equal(gate.authorize({userId:id,billable:true}).reason,'BILLABLE_GENERATION_DISABLED');
});
test('billable generation requires separate explicit approval switch',()=>{
 const gate=getGenerationBetaGate({K4K_GENERATION_BETA_ENABLED:'true',K4K_GENERATION_E2E_VERIFIED:'true',K4K_GENERATION_BILLABLE_ENABLED:'true',K4K_GENERATION_BETA_USER_IDS:id});
 assert.equal(gate.authorize({userId:id,billable:true}).allowed,true);
});
