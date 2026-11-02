// Preview-only decision gate. Server-side callers must independently verify all
// payment, entitlement and budget facts from trusted records. Never accept flags
// from browser requests. This module intentionally performs no network calls.
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
export function evaluatePayFirstGeneration(facts) {
 if (!facts || typeof facts !== 'object') return {allowed:false,reason:'invalid_context'};
 if (facts.generationEnabled !== true) return {allowed:false,reason:'generation_disabled'};
 if (facts.paymentVerified !== true || facts.entitlementActive !== true) return {allowed:false,reason:'payment_unverified'};
 if (facts.mediaVerified !== true) return {allowed:false,reason:'media_unverified'};
 if (facts.creditLedgerReady !== true || facts.atomicReservationReady !== true) return {allowed:false,reason:'ledger_unavailable'};
 if (facts.providerBalanceVerified !== true) return {allowed:false,reason:'provider_balance_unknown'};
 const {quotedCredits,availableCredits,providerMaxCostMinor,providerAvailableMinor,
         providerRemainingBudgetMinor,globalRemainingBudgetMinor}=facts;
 if (![quotedCredits,availableCredits,providerMaxCostMinor,providerAvailableMinor,
       providerRemainingBudgetMinor,globalRemainingBudgetMinor].every(Number.isSafeInteger) ||
     !positiveInteger(quotedCredits) || !positiveInteger(providerMaxCostMinor)) {
  return {allowed:false,reason:'invalid_quote'};
 }
 if (availableCredits < quotedCredits) return {allowed:false,reason:'insufficient_credits'};
 if (providerAvailableMinor < providerMaxCostMinor) return {allowed:false,reason:'provider_prefund_required'};
 if (providerRemainingBudgetMinor < providerMaxCostMinor ||
     globalRemainingBudgetMinor < providerMaxCostMinor) return {allowed:false,reason:'spending_cap'};
 if (facts.idempotencyReady !== true || facts.requestOwnershipVerified !== true) return {allowed:false,reason:'unverified_request'};
 return {allowed:true,reason:'ready_for_atomic_reservation'};
}
