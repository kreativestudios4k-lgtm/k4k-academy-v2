import {quoteGeneration} from './generation-quote.mjs';
import {verifyQuoteToken} from './generation-quote-token.mjs';

// Server-side reservation boundary. This module is NOT an HTTP endpoint.
// The caller must authenticate userId, inspect owned media bytes, verify
// entitlements, rate limits and budgets, then supply a service-role store.
// Catalog must come from protected server config, never request JSON.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEYS=['modelId','durationSeconds','resolution','credits','currency','estimatedProviderCostPence','quoteVersion'];
export function verifyCurrentGenerationQuote({token,userId,secret,catalog,now=Date.now()}) {
 if(typeof window!=='undefined')throw new Error('Server only');
 const signed=verifyQuoteToken({token,userId,secret,now});
 const current=quoteGeneration({modelId:signed.modelId,durationSeconds:signed.durationSeconds,resolution:signed.resolution},catalog);
 if(KEYS.some(key=>signed[key]!==current[key]))throw new Error('Quote changed; request a new quote');
 return current;
}
export async function reserveVerifiedGeneration({token,userId,secret,catalog,now=Date.now(),requestKey,input,store,authorize}) {
 if(!UUID.test(userId)||!UUID.test(requestKey))throw new Error('Invalid reservation identity');
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid generation input');
 if(typeof authorize!=='function'||!store||typeof store.reserve!=='function')throw new Error('Reservation prerequisites unavailable');
 const quote=verifyCurrentGenerationQuote({token,userId,secret,catalog,now});
 // Fail closed: require an explicit async authorization/ownership check on
 // every call. This must verify actual storage records and media, not paths.
 const allowed=await authorize({userId,input,quote});
 if(allowed!==true)throw new Error('Generation not authorized');
 const savedInput={...input,modelId:quote.modelId,durationSeconds:quote.durationSeconds,resolution:quote.resolution,quoteVersion:quote.quoteVersion};
 return store.reserve(userId,requestKey,savedInput,quote.credits);
}
