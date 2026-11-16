// Verified Genjutsu motion-transfer model contract, from supplied official API documentation.
// This module does not dispatch jobs by itself or bypass any provider moderation.
import {createHiggsfieldPlatformApi,higgsfieldModelAccess} from './higgsfield-platform-api.mjs';
export const GENJUTSU_MODEL_ID='higgsfield/genjutsu/motion-transfer/v1.0';
export const GENJUTSU_RATE_USD=Object.freeze({'480p':0.154,'720p':0.3446,'1080p':0.8346});
function httpsUrl(value){
 if(typeof value!=='string'||value.length<1||value.length>2083)return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}
}
export function genjutsuEstimate({sourceSeconds,resolution='720p'}={}){
 if(!Object.hasOwn(GENJUTSU_RATE_USD,resolution))throw Error('INVALID_RESOLUTION');
 if(typeof sourceSeconds!=='number'||!Number.isFinite(sourceSeconds)||sourceSeconds<4||sourceSeconds>30)throw Error('REFERENCE_DURATION_OUT_OF_RANGE');
 const duration=Math.ceil(sourceSeconds);
 const usdMicros=Math.round(GENJUTSU_RATE_USD[resolution]*duration*1000000);
 return {usd:usdMicros/1000000,duration,usdMicros,resolution,pricingMode:'published_higgsfield_genjutsu_rate'};
}
export function genjutsuInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('INVALID_PROVIDER_INPUT');
 for(const key of Object.keys(input))if(!['video_url','image_urls','prompt','resolution'].includes(key))throw Error('INVALID_PROVIDER_INPUT');
 const {video_url,image_urls,prompt='',resolution='720p'}=input;
 if(!httpsUrl(video_url)||!Array.isArray(image_urls)||image_urls.length<1||image_urls.length>8||!image_urls.every(httpsUrl)||typeof prompt!=='string'||prompt.length>10000||!Object.hasOwn(GENJUTSU_RATE_USD,resolution))throw Error('INVALID_PROVIDER_INPUT');
 return {video_url,image_urls:[...image_urls],prompt,resolution};
}
export function createGenjutsuProvider({env=process.env,fetchImpl=fetch}={}){
 // No commercial deployment until the user's developer account and rate card
 // are validated; current K4K production routing remains on Wan/fal.
 const permitted=higgsfieldModelAccess(env);
 return Object.freeze({
  async estimate(_tier,input,{sourceSeconds}={}){
   const safe=genjutsuInput(input);
   return {...genjutsuEstimate({sourceSeconds,resolution:safe.resolution}),providerAuthenticated:false,providerQuoteVerified:false,providerRateCardVerified:false};
  },
  async submit(_tier,input,{enabled=false,sourceSeconds,maxUsd,quotedUsd}={}){
   if(!enabled||!permitted)throw Error('HIGGSFIELD_GENERATION_DISABLED');
   const validated=genjutsuInput(input);
   const cost=genjutsuEstimate({sourceSeconds,resolution:validated.resolution}).usd;
   if(!Number.isFinite(maxUsd)||maxUsd<=0||maxUsd>5||cost>maxUsd||quotedUsd!==cost)throw Error('PROVIDER_BUDGET_BLOCKED');
   if(env.K4K_HIGGSFIELD_RATE_CARD_APPROVED!=='true')throw Error('PROVIDER_RATE_CARD_NOT_APPROVED');
   // One dispatch only; caller must atomically reserve credits, store the
   // request ID and reconcile uncertain submissions before any retry.
   return await createHiggsfieldPlatformApi({credentials:env.HF_API_KEY,fetchImpl}).submit({modelPath:GENJUTSU_MODEL_ID,input:validated,enabled:true});
  },
  async status(requestId){
   if(!permitted)throw Error('HIGGSFIELD_GENERATION_DISABLED');
   return await createHiggsfieldPlatformApi({credentials:env.HF_API_KEY,fetchImpl}).status(requestId);
  }
 });
}
