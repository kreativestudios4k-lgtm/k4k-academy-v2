import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePayFirstGeneration} from '../lib/server/pay-first-gate.mjs';
const ready={generationEnabled:true,paymentVerified:true,entitlementActive:true,
 mediaVerified:true,creditLedgerReady:true,atomicReservationReady:true,providerBalanceVerified:true,
 quotedCredits:20,availableCredits:100,providerMaxCostMinor:150,providerAvailableMinor:500,
 providerRemainingBudgetMinor:300,globalRemainingBudgetMinor:500,
 idempotencyReady:true,requestOwnershipVerified:true};
test('gates launch by default',()=>assert.equal(evaluatePayFirstGeneration({}).allowed,false));
test('accepts verified and prefunded request for atomic reservation',()=>assert.equal(evaluatePayFirstGeneration(ready).allowed,true));
for(const [field,value,reason] of [
 ['generationEnabled',false,'generation_disabled'],['paymentVerified',false,'payment_unverified'],
 ['entitlementActive',false,'payment_unverified'],['mediaVerified',false,'media_unverified'],
 ['creditLedgerReady',false,'ledger_unavailable'],['atomicReservationReady',false,'ledger_unavailable'],
 ['providerBalanceVerified',false,'provider_balance_unknown'],['availableCredits',10,'insufficient_credits'],
 ['providerAvailableMinor',100,'provider_prefund_required'],['providerRemainingBudgetMinor',100,'spending_cap'],
 ['globalRemainingBudgetMinor',100,'spending_cap'],['idempotencyReady',false,'unverified_request'],
 ['requestOwnershipVerified',false,'unverified_request']]) {
 test('rejects '+field,()=>assert.equal(evaluatePayFirstGeneration({...ready,[field]:value}).reason,reason));
}
test('rejects negative and noninteger prices',()=>{
 assert.equal(evaluatePayFirstGeneration({...ready,providerMaxCostMinor:-1}).allowed,false);
 assert.equal(evaluatePayFirstGeneration({...ready,quotedCredits:20.5}).allowed,false);
});
