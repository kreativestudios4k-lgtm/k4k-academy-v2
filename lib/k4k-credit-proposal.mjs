import {falMotionEstimate} from './k4k-motion-tiers.mjs';
// Owner-approved TEST pricing, 10 November 2026. Payment and generation gates are separate.
export const CREDIT_PROPOSAL=Object.freeze({approved:true,paymentsEnabled:false,providerUsdPerCredit:0.10});
export const CREDIT_PACKS=Object.freeze([
 Object.freeze({id:'boost20',credits:20,GBP:499,EUR:599,USD:649,BRL:3499}),
 Object.freeze({id:'boost50',credits:50,GBP:1099,EUR:1299,USD:1449,BRL:7499}),
 Object.freeze({id:'boost100',credits:100,GBP:1999,EUR:2399,USD:2699,BRL:13999}),
]);
export function proposedGenerationCredits({model='lite',resolution='720p',seconds=5,provider='higgsfield'}={}){
 if(provider==='fal'){const {usd:providerUsd}=falMotionEstimate(model,{resolution,sourceSeconds:seconds});return {providerUsd,credits:Math.ceil(Math.round(providerUsd*1e6)/100000)}}
 if(provider!=='higgsfield')throw Error('INVALID_GENERATION_ESTIMATE');
 const rates={lite:{'480p':.05,'720p':.10,'1080p':.20},pro:{'480p':.318,'720p':.681,'1080p':1.632}};
 if(!Object.hasOwn(rates,model)||!Object.hasOwn(rates[model],resolution)||!Number.isFinite(seconds)||seconds<4||seconds>(model==='lite'?15:30))throw Error('INVALID_GENERATION_ESTIMATE');
 // Lite charges output rounded up plus measured source duration; Pro rounds source up.
 const billableSeconds=Math.ceil(seconds)+(model==='lite'?seconds:0);
 const providerUsd=Math.round(billableSeconds*rates[model][resolution]*1000)/1000;
 return {providerUsd,credits:Math.ceil(Math.round(providerUsd*1e6)/100000)};
}
