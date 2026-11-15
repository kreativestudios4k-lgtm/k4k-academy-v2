// Staged launch offer. Activation requires reviewed funding and entitlement checks.
export const LAUNCH_MONTHLY_CREDITS=Object.freeze({starter:150,creator:250,pro:550,studio:1150});
export const LAUNCH_FIRST_MONTH_CREDITS=Object.freeze({starter:225,creator:375,pro:825,studio:1725});
export const LAUNCH_STARTER_GBP_MINOR=1999;
export const LAUNCH_PROMOTION_BUDGET=Object.freeze({totalUsd:200,freeVideoUsd:70,bonusUsd:70,reserveUsd:60,maxPaidBonusClaims:100});
export const LAUNCH_FREE_VIDEO=Object.freeze({maxClaims:100,seconds:5,model:'lite',resolution:'720p',estimatedUsd:0.70,budgetUsd:70,watermark:'Made with K4K APP'});
export function launchInvoiceCredits(plan,reason,env=process.env){
 if(env.K4K_LAUNCH_CREDIT_OFFER!=='true')return null;
 // First-month bonus requires a separate atomic, funded claim. Never grant it merely on subscription creation.
 if(reason==='subscription_create')return LAUNCH_MONTHLY_CREDITS[plan]??null;
 if(reason==='subscription_cycle')return LAUNCH_MONTHLY_CREDITS[plan]??null;
 return null;
}
