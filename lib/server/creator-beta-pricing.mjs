// Preview-only offer specification. No Stripe calls or payment collection.
export const FOUNDING_CREATOR_LIMIT = 25;
export const BETA_DISCOUNT_PERCENT = 50;
export const BETA_DISCOUNT_MONTHS = 3;
export const CREATOR_PLANS = Object.freeze([
  {id:'starter',name:'Starter',monthlyPence:799},
  {id:'creator',name:'Creator',monthlyPence:1499},
  {id:'pro',name:'Pro',monthlyPence:2999},
  {id:'studio',name:'Studio',monthlyPence:5999},
]);
export function introductoryMonthlyPence(monthlyPence) {
  if (!Number.isSafeInteger(monthlyPence) || monthlyPence < 0) throw new RangeError('Invalid price');
  return Math.round(monthlyPence * (100 - BETA_DISCOUNT_PERCENT) / 100);
}
export function quoteCreatorMonth(planId, monthNumber) {
  const plan=CREATOR_PLANS.find(x=>x.id===planId);
  if (!plan || !Number.isSafeInteger(monthNumber) || monthNumber<1) throw new RangeError('Invalid plan or month');
  return Object.freeze({
    currency:'gbp',
    amountPence:monthNumber<=BETA_DISCOUNT_MONTHS?introductoryMonthlyPence(plan.monthlyPence):plan.monthlyPence,
    discounted:monthNumber<=BETA_DISCOUNT_MONTHS
  });
}
// Production subscription billing must separately enforce invite ownership,
// 25-seat capacity, renewal consent, Stripe webhook idempotency and credit ledger.
