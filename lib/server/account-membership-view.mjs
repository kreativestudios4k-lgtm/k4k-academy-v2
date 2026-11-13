import {PLAN_PRICES,LEGACY_TEST_PRICE_IDS} from '../k4k-plan-prices.mjs';
// Plan labels alone are not product identifiers: older Academy records use
// "starter" too. Only verified test price IDs identify a test APP membership.
const testPrices=new Set([...Object.values(PLAN_PRICES).flatMap(p=>Object.values(p.stripePriceIds)),...Object.values(LEGACY_TEST_PRICE_IDS).flatMap(p=>Object.values(p))]);
const safeView=row=>row?{status:row.status,plan:row.plan,current_period_end:row.current_period_end??null,cancel_at_period_end:Boolean(row.cancel_at_period_end)}:null;
export function accountMembershipView({legacy,app,academyClaim=false,production=false}={}){
 const knownTest=Boolean(legacy&&testPrices.has(legacy.stripe_price_id));
 return {
  app:production?safeView(app):knownTest&&!academyClaim?safeView(legacy):null,
  academy:academyClaim?safeView(legacy):null,
  legacy:legacy&&!knownTest&&!academyClaim?safeView(legacy):null
 };
}
