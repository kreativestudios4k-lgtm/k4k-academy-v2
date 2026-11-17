// Owner-only paid provider QA. Never uses customer credits or public dispatch.
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {boundedCreativeDownload} from '../../../../lib/server/creative-qa-output.mjs';
import {HIGGSFIELD_PREVIEW_OWNER} from '../../../../lib/server/higgsfield-release-policy.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
const noStore={'Cache-Control':'no-store'};
const respond=(value,status=200)=>Response.json(value,{status,headers:noStore});
const options={auth:{persistSession:false,autoRefreshToken:false}};
const models=Object.freeze({
 seedance_2_5:{endpoint:'bytedance/seedance-2.5/us/text-to-video',media:'video',reserve:4500000,
  args:(prompt,aspect)=>({prompt,aspect_ratio:aspect,duration:'5',resolution:'480p',generate_audio:false,draft:false})},
 kling4_0:{endpoint:'kling/v4/text-to-video',media:'video',reserve:1200000,
  args:(prompt,aspect)=>({prompt,aspect_ratio:aspect,duration:5,resolution:'720p'})},
 nano_banana_2:{endpoint:'google/nano-banana-2.1',media:'image',reserve:1500000,
  args:(prompt,aspect)=>({prompt,aspect_ratio:aspect,num_images:1,resolution:'1K',limit_generations:true,enable_web_search:false})},
 flux_3_image:{endpoint:'blackforestlabs/flux-3/text-to-image',media:'image',reserve:500000,
  args:(prompt,aspect)=>({prompt,aspect_ratio:aspect,resolution:'1k',output_format:'jpeg',enable_prompt_expansion:false})}
});
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const ownerEnabled=env=>(env.VERCEL_ENV==='production'||env.VERCEL_ENV==='preview')&&env.K4K_OWNER_CREATIVE_QA_ENABLED==='true';
async function authorize(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)throw Error('AUTH_REQUIRED');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw Error('NOT_CONFIGURED');
 const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
 if(error||!user||user.is_anonymous||user.id!==HIGGSFIELD_PREVIEW_OWNER)throw Error('OWNER_ONLY');
 if(!ownerEnabled(process.env))throw Error('QA_DISABLED');
 return {owner:user.id,db:createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options)};
}
const fail=e=>respond({error:['AUTH_REQUIRED','OWNER_ONLY','QA_DISABLED'].includes(e.message)?e.message:'QA_UNAVAILABLE'},e.message==='AUTH_REQUIRED'?401:e.message==='OWNER_ONLY'?403:e.message==='QA_DISABLED'?503:503);
function queueUrl(endpoint,id,suffix=''){const root=endpoint.split('/').slice(0,2).join('/');if(!uuid.test(id))throw Error('BAD_REQUEST_ID');return 'https://queue.fal.run/'+root+'/requests/'+id+suffix}
async function falFetch(url,init={}){
 const key=process.env.FAL_KEY;
 if(!key)throw Error('FAL_KEY_MISSING');
 const response=await fetch(url,{...init,headers:{Authorization:'Key '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),cache:'no-store'});
 if(!response.ok)throw Error('FAL_HTTP_'+response.status);
 return response.json();
}
const publicFields='id,model_key,status,created_at,provider_request_id,output_path,error_code,budget_reservation_micros';
async function ownedJob(db,owner,id){
 if(!uuid.test(id||''))throw Error('BAD_JOB');
 const {data,error}=await db.from('k4k_owner_creative_qa_jobs').select(publicFields+',endpoint').eq('id',id).eq('owner_id',owner).maybeSingle();
 if(error||!data)throw Error('JOB_NOT_FOUND');return data;
}
const outputBucket=model=>['seedance_2_5','kling4_0'].includes(model)?'studio-generations':'studio-qa-images';
async function signedOutput(db,path,model){
 const {data,error}=await db.storage.from(outputBucket(model)).createSignedUrl(path,600);
 if(error||!data?.signedUrl)throw Error('PRIVATE_SIGNING_FAILED');return data.signedUrl;
}
function trustedOutput(url){let u;try{u=new URL(url)}catch{throw Error('UNTRUSTED_OUTPUT')}if(u.protocol!=='https:'||!(u.hostname==='fal.media'||u.hostname.endsWith('.fal.media')))throw Error('UNTRUSTED_OUTPUT');return u.href}
async function archiveOutput(db,owner,job,result){
 const raw=job.model_key==='seedance_2_5'||job.model_key==='kling4_0'?result.video?.url:result.images?.[0]?.url;
 if(!raw)throw Error('OUTPUT_MISSING');
 const address=trustedOutput(raw),video=['seedance_2_5','kling4_0'].includes(job.model_key),contentType=video?'video/mp4':job.model_key==='flux_3_image'?'image/jpeg':'image/png';
 const res=await fetch(address,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000)});
 const buffer=await boundedCreativeDownload(res,{mime:contentType,maxBytes:video?70_000_000:12_000_000});
 const path=owner+'/owner-qa/'+job.id+(video?'.mp4':job.model_key==='flux_3_image'?'.jpg':'.png');
 const {error}=await db.storage.from(outputBucket(job.model_key)).upload(path,buffer,{contentType,upsert:false});
 if(error&&!/already exists|duplicate/i.test(error.message||''))throw Error('PRIVATE_STORE_FAILED');
 const {error:updateError}=await db.from('k4k_owner_creative_qa_jobs').update({output_path:path,status:'completed',updated_at:new Date().toISOString()}).eq('id',job.id).eq('owner_id',owner).eq('status','submitted');
 if(updateError)throw Error('OUTPUT_RECORD_FAILED');
 return path;
}
export async function GET(request){
 try{const {owner,db}=await authorize(request);
 const {data,error}=await db.from('k4k_owner_creative_qa_jobs').select(publicFields).eq('owner_id',owner).order('created_at',{ascending:false}).limit(10);
 if(error)throw Error('DB_UNAVAILABLE');
 return respond({enabled:true,models:Object.keys(models),maxTestsPerUtcDay:3,ownerTests:data||[],creditsCharged:false});
 }catch(e){return fail(e)}
}
export async function POST(request){
 let ctx;try{ctx=await authorize(request)}catch(e){return fail(e)}
 const {db,owner}=ctx;
 let input;try{input=await request.json()}catch{return respond({error:'BAD_JSON'},400)}
 if(!input||typeof input!=='object'||Array.isArray(input))return respond({error:'BAD_INPUT'},400);
 if(input.action==='start'){
  const model=models[input.modelKey];
  const prompt=typeof input.prompt==='string'?input.prompt.trim():'';
  const aspect=['9:16','16:9','1:1'].includes(input.aspect)?input.aspect:'9:16';
  if(!model||!uuid.test(input.requestKey||'')||prompt.length<10||prompt.length>1200)return respond({error:'INVALID_TEST_INPUT'},422);
  const hash=createHash('sha256').update(JSON.stringify({prompt,aspect,modelKey:input.modelKey})).digest('hex');
  const {data:reserved,error:reserveError}=await db.rpc('k4k_owner_creative_qa_reserve',{p_owner:owner,p_key:input.requestKey,p_model:input.modelKey,p_endpoint:model.endpoint,p_hash:hash,p_micros:model.reserve});
  if(reserveError)return respond({error:/QA_DAILY_LIMIT|QA_TOTAL_LIMIT|QA_ACTIVE_JOB|IDEMPOTENCY_CONFLICT/.exec(reserveError.message)?.[0]||'QA_RESERVE_BLOCKED'},409);
  if(!reserved?.newly_reserved)return respond({jobId:reserved?.id,status:reserved?.status,duplicate:true});
  const jobId=reserved.id;
  try{
   const created=await falFetch('https://queue.fal.run/'+model.endpoint,{method:'POST',body:JSON.stringify(model.args(prompt,aspect))});
   if(!uuid.test(created.request_id||''))throw Error('PROVIDER_ID_UNVERIFIED');
   const {data:saved,error:dbError}=await db.from('k4k_owner_creative_qa_jobs').update({provider_request_id:created.request_id,status:'submitted',updated_at:new Date().toISOString()}).eq('id',jobId).eq('owner_id',owner).eq('status','dispatching').select('id').single();
   if(dbError||!saved)throw Error('SUBMISSION_RECORD_UNCERTAIN');
   return respond({jobId,status:'submitted',providerStatus:created.status,estimatedCapUsd:model.reserve/1e6,estimateOnly:true,creditsCharged:0},202);
  }catch(e){
   // Never auto-retry after an uncertain fal submission; it could charge twice.
   const maybeDispatched=/^(FAL_HTTP_4\d\d)$/.test(e.message)?'failed':'review';
   await db.from('k4k_owner_creative_qa_jobs').update({status:maybeDispatched,error_code:maybeDispatched==='review'?'SUBMISSION_UNCERTAIN':'PROVIDER_REJECTED',updated_at:new Date().toISOString()}).eq('id',jobId).eq('owner_id',owner).eq('status','dispatching');
   return respond({error:maybeDispatched==='review'?'SUBMISSION_UNCERTAIN_DO_NOT_RETRY':'PROVIDER_REJECTED',jobId},maybeDispatched==='review'?202:502);
  }
 }
 if(input.action==='status'){
  try{
   const job=await ownedJob(db,owner,input.jobId);
   if(job.output_path)return respond({jobId:job.id,status:'completed',url:await signedOutput(db,job.output_path,job.model_key),creditsCharged:0});
   if(job.status!=='submitted')return respond({jobId:job.id,status:job.status,error:job.error_code});
   const provider=await falFetch(queueUrl(job.endpoint,job.provider_request_id,'/status'));
   if(provider.status!=='COMPLETED')return respond({jobId:job.id,status:provider.status,creditsCharged:0});
   if(provider.error){await db.from('k4k_owner_creative_qa_jobs').update({status:'failed',error_code:'PROVIDER_FAILURE',updated_at:new Date().toISOString()}).eq('id',job.id).eq('owner_id',owner).eq('status','submitted');return respond({jobId:job.id,status:'failed'})}
   const result=await falFetch(queueUrl(job.endpoint,job.provider_request_id));
   const path=await archiveOutput(db,owner,job,result);
   return respond({jobId:job.id,status:'completed',url:await signedOutput(db,path,job.model_key),creditsCharged:0});
  }catch(e){return respond({error:['BAD_JOB','JOB_NOT_FOUND'].includes(e.message)?e.message:'STATUS_UNAVAILABLE'},e.message==='JOB_NOT_FOUND'?404:503)}
 }
 return respond({error:'UNKNOWN_ACTION'},400);
}
