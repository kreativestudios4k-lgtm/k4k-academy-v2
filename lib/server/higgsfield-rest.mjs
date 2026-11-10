import {higgsfieldAuthorization} from './higgsfield-auth.mjs';
import {K4K_MODELS,validateK4KGeneration,estimateK4KProviderCost} from './k4k-models.mjs';
export function createHiggsfieldRest({credentials,fetchImpl=fetch}={}){
 const authorization=higgsfieldAuthorization(credentials);
 async function request(url,{method='POST',body,idempotencyKey}={}){
  let response;
  try{response=await fetchImpl(url,{method,headers:{Authorization:authorization,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});}catch{throw Error('PROVIDER_UNREACHABLE')}
  if(!response.ok){const error=Error(response.status===401?'PROVIDER_CREDENTIALS_REJECTED':response.status===403?'PROVIDER_ACCESS_OR_BALANCE_BLOCKED':'PROVIDER_REQUEST_REJECTED');error.httpStatus=response.status;throw error;}
  try{return await response.json()}catch{throw Error('PROVIDER_RESPONSE_INVALID')}
 }
 return Object.freeze({
  async estimate(tier,input,{sourceSeconds,referenceSeconds=0}={}){
   const payload=validateK4KGeneration(tier,input);
   const result=await request('https://api.higgsfield.ai/estimate/'+K4K_MODELS[tier].modelId,{body:payload});
   // Verified against the authenticated estimate response. Exact matching
   // fails closed if pricing text or rounding rules change. Never parse an
   // arbitrary description or accept a browser-asserted duration here.
   const proRateCard='Per-second pricing. Each second of input video costs $0.318 at 480p, $0.681 at 720p, $1.632 at 1080p. Input duration is rounded up to the nearest whole second. Rates shown are before any applicable customer discount.';
   const liteRateCard='Priced per total second by resolution: 480p $0.05, 720p $0.10, or 1080p $0.20. Rates shown are before any applicable customer discount. Billable seconds = output duration + the sum of input reference video durations. Input video durations are measured during preprocessing; without video references, only output duration is billed. Genjutsu Light trims the source to 15 seconds; output duration is rounded up to whole seconds before billing.';
   const expectedRateCard=tier==='pro'?proRateCard:liteRateCard;
   if(result?.type==='description'&&result.pricing_description===expectedRateCard&&Number.isFinite(sourceSeconds)){
    const usd=estimateK4KProviderCost(tier,{resolution:payload.resolution,sourceSeconds,referenceSeconds});
    return {usd,pricingMode:'verified_rate_card',providerQuoteVerified:false,providerRateCardVerified:true};
   }
   const usd=Number(result?.usd);
   if(!['string','number'].includes(typeof result?.usd)||!Number.isFinite(usd)||usd<=0||usd>10000){
    const error=Error('PROVIDER_QUOTE_INVALID');
    error.quoteShape=result&&typeof result==='object'?Object.fromEntries(Object.entries(result).map(([key,value])=>[key,typeof value])):typeof result;
    error.reportedUsd=Number.isFinite(usd)?usd:null;
    if(typeof result?.type==='string'&&typeof result?.pricing_description==='string'){
     error.authenticated=true;
     error.pricingType=result.type.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
     error.pricingDescription=result.pricing_description.replaceAll(credentials,'[redacted]').slice(0,1000);
    }
    throw error;
   }
   return {usd,pricingMode:'fixed_quote',providerQuoteVerified:true,providerRateCardVerified:false};
  },
  async submit(tier,input,{enabled=false,idempotencyKey,maxUsd,quotedUsd}={}){
   if(!enabled)throw Error('GENERATION_DISABLED');
   if(typeof idempotencyKey!=='string'||!/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey))throw Error('INVALID_REQUEST_KEY');
   if(!Number.isFinite(maxUsd)||maxUsd<=0||maxUsd>5||!Number.isFinite(quotedUsd)||quotedUsd<=0||quotedUsd>maxUsd)throw Error('PROVIDER_BUDGET_BLOCKED');
   const result=await request(K4K_MODELS[tier].endpoint,{body:validateK4KGeneration(tier,input),idempotencyKey});
   if(typeof result?.request_id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(result.request_id))throw Error('PROVIDER_RESPONSE_INVALID');
   if(result.status_url!=='https://api.higgsfield.ai/requests/'+result.request_id+'/status')throw Error('PROVIDER_RESPONSE_INVALID');
   return {request_id:result.request_id};
  },
  async status(requestId){
   if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(requestId))throw Error('INVALID_PROVIDER_JOB_ID');
   const result=await request('https://api.higgsfield.ai/requests/'+requestId+'/status',{method:'GET'});
   if(result?.request_id!==requestId||!['queued','in_progress','completed','failed','nsfw','canceled'].includes(result.status))throw Error('PROVIDER_RESPONSE_INVALID');
   return result;
  }
 });
}
