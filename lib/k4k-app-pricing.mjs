// Proposed new-customer GBP catalog. No Stripe IDs or subscription updates.
export const K4K_PLANS = Object.freeze([
  {id:'starter',name:'Starter',gbpPence:799,monthlyCredits:100,description:'For exploring AI video creation',features:['Template library','Character references','Generation history']},
  {id:'creator',name:'Creator',gbpPence:1499,monthlyCredits:250,description:'For regular social creators',featured:true,features:['Everything in Starter','More monthly credits','Creator workflows']},
  {id:'pro',name:'Pro',gbpPence:2999,monthlyCredits:600,description:'For frequent video projects',features:['Everything in Creator','Larger monthly allowance','Professional workflows']},
  {id:'studio',name:'Studio',gbpPence:5999,monthlyCredits:1400,description:'For high-volume studios',features:['Everything in Pro','Largest monthly allowance','Studio workflows']}
]);
export const K4K_PACKS = Object.freeze([
  {id:'pack100',gbpPence:699,credits:100},
  {id:'pack300',gbpPence:1799,credits:300},
  {id:'pack750',gbpPence:3999,credits:750}
]);
export const formatGbp = pence => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);
// Cost planning ONLY. 3%+20p estimated payment fees, 35% of post-fee
// revenue maximum provider budget; remaining share funds overhead/profit.
// These assumptions require confirmation against the account's real rates.
export function providerBudgetPence(plan,{feeRate=.03,feeFixedPence=20,budgetFraction=.35}={}){
  if(!plan || !(plan.gbpPence>0) || !(plan.monthlyCredits>0))throw new Error('Invalid plan');
  if(feeRate<0||feeRate>=1||feeFixedPence<0||budgetFraction<=0||budgetFraction>1)throw new Error('Invalid assumptions');
  return Math.floor(Math.max(0,plan.gbpPence*(1-feeRate)-feeFixedPence)*budgetFraction);
}
export function maximumProviderPencePerCredit(plan,assumptions){
  return providerBudgetPence(plan,assumptions)/plan.monthlyCredits;
}
// Charge is only safe when a VERIFIED per-request provider GBP cost is known.
// Round up to preserve budget; never take an amount from the browser.
export function minimumCreditsForCost(providerCostPence,pencePerCredit){
  if(!Number.isFinite(providerCostPence)||providerCostPence<0||!Number.isFinite(pencePerCredit)||pencePerCredit<=0)throw new Error('Invalid provider cost');
  return Math.max(1,Math.ceil(providerCostPence/pencePerCredit));
}
export function getPlan(id){return K4K_PLANS.find(p=>p.id===id)||null;}
