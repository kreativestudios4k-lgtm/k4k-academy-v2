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
