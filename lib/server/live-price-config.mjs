import {billingMode} from './billing-policy.mjs';
export function livePrices(kind,env=process.env){
 if(billingMode(env)!=='live')return null;
 return configuredLivePrices(kind,env);
}
// Webhook scoping needs the catalogue even when new checkout is closed.
export function configuredLivePrices(kind,env=process.env){
 let prices;try{prices=JSON.parse(env[kind==='packs'?'K4K_LIVE_PACK_PRICES_JSON':'K4K_LIVE_PLAN_PRICES_JSON']||'')}catch{throw Error('LIVE_PRICES_NOT_CONFIGURED')}
 if(!prices||typeof prices!=='object'||Array.isArray(prices))throw Error('LIVE_PRICES_NOT_CONFIGURED');
 const keys=kind==='packs'?['boost20','boost50','boost100']:['starter','creator','pro','studio'];
 for(const key of keys)for(const currency of ['GBP','EUR','USD','BRL'])if(typeof prices[key]?.[currency]!=='string'||!/^price_[a-zA-Z0-9]+$/.test(prices[key][currency]))throw Error('LIVE_PRICES_NOT_CONFIGURED');
 return prices;
}

// New GBP checkout prices; legacy IDs remain recognized for existing subscriptions.
export const NEW_GBP_PRICES=Object.freeze({starter:'price_1Uc6WYL7fmdMaK0kCIvi7H00',creator:'price_1Uc7j6L7fmdMaK0krQI0HwGr',pro:'price_1Uc7j8L7fmdMaK0kXsH8U12P',studio:'price_1Uc7j9L7fmdMaK0kSZUDig1E'});
export const LEGACY_GBP_PRICES=Object.freeze({starter:'price_1UbQB0L7fmdMaK0kr3CRE9bd',creator:'price_1UbQBGL7fmdMaK0kyhgxVU9w',pro:'price_1UbQBNL7fmdMaK0kBB6ZEr3O',studio:'price_1UbQBVL7fmdMaK0ksiiSqCXk'});
