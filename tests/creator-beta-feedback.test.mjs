import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCreatorFeedback} from '../lib/server/creator-beta-feedback.mjs';
import {getGenerationBetaGate} from '../lib/server/generation-beta-gate.mjs';
const ids=Array.from({length:11},(_,i)=>`${String(i+1).padStart(8,'0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`);
test('ten invited creators fit cohort cap',()=>{
 const g=getGenerationBetaGate({K4K_GENERATION_BETA_ENABLED:'true',K4K_GENERATION_E2E_VERIFIED:'true',K4K_GENERATION_BETA_USER_IDS:ids.slice(0,10).join(',')});
 assert.equal(g.invitedCount,10);
 assert.equal(g.authorize({userId:ids[0]}).allowed,true);
});
test('eleventh invited creator fails closed for everyone',()=>{
 const g=getGenerationBetaGate({K4K_GENERATION_BETA_ENABLED:'true',K4K_GENERATION_E2E_VERIFIED:'true',K4K_GENERATION_BETA_USER_IDS:ids.join(',')});
 assert.equal(g.authorize({userId:ids[0]}).reason,'BETA_COHORT_LIMIT_EXCEEDED');
});
test('valid feedback is trimmed and restricted to known categories',()=>{
 assert.deepEqual({...validateCreatorFeedback({category:'bug',message:'  Generation stuck after upload  '})},
 {category:'bug',message:'Generation stuck after upload',jobId:null});
 assert.throws(()=>validateCreatorFeedback({category:'admin',message:'This is a sample message'}),/category/);
});
test('feedback rejects short text and invalid job references',()=>{
 assert.throws(()=>validateCreatorFeedback({category:'bug',message:'short'}),/10–2000/);
 assert.throws(()=>validateCreatorFeedback({category:'bug',message:'Generation failed after upload',jobId:'other-user-job'}),/job ID/);
});
