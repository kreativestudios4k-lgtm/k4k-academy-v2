import {higgsfieldQuoteEnabled} from './higgsfield-release-policy.mjs';
// Customer-side Higgsfield quote contract. No paid dispatch or balance mutation.
// Requires verified server media metadata and explicitly approved provider pricing.
import {createHash} from 'node:crypto';
import {HIGGSFIELD_INPUT_HOSTS} from './higgsfield-input-hosts.mjs';
import {quoteSigner,generationCredits} from './generation-quote.mjs';
import {genjutsuEstimate,genjutsuCustomerMaxUsd,storedMotionModel,storedMotionInput} from './higgsfield-genjutsu-motion.mjs';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
function assertDraft({job,userId,media,env,allowReserved=false}){
 if(!UUID.test(userId??'')||!job||job.user_id!==userId||!UUID.test(job.id??'')||!(job.status==='draft'||(allowReserved&&job.status==='queued'))
  ||job.provider!=='higgsfield'||job.model!=='genjutsu-motion'||job.media_kind!=='video')
  throw Error('INVALID_HIGGSFIELD_DRAFT');
 if(!media||media.userId!==userId||media.jobId!==job.id||media.verified!==true
  ||media.contentType!=='video/mp4'||!Number.isFinite(media.seconds)||media.seconds<4||media.seconds>30)
  throw Error('REFERENCE_VIDEO_VERIFICATION_REQUIRED');
 const input=storedMotionInput(job);
 const hosts=(env.K4K_HIGGSFIELD_APPROVED_MEDIA_HOSTS||HIGGSFIELD_INPUT_HOSTS.join(',')).split(',').map(s=>s.trim()).filter(Boolean);
 if(hosts.length<1||hosts.length>8)throw Error('MEDIA_HOSTS_NOT_CONFIGURED');
 for(const link of [input.video_url,...input.image_urls]){
  const u=new URL(link);
  if(!hosts.includes(u.hostname)||u.port||u.username||u.password||u.hash||u.search)throw Error('UNTRUSTED_REFERENCE_URL');
 }
 return {input,model:storedMotionModel(job)};
}
function fingerprint({job,userId,media,input,model}){
 return createHash('sha256').update(JSON.stringify([
  'k4k-higgsfield-genjutsu-customer-v1',userId,job.id,'higgsfield','genjutsu-motion',
  input,Math.round(media.seconds*1000000),...(job?.normalized_input?.motionModel===undefined&&job?.input?.motionModel===undefined?[]:[model])
 ])).digest('hex');
}
function approved(env,model='ultra'){
 if(!higgsfieldQuoteEnabled(env))
  throw Error('HIGGSFIELD_CUSTOMER_QUOTE_DISABLED');
 if(env.K4K_HIGGSFIELD_RATE_CARD_APPROVED!=='true'||(model==='lite'&&env.K4K_HIGGSFIELD_LIGHT_RATE_CARD_APPROVED!=='true'))throw Error('HIGGSFIELD_RATE_CARD_REVIEW_REQUIRED');
 if(typeof env.K4K_GENERATION_QUOTE_SECRET!=='string'||env.K4K_GENERATION_QUOTE_SECRET.length<32)
  throw Error('QUOTE_SIGNING_UNAVAILABLE');
}
export function prepareHiggsfieldCustomerQuote({job,userId,verifiedMedia,env=process.env,now=Date.now()}={}){
 const {input,model}=assertDraft({job,userId,media:verifiedMedia,env});
 approved(env,model);
 const quote=genjutsuEstimate({sourceSeconds:verifiedMedia.seconds,resolution:input.resolution,model});
 const maxUsd=genjutsuCustomerMaxUsd(input.resolution,env,model);
 if(quote.usd>maxUsd)throw Error('PROVIDER_BUDGET_BLOCKED');
 const credits=generationCredits(quote.usd,env);
 const hash=fingerprint({job,userId,media:verifiedMedia,input,model});
 const token=quoteSigner(env.K4K_GENERATION_QUOTE_SECRET).issue({
  type:'higgsfield-customer-preview-v1',userId,jobId:job.id,model:job.model,
  provider:'higgsfield',resolution:input.resolution,duration:quote.duration,motionModel:model,
  fingerprint:hash,quoteMicros:quote.usdMicros,credits
 },now);
 return Object.freeze({jobId:job.id,usd:quote.usd,quoteMicros:quote.usdMicros,credits,duration:quote.duration,resolution:input.resolution,motionModel:model,sourceSeconds:verifiedMedia.seconds,quoteToken:token,expiresInSeconds:300,dispatchEnabled:false});
}
export function verifyHiggsfieldCustomerQuote({job,userId,verifiedMedia,token,env=process.env,now=Date.now()}={}){
 const {input,model}=assertDraft({job,userId,media:verifiedMedia,env,allowReserved:true});
 approved(env,model);
 const q=quoteSigner(env.K4K_GENERATION_QUOTE_SECRET).verify(token,now);
 const estimate=genjutsuEstimate({sourceSeconds:verifiedMedia.seconds,resolution:input.resolution,model});
 const hash=fingerprint({job,userId,media:verifiedMedia,input,model});
 if(q.type!=='higgsfield-customer-preview-v1'||q.userId!==userId||q.jobId!==job.id
  ||q.model!=='genjutsu-motion'||q.provider!=='higgsfield'||(q.motionModel??'ultra')!==model||q.resolution!==input.resolution
  ||q.duration!==estimate.duration||q.fingerprint!==hash||q.quoteMicros!==estimate.usdMicros
  ||q.credits!==generationCredits(estimate.usd,env)||q.quoteMicros>genjutsuCustomerMaxUsd(input.resolution,env,model)*1e6)
  throw Error('QUOTE_CHANGED');
 return Object.freeze({jobId:job.id,quoteMicros:q.quoteMicros,credits:q.credits,fingerprint:hash,motionModel:model,dispatchEnabled:false});
}
