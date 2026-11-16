// One bounded gift for the immutable existing-user cohort. Never trust a client duration.
export const EARLY_FREE_MAX_SECONDS=15;
export const EARLY_FREE_MAX_USD=2.10;
export function earlyFreeQuoteAllowed({production,verifiedEmail,sourceSeconds,usd,entitlement}={}){
 return production===true&&verifiedEmail===true&&Number.isFinite(sourceSeconds)&&sourceSeconds>=2&&sourceSeconds<=EARLY_FREE_MAX_SECONDS&&Number.isFinite(usd)&&usd>0&&usd<=EARLY_FREE_MAX_USD&&entitlement?.status==='available'&&Number.isInteger(entitlement.attempts)&&entitlement.attempts>=0&&entitlement.attempts<2;
}
export function earlyFreeSubmissionAllowed({production,verifiedEmail,sourceSeconds,usd}={}){
 return earlyFreeQuoteAllowed({production,verifiedEmail,sourceSeconds,usd,entitlement:{status:'available',attempts:0}});
}
