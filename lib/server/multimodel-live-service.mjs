// K4K independently guarded fal model service. No changes to legacy Wan, subscriptions or Stripe.
import {createClient} from '@supabase/supabase-js';
import {createHash,randomUUID} from 'node:crypto';
import {validatedMultimodelRequest,conservativeMultimodelQuote,MULTIMODEL_CONTRACTS} from './fal-multimodel-contracts.mjs';
import {generationCredits,quoteSigner} from './generation-quote.mjs';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const falId=/^[a-zA-Z0-9_-]{1,128}$/;
const bucket='studio-generations';
export function multimodelLiveAllowed(env=process.env){
 return env.VERCEL_ENV==='production'&&env.K4K_MULTIMODEL_LIVE_ENABLED==='true'&&env.K4K_WAITLIST_ONLY!=='true'&&env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED==='true'&&!!env.FAL_KEY&&!!env.SUPABASE_SERVICE_ROLE_KEY;
}
export function multimodelUserAllowed(userId,env=process.env){
 if(!multimodelLiveAllowed(env))return false;
 if(env.K4K_MULTIMODEL_PILOT_ONLY==='true')return !!env.K4K_OWNER_LIVE_PILOT_USER_ID&&userId===env.K4K_OWNER_LIVE_PILOT_USER_ID;
 return true;
}
export function multimodelQuote({modelId,params,env=process.env}){
 const validated=validatedMultimodelRequest(modelId,params);
 // Narrow initial release: one 1k image or one Kling Flash video, not bulk images, drafts or variable token rate.
 if(!['kling-flash-t2v','flux3-t2i','nano-banana-21-t2i'].includes(modelId))throw Error('MODEL_DISABLED');
 if(modelId==='flux3-t2i'&&params.resolution!=='1k')throw Error('MODEL_QUALITY_NOT_ENABLED');
 if(modelId==='nano-banana-21-t2i'&&params.resolution!=='1K')throw Error('MODEL_QUALITY_NOT_ENABLED');
 const quoted=conservativeMultimodelQuote(modelId,params,{
  verifiedMaxUsd:Math.min(2.1,Number(env.K4K_GENERATION_MAX_USD)||0),
  // A cautious cap for 1k image jobs. No auto-refresh of quoted cost.
  estimatedMegapixels:modelId==='flux3-t2i'?2:undefined
 });
 // $0.10 of provider cost per existing credit; no subscription plan changes.
 const credits=generationCredits(quoted.usd,env);
 return Object.freeze({...validated,usd:quoted.usd,credits,quoteMicros:Math.ceil(quoted.usd*1000000)});
}
function hashParams(modelId,params){return createHash('sha256').update(JSON.stringify([modelId,params])).digest('hex')}
export function signMultimodelQuote(job,env=process.env){
 return quoteSigner(env.K4K_GENERATION_QUOTE_SECRET||env.FAL_KEY).issue({
  purpose:'k4k-multimodel-v1',userId:job.user_id,jobId:job.id,modelId:job.model_id,
  credits:job.quoted_credits,quoteMicros:Number(job.quote_micros),
  fingerprint:hashParams(job.model_id,job.parameters)
 });
}
export function verifyMultimodelQuote(job,token,env=process.env){
 const q=quoteSigner(env.K4K_GENERATION_QUOTE_SECRET||env.FAL_KEY).verify(token);
 if(q.purpose!=='k4k-multimodel-v1'||q.userId!==job.user_id||q.jobId!==job.id||
 q.modelId!==job.model_id||q.credits!==job.quoted_credits||
 Number(q.quoteMicros)!==Number(job.quote_micros)||q.fingerprint!==hashParams(job.model_id,job.parameters))throw Error('QUOTE_CHANGED');
 return q;
}
export async function multimodelAuth(request,env=process.env){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)throw Error('UNAUTHENTICATED');
 const url=env.NEXT_PUBLIC_SUPABASE_URL,pub=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!pub||!key)throw Error('UNAVAILABLE');
 const opts={auth:{persistSession:false,autoRefreshToken:false}};
 const auth=createClient(url,pub,opts),db=createClient(url,key,opts);
 const {data:{user}={},error}=await auth.auth.getUser(token);
 if(error||!user||user.is_anonymous)throw Error('UNAUTHENTICATED');
 return {user,db};
}
export async function findMultimodelJob(db,userId,jobId){
 if(!uuid.test(jobId??''))throw Error('INVALID_JOB');
 const {data,error}=await db.from('k4k_multimodel_jobs').select('*').eq('id',jobId).eq('user_id',userId).maybeSingle();
 if(error)throw Error('UNAVAILABLE');
 if(!data)throw Error('NOT_FOUND');
 return data;
}
async function falRequest(url,key,{method='GET',body}={}){
 let response;
 try{response=await fetch(url,{method,headers:{Authorization:'Key '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)})}
 catch{throw Error('PROVIDER_UNREACHABLE')}
 if(!response.ok){const error=Error('PROVIDER_REQUEST_REJECTED');error.httpStatus=response.status;throw error}
 try{return await response.json()}catch{throw Error('PROVIDER_RESPONSE_INVALID')}
}
export async function submitMultimodelRequest(job,key){
 const result=await falRequest('https://queue.fal.run/'+MULTIMODEL_CONTRACTS[job.model_id].endpoint,key,{method:'POST',body:job.parameters});
 if(!falId.test(result?.request_id??''))throw Error('PROVIDER_RESPONSE_INVALID');
 return result.request_id;
}
export async function pollMultimodelRequest(job,key){
 if(!falId.test(job.provider_job_id??''))throw Error('PROVIDER_JOB_ID_MISSING');
 const base='https://queue.fal.run/'+MULTIMODEL_CONTRACTS[job.model_id].endpoint+'/requests/'+job.provider_job_id;
 const status=await falRequest(base+'/status',key);
 if(status.request_id!==job.provider_job_id||!['IN_QUEUE','IN_PROGRESS','COMPLETED'].includes(status.status))throw Error('PROVIDER_RESPONSE_INVALID');
 if(status.status==='IN_QUEUE')return {state:'queued'};
 if(status.status==='IN_PROGRESS')return {state:'processing'};
 if(status.error||status.error_type)return {state:'failed'};
 const result=await falRequest(base,key);
 if(result.error||result.error_type)return {state:'failed'};
 const url=job.kind==='video'?result.video?.url:result.images?.[0]?.url;
 if(typeof url!=='string')throw Error('PROVIDER_OUTPUT_NOT_READY');
 return {state:'completed',url};
}
export function safeFalMediaUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.port===''&&
 (u.hostname==='fal.media'||u.hostname.endsWith('.fal.media'))&&u.pathname.length<2048}
 catch{return false}
}
export async function ingestMultimodelOutput({db,job,url}){
 if(!safeFalMediaUrl(url))throw Error('PROVIDER_OUTPUT_HOST_REJECTED');
 let result;
 try{result=await fetch(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000)})}
 catch{throw Error('PROVIDER_OUTPUT_UNAVAILABLE')}
 if(!result.ok)throw Error('PROVIDER_OUTPUT_UNAVAILABLE');
 const type=job.kind==='video'?'video/mp4':'image/png',max=job.kind==='video'?80*1024*1024:16*1024*1024;
 if(Number(result.headers.get('content-length'))>max)throw Error('PROVIDER_OUTPUT_TOO_LARGE');
 const bytes=new Uint8Array(await result.arrayBuffer());
 if(bytes.byteLength<512||bytes.byteLength>max)throw Error('PROVIDER_OUTPUT_INVALID');
 if(job.kind==='video'&&String.fromCharCode(...bytes.subarray(4,8))!=='ftyp')throw Error('PROVIDER_OUTPUT_INVALID');
 if(job.kind==='image'&&![137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))throw Error('PROVIDER_OUTPUT_INVALID');
 const path=job.user_id+'/'+job.id+(job.kind==='video'?'.mp4':'.png');
 const bucketObject=db.storage.from(bucket);
 const {data:existing,error:infoError}=await bucketObject.info(path);
 if(!existing){
  const {error}=await bucketObject.upload(path,bytes,{contentType:type,upsert:false,cacheControl:'0'});
  if(error)throw Error('OUTPUT_UPLOAD_FAILED');
 }
 return path;
}
export function multimodelError(e){
 const allowed={UNAUTHENTICATED:401,NOT_FOUND:404,INVALID_JOB:400,INVALID_PROVIDER_INPUT:422,
  INVALID_PROMPT:422,INVALID_RESOLUTION:422,REFERENCE_DURATION_OUT_OF_RANGE:422,MODEL_DISABLED:422,MODEL_QUALITY_NOT_ENABLED:422,
  INSUFFICIENT_CREDITS_OR_BILLING_HOLD:409,ACTIVE_JOB_LIMIT:409,JOB_NOT_DRAFT:409,QUOTE_CHANGED:409,QUOTE_INVALID:409,QUOTE_EXPIRED:409,
  PROVIDER_BUDGET_BLOCKED:503,GENERATION_DISABLED:503,UNAVAILABLE:503,OUTPUT_UPLOAD_FAILED:503,PROVIDER_OUTPUT_UNAVAILABLE:503};
 const code=e?.message;return {code:Object.hasOwn(allowed,code)?code:'GENERATION_UNAVAILABLE',status:allowed[code]??503};
}
