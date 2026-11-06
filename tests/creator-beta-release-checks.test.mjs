import test from 'node:test';
import assert from 'node:assert/strict';
import {getGenerationBetaGate} from '../lib/server/generation-beta-gate.mjs';
import {validateCreatorFeedback} from '../lib/server/creator-beta-feedback.mjs';

const ids=Array.from({length:11},(_,i)=>String(i+1).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
test('cohort limit accepts ten but rejects eleven',()=>{
 const env={K4K_GENERATION_BETA_ENABLED:'true',K4K_GENERATION_E2E_VERIFIED:'true',K4K_GENERATION_BETA_USER_IDS:ids.slice(0,10).join(',')};
 assert.equal(getGenerationBetaGate(env).authorize({userId:ids[0]}).allowed,true);
 const over=getGenerationBetaGate({...env,K4K_GENERATION_BETA_USER_IDS:ids.join(',')});
 assert.equal(over.authorize({userId:ids[0]}).reason,'BETA_COHORT_LIMIT_EXCEEDED');
});
test('generation billing stays disabled for invited creators',()=>{
 const env={K4K_GENERATION_BETA_ENABLED:'true',K4K_GENERATION_E2E_VERIFIED:'true',K4K_GENERATION_BETA_USER_IDS:ids[0]};
 assert.equal(getGenerationBetaGate(env).authorize({userId:ids[0],billable:true}).reason,'BILLABLE_GENERATION_DISABLED');
});
test('feedback accepts valid messages and rejects malformed input',()=>{
 assert.equal(validateCreatorFeedback({category:'bug',message:'  Video upload failed  '}).message,'Video upload failed');
 assert.throws(()=>validateCreatorFeedback({category:'spam',message:'This is a sufficiently long message'}));
 assert.throws(()=>validateCreatorFeedback({category:'bug',message:'too short'}));
 assert.throws(()=>validateCreatorFeedback({category:'bug',message:'This message is long enough',jobId:'not-a-uuid'}));
});
