import test from 'node:test';
import assert from 'node:assert/strict';
import {canConfirmGeneration,generationQuoteFeedback} from '../lib/generation-feedback.mjs';
import {generationAccountBlocker} from '../lib/server/generation-policy.mjs';
test('confirmation needs a current server-enabled quote with a valid customer credit amount',()=>{
 const ready={generationEnabled:true,quoteToken:'signed',customerCredits:14,reviewedAt:1000};
 assert.equal(canConfirmGeneration(ready,1001),true);
 assert.equal(canConfirmGeneration(ready,301000),false);
 assert.equal(canConfirmGeneration(ready,999),false);
 for(const changed of [{generationEnabled:false},{blocker:'PROVIDER_BUDGET_BLOCKED'},{quoteToken:null},{customerCredits:0},{customerCredits:null},{reviewedAt:NaN}])assert.equal(canConfirmGeneration({...ready,...changed},1001),false);
});
test('blocked quotes explain the test limit instead of inviting confirmation',()=>{
 const blocked={generationEnabled:false,blocker:'PROVIDER_BUDGET_BLOCKED',customerCredits:28};
 assert.match(generationQuoteFeedback(blocked),/Motion Lite · 720p/);
 assert.match(generationQuoteFeedback(blocked),/five-second reference/);
 assert.doesNotMatch(generationQuoteFeedback(blocked),/confirm below/);
 assert.match(generationQuoteFeedback(blocked,'pt'),/cinco segundos/);
 assert.match(generationQuoteFeedback(blocked,'es'),/cinco segundos/);
});
test('credit and billing blockers appear before offering generation, while reservation remains authoritative',()=>{
 assert.equal(generationAccountBlocker({balance:14,credits:28}),'INSUFFICIENT_CREDITS');
 assert.equal(generationAccountBlocker({balance:14,credits:14}),null);
 assert.equal(generationAccountBlocker({balance:100,credits:14,billingHold:true}),'BILLING_REVIEW_REQUIRED');
 assert.equal(generationAccountBlocker({balance:NaN,credits:14}),'INSUFFICIENT_CREDITS');
 assert.match(generationQuoteFeedback({blocker:'INSUFFICIENT_CREDITS',customerCredits:28,creditBalance:14}),/28 credits; your balance is 14/);
});
