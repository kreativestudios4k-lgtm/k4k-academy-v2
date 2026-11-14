// Server-only fal queue adapter. No automatic retries of paid submissions.
export const FAL_WAN_ENDPOINT='alibaba/wan-3.0-prime/reference-to-video';
const queue='https://queue.fal.run/alibaba/wan-3.0-prime';
import {FAL_MOTION_TIERS,falMotionEstimate} from '../k4k-motion-tiers.mjs';
export {FAL_MOTION_TIERS,falMotionEstimate};
// Additional server-side text screening; not a substitute for provider media moderation.
export function assertResponsiblePrompt(prompt){
 if(typeof prompt!=='string')throw Error('INVALID_PROVIDER_INPUT');
 const text=prompt.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const prohibited=/\b(?:ncii|deepfake\s+(?:porn|sexual)|(?:porn|sexual)\s+deepfake|revenge\s+porn|non[\s-]*consensual\s+(?:intimate|sexual|nude)|(?:nude|naked|pornographic|sexually explicit|sexualized|sexualised)\s+(?:child|minor|teen|kid|underage)|(?:child|minor|teen|kid|underage)\s+(?:porn|nude|naked|sexual)|(?:undress|strip|remove\s+(?:her|his|their)\s+clothes)|(?:pornografia|deepfake)\s+sexual|(?:imagem|video|foto)s?\s+intim[oa]s?\s+nao\s+consensua(?:l|is)|(?:despir|desnudar|tirar\s+a\s+roupa)|(?:menor|crianca|nino|nina)\s+(?:nu[ao]|desnud[oa]|sexual|pornografia)|(?:sexual|porno)\s+(?:de\s+)?(?:menor|crianca|nino|nina))\b/i;
 if(prohibited.test(text))throw Error('CONTENT_POLICY_BLOCKED');
}
export function prepareFalMotionInput(tier,input,{sourceSeconds}={}){
 const {duration}=falMotionEstimate(tier,{resolution:input?.resolution,sourceSeconds});
 const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
 if(!https(input.video_url)||!Array.isArray(input.image_urls)||input.image_urls.length<1||input.image_urls.length>8||!input.image_urls.every(https))throw Error('INVALID_PROVIDER_INPUT');
 if(typeof input.prompt!=='string'||input.prompt.length>1200)throw Error('INVALID_PROVIDER_INPUT');
 assertResponsiblePrompt(input.prompt);
 return {prompt:input.prompt||'Recreate Video 1 with the characters from the numbered reference images. Preserve their identities, the source motion, scene, camera and timing.',resolution:input.resolution,duration,aspect_ratio:'adaptive',audio:true,enable_safety_checker:true,reference_image_urls:input.image_urls,reference_video_urls:[input.video_url]};
}
export function createFalWanRest({credentials,env=process.env,fetchImpl=fetch}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 if(typeof credentials!=='string'||!credentials.trim()||/[\r\n]/.test(credentials))throw Error('PROVIDER_CREDENTIALS_MISSING');
 async function request(url,{method='GET',body}={}){
  let response;
  try{response=await fetchImpl(url,{method,headers:{Authorization:'Key '+credentials,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)})}catch{throw Error('PROVIDER_UNREACHABLE')}
  if(!response.ok){const error=Error(response.status===401?'PROVIDER_CREDENTIALS_REJECTED':response.status===403?'PROVIDER_ACCESS_OR_BALANCE_BLOCKED':'PROVIDER_REQUEST_REJECTED');error.httpStatus=response.status;throw error}
  try{return await response.json()}catch{throw Error('PROVIDER_RESPONSE_INVALID')}
 }
 const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(id);
 return Object.freeze({
  async estimate(tier,input,{sourceSeconds}={}){
   prepareFalMotionInput(tier,input,{sourceSeconds});
   if(env.K4K_FAL_RATE_CARD_APPROVED!=='true')throw Error('PROVIDER_RATE_CARD_NOT_APPROVED');
   return {...falMotionEstimate(tier,{resolution:input.resolution,sourceSeconds}),pricingMode:'configured_fal_rate_card',providerQuoteVerified:false,providerRateCardVerified:false,providerAuthenticated:false};
  },
  async submit(tier,input,{enabled=false,idempotencyKey,maxUsd,quotedUsd,sourceSeconds}={}){
   if(!enabled||env.K4K_FAL_WAN_ENABLED!=='true')throw Error('GENERATION_DISABLED');
   if(typeof idempotencyKey!=='string'||!/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey))throw Error('INVALID_REQUEST_KEY');
   const estimate=await this.estimate(tier,input,{sourceSeconds});
   if(!Number.isFinite(maxUsd)||maxUsd<=0||maxUsd>5||estimate.usd>maxUsd||estimate.usd!==quotedUsd)throw Error('PROVIDER_BUDGET_BLOCKED');
   const result=await request('https://queue.fal.run/'+FAL_WAN_ENDPOINT,{method:'POST',body:prepareFalMotionInput(tier,input,{sourceSeconds})});
   if(!validId(result?.request_id)||result.status_url!==queue+'/requests/'+result.request_id+'/status'||result.response_url!==queue+'/requests/'+result.request_id)throw Error('PROVIDER_RESPONSE_INVALID');
   // K4K's atomic reservation prevents duplicate dispatch. Do not assume fal
   // deduplicates an Idempotency-Key header or replay an uncertain submission.
   return {request_id:result.request_id};
  },
  async status(id){
   if(!validId(id))throw Error('INVALID_PROVIDER_JOB_ID');
   const base=queue+'/requests/'+id;
   const status=await request(base+'/status');
   if(status.request_id!==id||!['IN_QUEUE','IN_PROGRESS','COMPLETED'].includes(status.status))throw Error('PROVIDER_RESPONSE_INVALID');
   if(status.status!=='COMPLETED')return {request_id:id,status:status.status==='IN_QUEUE'?'queued':'in_progress'};
   if(status.error||status.error_type)return {request_id:id,status:'failed'};
   // COMPLETED can also mean failed. Only a successful authenticated result
   // containing an MP4 qualifies for collection and credit settlement.
   let result;try{result=await request(base)}catch(error){if([400,422].includes(error.httpStatus))return {request_id:id,status:'failed'};throw error}
   if(result.error)return {request_id:id,status:'failed'};
   if(!result.video?.url)throw Error('PROVIDER_RESPONSE_INVALID');
   return {request_id:id,status:'completed',video:{url:result.video.url}};
  }
 });
}
