// Verified Genjutsu motion-transfer model contract, from supplied official API documentation.
// This module does not dispatch jobs by itself or bypass any provider moderation.
import {createHiggsfieldPlatformApi,higgsfieldModelAccess,higgsfieldCustomerCredential} from './higgsfield-platform-api.mjs';
export const GENJUTSU_MODEL_ID='higgsfield/genjutsu/motion-transfer/v1.0';
// Published standard self-serve API rates, rechecked 2026-11-17 against
// https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/playground
// Always require a separately approved rate card; a fixed estimate is NOT an upstream quote.
export const GENJUTSU_RATE_USD=Object.freeze({'480p':0.154,'720p':0.3446,'1080p':0.8346});
export const GENJUTSU_LIGHT_MODEL_ID='higgsfield/genjutsu-light/motion-transfer/v1.0';
// Official Genjutsu Light pricing supplied for the dedicated motion-transfer endpoint.
// Lite uses only the first 15 seconds of a longer source and preserves source audio.
export const GENJUTSU_LIGHT_RATE_USD=Object.freeze({'480p':0.0739,'720p':0.1471,'1080p':0.2936});
export const MOTION_MODEL_IDS=Object.freeze({lite:GENJUTSU_LIGHT_MODEL_ID,ultra:GENJUTSU_MODEL_ID});
export function motionModelId(value){if(value==='lite'||value==='ultra')return value;throw Error('INVALID_MOTION_MODEL');}
export function storedMotionModel(job){
 const value=(job?.input??job?.normalized_input)?.motionModel;
 return value===undefined?'ultra':motionModelId(value);
}
export function storedMotionInput(job){
 const raw=job?.input??job?.normalized_input;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('INVALID_PROVIDER_INPUT');
 const {motionModel,...providerInput}=raw;
 if(motionModel!==undefined)motionModelId(motionModel);
 return genjutsuInput(providerInput);
}
export function motionRates(model='ultra'){return model==='lite'?GENJUTSU_LIGHT_RATE_USD:model==='ultra'?GENJUTSU_RATE_USD:(()=>{throw Error('INVALID_MOTION_MODEL')})();}
export function motionBilledSeconds(sourceSeconds,model='ultra'){
 motionModelId(model);
 if(typeof sourceSeconds!=='number'||!Number.isFinite(sourceSeconds)||sourceSeconds<4||sourceSeconds>30)throw Error('REFERENCE_DURATION_OUT_OF_RANGE');
 return Math.min(Math.ceil(sourceSeconds),model==='lite'?15:30);
}
/** Approved customer per-video budget, scoped by quality.
 * Public 480p: can reach the full 30 seconds ($4.62) only with an explicitly
 * funded global per-job limit of at least $4.62; otherwise reject at quote.
 * Public 720p remains capped at 13 seconds ($4.4798); 1080p retains the
 * conservative $2.10 cap. Global cap always remains the upper bound.
 */
export function genjutsuCustomerMaxUsd(resolution,env=process.env,model='ultra'){
 const rates=motionRates(model);
 if(!Object.hasOwn(rates,resolution))throw Error('INVALID_RESOLUTION');
 const globalCap=Number(env.K4K_GENERATION_MAX_USD);
 if(!Number.isFinite(globalCap)||globalCap<=0||globalCap>5)throw Error('PROVIDER_BUDGET_BLOCKED');
 if(model==='lite')return globalCap;
 const qualityCap=resolution==='480p'?5:resolution==='720p'&&env.K4K_MOTION_720P_APPROVED==='true'?4.5:2.1;
 return Math.min(globalCap,qualityCap);
}

function httpsUrl(value){
 if(typeof value!=='string'||value.length<1||value.length>2083)return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}
}
export function genjutsuEstimate({sourceSeconds,resolution='720p',model='ultra'}={}){
 const rates=motionRates(model);
 if(!Object.hasOwn(rates,resolution))throw Error('INVALID_RESOLUTION');
 const duration=motionBilledSeconds(sourceSeconds,model);
 const usdMicros=Math.round(rates[resolution]*duration*1000000);
 return {usd:usdMicros/1000000,duration,sourceSeconds,usdMicros,resolution,model,pricingMode:model==='lite'?'published_higgsfield_genjutsu_light_rate':'published_higgsfield_genjutsu_rate'};
}

export function genjutsuInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('INVALID_PROVIDER_INPUT');
 for(const key of Object.keys(input))if(!['video_url','image_urls','prompt','resolution'].includes(key))throw Error('INVALID_PROVIDER_INPUT');
 const {video_url,image_urls,prompt='',resolution='720p'}=input;
 if(!httpsUrl(video_url)||!Array.isArray(image_urls)||image_urls.length<1||image_urls.length>8||!image_urls.every(httpsUrl)||typeof prompt!=='string'||prompt.length>10000||!Object.hasOwn(GENJUTSU_RATE_USD,resolution))throw Error('INVALID_PROVIDER_INPUT');
 return {video_url,image_urls:[...image_urls],prompt,resolution};
}
export function createGenjutsuProvider({env=process.env,fetchImpl=fetch}={}){
 // Customer dispatch is gated by signed quotes, approved model rates,
 // existing credits, one-shot submission and private output reconciliation.
 const permitted=higgsfieldModelAccess(env);
 return Object.freeze({
  async estimate(tier,input,{sourceSeconds}={}){
   const safe=genjutsuInput(input);
   const model=tier==='lite'?'lite':'ultra';
   return {...genjutsuEstimate({sourceSeconds,resolution:safe.resolution,model}),providerAuthenticated:false,providerQuoteVerified:false,providerRateCardVerified:false};
  },
  async submit(tier,input,{enabled=false,sourceSeconds,maxUsd,quotedUsd}={}){
   const model=tier==='lite'?'lite':(['ultra','motion','pro'].includes(tier)?'ultra':motionModelId(tier));
   if(!enabled||!permitted)throw Error('HIGGSFIELD_GENERATION_DISABLED');
   const validated=genjutsuInput(input);
   const cost=genjutsuEstimate({sourceSeconds,resolution:validated.resolution,model}).usd;
   if(!Number.isFinite(maxUsd)||maxUsd<=0||maxUsd>5||cost>maxUsd||quotedUsd!==cost)throw Error('PROVIDER_BUDGET_BLOCKED');
   if(env.K4K_HIGGSFIELD_RATE_CARD_APPROVED!=='true'||(model==='lite'&&env.K4K_HIGGSFIELD_LIGHT_RATE_CARD_APPROVED!=='true'))throw Error('PROVIDER_RATE_CARD_NOT_APPROVED');
   // One dispatch only; caller must atomically reserve credits, store the
   // request ID and reconcile uncertain submissions before any retry.
   return await createHiggsfieldPlatformApi({credentials:higgsfieldCustomerCredential(env),fetchImpl}).submit({modelPath:MOTION_MODEL_IDS[model],input:validated,enabled:true});
  },
  async status(requestId){
   if(!permitted)throw Error('HIGGSFIELD_GENERATION_DISABLED');
   return await createHiggsfieldPlatformApi({credentials:higgsfieldCustomerCredential(env),fetchImpl}).status(requestId);
  }
 });
}
