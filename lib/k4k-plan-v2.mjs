// K4K creator plan v2: isolated, test-only catalogue. Do not mutate legacy plan prices.
export const K4K_PLAN_CATALOG_VERSION='creator_2026_v2';
export const K4K_V2_PLANS=Object.freeze({
 starter:Object.freeze({key:'starter',name:'Starter',gbpMinor:1599,credits:400,concurrency:1,description:'Start creating confidently',priceId:'price_1UcaJsL7fmdMaK0kLOS4WqvG'}),
 creator:Object.freeze({key:'creator',name:'Creator',gbpMinor:3499,credits:1100,concurrency:2,description:'Create consistently',priceId:'price_1UcaJuL7fmdMaK0k60EvDs51'}),
 pro:Object.freeze({key:'pro',name:'Pro',gbpMinor:6999,credits:2700,concurrency:3,description:'Grow your creative business',featured:true,priceId:'price_1UcaJwL7fmdMaK0kQResJvEm'}),
 studio:Object.freeze({key:'studio',name:'Studio',gbpMinor:13999,credits:6200,concurrency:4,description:'For teams and agencies',priceId:'price_1UcaJxL7fmdMaK0kOmNUPsPD'}),
});
export const K4K_V2_PRICE_TO_PLAN=Object.freeze(Object.fromEntries(Object.values(K4K_V2_PLANS).map(p=>[p.priceId,p.key])));
export function v2PreviewAllowed(env=process.env){return env.VERCEL_ENV==='preview'&&env.K4K_PLAN_V2_PREVIEW==='true'}
export function v2PriceEntitlement(priceId,{liveMode=false,env=process.env}={}){
 if(liveMode||!v2PreviewAllowed(env))return null;
 const key=K4K_V2_PRICE_TO_PLAN[priceId];return key?K4K_V2_PLANS[key]:null;
}
// One verified Stripe invoice adds a single allowance. Existing prices are not in this mapping.
export function v2InvoiceCredits(priceId,{liveMode=false,env=process.env}={}){
 return v2PriceEntitlement(priceId,{liveMode,env})?.credits??null;
}
// Upstream quote is required. Budget math is server-side and never accepts browser prices.
export const K4K_PROVIDER_COST_POLICY=Object.freeze({
 maxProviderUsdPerCredit:0.016,
 maxProviderUsdPerJob:5, // existing ledger's hard ceiling until audited higher-cost migration
 minGrossMarginTarget:0.30,
});
export function safeV2GenerationQuote({verifiedProviderUsd,verifiedProviderQuote=false,customerCredits,accounting=false}={}){
 if(verifiedProviderQuote!==true||!Number.isFinite(verifiedProviderUsd)||verifiedProviderUsd<=0)
  throw Error('PROVIDER_QUOTE_REQUIRED');
 if(verifiedProviderUsd>K4K_PROVIDER_COST_POLICY.maxProviderUsdPerJob)throw Error('PROVIDER_BUDGET_BLOCKED');
 // Strict decimal arithmetic in micro USD; round UP to avoid underestimated costs.
 const micros=Math.ceil(verifiedProviderUsd*1e6);
 const credits=Math.ceil(micros/(K4K_PROVIDER_COST_POLICY.maxProviderUsdPerCredit*1e6));
 if(!Number.isSafeInteger(credits)||credits<1||credits>10000)throw Error('INVALID_CREDIT_QUOTE');
 if(customerCredits!==undefined&&(!Number.isSafeInteger(customerCredits)||customerCredits<credits))throw Error('INSUFFICIENT_CREDITS');
 return Object.freeze({credits,providerUsdMicros:micros,providerUsd:micros/1e6,budgetLimitUsd:K4K_PROVIDER_COST_POLICY.maxProviderUsdPerJob,quoteVerified:true});
}

/**
 * Gross contribution stress test, NOT a production tax calculator.
 * gbpPerUsd must be a recent, approved settlement quote (no fixed FX assumption).
 * Include tax, fees, discount and affiliate commission independently.
 */
export function stressV2Plan(key,{gbpPerUsd,creditUse=1,vatRate=0.20,paymentRate=0.015,paymentFixedGbp=0.20,discountRate=0,affiliateRate=0}={}){
 const plan=K4K_V2_PLANS[key];if(!plan)throw Error('INVALID_PLAN');
 for(const n of [gbpPerUsd,creditUse,vatRate,paymentRate,paymentFixedGbp,discountRate,affiliateRate])if(!Number.isFinite(n)||n<0)throw Error('INVALID_STRESS_INPUT');
 if(gbpPerUsd<0.5||gbpPerUsd>1.5||creditUse>1||vatRate>0.3||paymentRate>0.1||paymentFixedGbp>2||discountRate>0.3||affiliateRate>0.3)throw Error('INVALID_STRESS_INPUT');
 const grossGbp=plan.gbpMinor/100;
 const paidGbp=grossGbp*(1-discountRate);
 const netGbp=paidGbp/(1+vatRate);
 const feesGbp=paidGbp*paymentRate+paymentFixedGbp;
 const affiliateGbp=paidGbp*affiliateRate;
 const providerGbp=plan.credits*creditUse*K4K_PROVIDER_COST_POLICY.maxProviderUsdPerCredit*gbpPerUsd;
 const contributionGbp=netGbp-feesGbp-affiliateGbp-providerGbp;
 const contributionMargin=netGbp>0?contributionGbp/netGbp:-Infinity;
 return Object.freeze({grossGbp,netGbp,feesGbp,affiliateGbp,providerGbp,contributionGbp,contributionMargin,launchMarginPass:contributionMargin>=K4K_PROVIDER_COST_POLICY.minGrossMarginTarget});
}
