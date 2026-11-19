// ONLY for Stripe TEST / disposable-db QA; never pass to production checkout.
// All three IDs were verified as Stripe test-mode objects on 19 Nov 2026.
export const V2_SANDBOX_PRICE_CONTRACTS=Object.freeze({
 starterGBP:Object.freeze({priceId:'price_1UdcNHL7fmdMaK0kLEIj5I1W',productId:'prod_VaK2VbZjqew9D9',kind:'subscription_invoice',
  plan:'starter',currency:'GBP',amountMinor:1599,credits:420}),
 creatorBRL:Object.freeze({priceId:'price_1UdcNUL7fmdMaK0kHJd1aMUZ',productId:'prod_VaK2Yk913XdfC8',kind:'subscription_invoice',
  plan:'creator',currency:'BRL',amountMinor:22490,credits:840}),
 singleGBP:Object.freeze({priceId:'price_1UdcNeL7fmdMaK0kied8fy2S',productId:'prod_VewGOPGFDFUj9t',kind:'single_video_payment',
  plan:null,currency:'GBP',amountMinor:599,credits:140})
});
export function sandboxContractForPrice(priceId){
 return Object.values(V2_SANDBOX_PRICE_CONTRACTS).find(p=>p.priceId===priceId)||null;
}
export function sandboxPriceAllowed(priceId,kind){
 const p=sandboxContractForPrice(priceId);
 return p?.kind===kind?p:null;
}
export const V2_SANDBOX_RPC_NAME='k4k_v2_grant_paid_test';
// A misconfigured server MUST NOT silently use the LIVE grant function in test.
export function assertV2SandboxRuntime(env=process.env){
 if(env.VERCEL_ENV==='production'||env.K4K_V2_SANDBOX_ADAPTER_ENABLED!=='true'||
    env.K4K_V2_SANDBOX_PROJECT_ISOLATED!=='true')
  throw Error('V2_SANDBOX_ONLY');
 return true;
}
