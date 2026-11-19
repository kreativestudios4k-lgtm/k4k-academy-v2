// Verified 19 November 2026 against K4KAPP Stripe LIVE, including 10 EUR/USD .99 prices. Data only; never creates charges.
// These IDs are immutable; launch and legacy subscribers retain original subscription prices.
const freezeNested = value => Object.freeze(Object.fromEntries(Object.entries(value).map(([key, row])=>[key,Object.freeze(row)])));
export const V2_LIVE_PLAN_PRICES=freezeNested({
 starter:{GBP:'price_1UdblmL7fmdMaK0kyknLHpoV',EUR:'price_1UddzFL7fmdMaK0kzN2sF4mq',USD:'price_1UddzcL7fmdMaK0khce6RBqF',BRL:'price_1UdaN4L7fmdMaK0kyZ7ri7fR'},
 creator:{GBP:'price_1UdaN5L7fmdMaK0kR6bEi94p',EUR:'price_1UddzeL7fmdMaK0k3IQHJbl1',USD:'price_1UddzhL7fmdMaK0kiA3ZSb62',BRL:'price_1UdaNDL7fmdMaK0kGnfYnT0n'},
 pro:{GBP:'price_1UdaNML7fmdMaK0k0d6JK9J7',EUR:'price_1UddzjL7fmdMaK0kCPzo3pQv',USD:'price_1Ude03L7fmdMaK0kuN8hI153',BRL:'price_1UdaNRL7fmdMaK0kJ8PEQMVW'},
 studio:{GBP:'price_1UdaNSL7fmdMaK0kgAea7tD5',EUR:'price_1Ude05L7fmdMaK0kszKPnctk',USD:'price_1Ude07L7fmdMaK0kQlPm0v1c',BRL:'price_1UdaNWL7fmdMaK0kXu7oPXfl'}
});
export const V2_LIVE_PLAN_MINOR=freezeNested({
 starter:{GBP:1599,EUR:1899,USD:2099,BRL:11990},
 creator:{GBP:2999,EUR:3599,USD:3999,BRL:22490},
 pro:{GBP:5999,EUR:7199,USD:7899,BRL:44990},
 studio:{GBP:11999,EUR:14399,USD:15799,BRL:89990}
});
// Historical V2 EUR/USD Prices remain valid for invoice retries, refunds and
// any future grandfathered renewal. NEVER interpret them using new .99 amounts.
// They are not selected for NEW Checkout; only current V2_LIVE_PLAN_PRICES is.
export const V2_PRIOR_EUR_USD_PLAN_PRICES=freezeNested({
 starter:{EUR:'price_1UdaMfL7fmdMaK0kqWMennAm',USD:'price_1UdaN2L7fmdMaK0kHJO5BRFg'},
 creator:{EUR:'price_1UdaNAL7fmdMaK0k3i1tog2r',USD:'price_1UdaNCL7fmdMaK0k760pW6Ru'},
 pro:{EUR:'price_1UdaNNL7fmdMaK0kYtOCZ3M3',USD:'price_1UdaNPL7fmdMaK0kWUbY9EMm'},
 studio:{EUR:'price_1UdaNTL7fmdMaK0kwUBoqHuY',USD:'price_1UdaNVL7fmdMaK0ki3bcblsG'}
});
export const V2_PRIOR_EUR_USD_PLAN_MINOR=freezeNested({
 starter:{EUR:1909,USD:2095},
 creator:{EUR:3580,USD:3930},
 pro:{EUR:7162,USD:7861},
 studio:{EUR:14325,USD:15724}
});
export const V2_MONTHLY_CREDITS=Object.freeze({starter:420,creator:840,pro:1680,studio:3360});
export const PRESERVED_LIVE_PLAN_PRICES=freezeNested({
 starter:{GBP:'price_1UbQB0L7fmdMaK0kr3CRE9bd',EUR:'price_1UbQBCL7fmdMaK0kAmHSt8oc',USD:'price_1UbQBAL7fmdMaK0k2PtIGUDU',BRL:'price_1UbQBEL7fmdMaK0kkRXES0y8'},
 creator:{GBP:'price_1UbQBGL7fmdMaK0kyhgxVU9w',EUR:'price_1UbQBKL7fmdMaK0k9CuYbDtY',USD:'price_1UbQBIL7fmdMaK0kvPP4ELUs',BRL:'price_1UbQBML7fmdMaK0kkIunXMjA'},
 pro:{GBP:'price_1UbQBNL7fmdMaK0kBB6ZEr3O',EUR:'price_1UbQBRL7fmdMaK0kRfntDIbU',USD:'price_1UbQBPL7fmdMaK0k3wkJPtf4',BRL:'price_1UbQBTL7fmdMaK0kbcIEDUWl'},
 studio:{GBP:'price_1UbQBVL7fmdMaK0ksiiSqCXk',EUR:'price_1UbQBZL7fmdMaK0k10bEKbZ9',USD:'price_1UbQBXL7fmdMaK0knSfYf4pV',BRL:'price_1UbQBbL7fmdMaK0kYXB8PAzP'}
});
export const V2_SINGLE_VIDEO=Object.freeze({
 productId:'prod_VeuCjnhyUlZL59',credits:140,
 prices:Object.freeze({GBP:'price_1UdaO5L7fmdMaK0kvyYSd3Fj',EUR:'price_1Ude0AL7fmdMaK0kTJW2vvLv',USD:'price_1Ude0CL7fmdMaK0klngx62PZ',BRL:'price_1UdaOFL7fmdMaK0kjgrYoO9f'}),
 minor:Object.freeze({GBP:599,EUR:699,USD:799,BRL:4490})
});
export const V2_PRIOR_EUR_USD_SINGLE_VIDEO=Object.freeze({
 prices:Object.freeze({EUR:'price_1UdaOCL7fmdMaK0kfOyMORbz',USD:'price_1UdaOEL7fmdMaK0kxjtFqgtE'}),
 minor:Object.freeze({EUR:715,USD:785}),
 credits:140,productId:'prod_VeuCjnhyUlZL59'
});
// V2 Checkout requires all six independent QA gates and a transactional ledger router.
// Creator BRL regular R$224.90 is approved; Black Friday coupons remain pending.
export const V2_CHECKOUT_RELEASE_GATES=Object.freeze([
 'K4K_V2_PRICE_AND_CREDIT_QA_APPROVED',
 'K4K_V2_LAUNCH_RESERVATION_QA_APPROVED',
 'K4K_V2_LEGACY_RENEWAL_QA_APPROVED',
 'K4K_V2_BRL_COMMERCIAL_TERMS_QA_APPROVED',
 'K4K_V2_STARTER_GBP_ENTITLEMENT_QA_APPROVED',
 'K4K_V2_CREDIT_UNIT_ECONOMICS_QA_APPROVED'
]);
export function v2CheckoutReleaseApproved(env={}){return V2_CHECKOUT_RELEASE_GATES.every(key=>env[key]==='true');}
export function priceMatch(catalogue,priceId){
 if(typeof priceId!=='string')return null;
 for(const [plan,prices] of Object.entries(catalogue))
  for(const [currency,id] of Object.entries(prices))if(id===priceId)return {plan,currency};
 return null;
}
export function v2PriceMatch(priceId){
 return priceMatch(V2_LIVE_PLAN_PRICES,priceId)||priceMatch(V2_PRIOR_EUR_USD_PLAN_PRICES,priceId);
}
export function v2SubscriptionPriceTerms(priceId){
 for(const [prices,minors,historical] of [
  [V2_LIVE_PLAN_PRICES,V2_LIVE_PLAN_MINOR,false],
  [V2_PRIOR_EUR_USD_PLAN_PRICES,V2_PRIOR_EUR_USD_PLAN_MINOR,true]]){
  const match=priceMatch(prices,priceId);
  if(match)return Object.freeze({...match,priceId,amountMinor:minors[match.plan][match.currency],
   credits:V2_MONTHLY_CREDITS[match.plan],historical,kind:'subscription_invoice'});
 }
 return null;
}
export function v2SingleVideoPriceTerms(priceId){
 for(const [catalog,historical] of [[V2_SINGLE_VIDEO,false],[V2_PRIOR_EUR_USD_SINGLE_VIDEO,true]]){
  for(const [currency,id] of Object.entries(catalog.prices)){
   if(id===priceId)return Object.freeze({priceId,currency,amountMinor:catalog.minor[currency],
    credits:140,historical,kind:'single_video_payment'});
  }
 }
 return null;
}
export function preservedPriceMatch(priceId){return priceMatch(PRESERVED_LIVE_PLAN_PRICES,priceId);}
export function v2ManifestMatches(candidate){
 if(!candidate||typeof candidate!=='object')return false;
 return Object.keys(candidate).length===4&&Object.entries(V2_LIVE_PLAN_PRICES).every(([plan,row])=>
   Object.keys(candidate[plan]||{}).length===4&&Object.entries(row).every(([currency,id])=>candidate[plan]?.[currency]===id));
}

// A shared Price ID would conflate legacy and V2 balances. This must always be false
// for a safe V2 price catalogue; the separate Starter GBP price resolves the overlap.
export function v2HasSharedLegacyPrice(candidate=V2_LIVE_PLAN_PRICES){
 return Object.values(candidate||{}).some(row=>Object.values(row||{}).some(id=>Boolean(preservedPriceMatch(id))));
}
