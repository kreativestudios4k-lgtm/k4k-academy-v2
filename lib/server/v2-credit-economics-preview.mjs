// Review-only commercial model. This module never reads production environment
// variables, creates Stripe Checkout, or writes credits to Supabase.
// All fees, tax rates and FX inputs are SCENARIO ASSUMPTIONS, not legal tax determinations.
import {V2_MONTHLY_CREDITS} from './v2-live-price-policy.mjs';

// Option B is approved for future NEW V2 balances, not the existing ledger.
export const V2_APPROVED_PROVIDER_USD_PER_CREDIT=0.012;
export const V2_CREDIT_ECONOMICS_SCENARIOS=Object.freeze({
 previouslyConsideredOptionA:0.015, // historical rejected reference
 approvedOptionB:V2_APPROVED_PROVIDER_USD_PER_CREDIT,
 conservativeStressCandidate:V2_APPROVED_PROVIDER_USD_PER_CREDIT
});
const validMoney=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const validRatio=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;
export function quotedCreditsForProviderCost(providerUsd,providerUsdPerCredit){
 if(!validMoney(providerUsd)||!validMoney(providerUsdPerCredit)||providerUsdPerCredit>1)
  throw Error('INVALID_ECONOMICS_INPUT');
 const amount=Math.ceil(Math.round(providerUsd*1e6)/Math.round(providerUsdPerCredit*1e6));
 if(!Number.isSafeInteger(amount)||amount<1||amount>1000000)throw Error('INVALID_ECONOMICS_INPUT');
 return amount;
}
export function assessV2Contribution({
 grossAmountLocal,localUnitsPerUsd=1,credits,providerUsdPerCredit,
 includedTaxRate=0,processingPercent=0,processingFixedUsd=0,
 affiliatePercent=0,retryAndOverheadPercent=0,minimumNetContributionMargin=0.25
}={}){
 if(!validMoney(grossAmountLocal)||!validMoney(localUnitsPerUsd)
  ||!Number.isSafeInteger(credits)||credits<1||!validMoney(providerUsdPerCredit)
  ||![includedTaxRate,processingPercent,affiliatePercent,retryAndOverheadPercent,minimumNetContributionMargin].every(validRatio)
  ||!Number.isFinite(processingFixedUsd)||processingFixedUsd<0)
   throw Error('INVALID_ECONOMICS_INPUT');
 const collectedUsd=grossAmountLocal/localUnitsPerUsd;
 const netOfTaxUsd=collectedUsd/(1+includedTaxRate);
 const processingUsd=collectedUsd*processingPercent+processingFixedUsd;
 const affiliateUsd=collectedUsd*affiliatePercent;
 const providerUsd=credits*providerUsdPerCredit*(1+retryAndOverheadPercent);
 const contributionUsd=netOfTaxUsd-processingUsd-affiliateUsd-providerUsd;
 const marginOnNet=contributionUsd/netOfTaxUsd;
 return Object.freeze({
  collectedUsd,netOfTaxUsd,processingUsd,affiliateUsd,
  providerUsd,contributionUsd,marginOnNet,
  passesReviewThreshold:marginOnNet>=minimumNetContributionMargin
 });
}
export function forecastPlanProviderCap(plan,providerUsdPerCredit){
 const credits=V2_MONTHLY_CREDITS[plan];
 if(!Number.isSafeInteger(credits)||!validMoney(providerUsdPerCredit))throw Error('INVALID_PLAN');
 return credits*providerUsdPerCredit;
}
