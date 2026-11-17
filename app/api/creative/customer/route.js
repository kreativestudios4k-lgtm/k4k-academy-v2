// Production customer creative generation: signed quotes, atomic live-credit reservations,
// irreversible one-shot dispatch, authenticated provider reconciliation and private per-user media URLs.
// Each model is independently gated; public Seedance has an additional paid-daily budget guard.
import {createClient} from '@supabase/supabase-js';
import {randomUUID,createHash} from 'node:crypto';
import {quoteSigner,generationCredits} from '../../../../lib/server/generation-quote.mjs';
import {assertResponsiblePrompt} from '../../../../lib/server/fal-wan.mjs';
import {createMultimodelLedger} from '../../../../lib/server/multimodel-ledger.mjs';
import {createMultimodelPrivateDelivery} from '../../../../lib/server/multimodel-private-delivery.mjs';
import {boundedCreativeDownload} from '../../../../lib/server/creative-qa-output.mjs';
import {CUSTOMER_CREATIVE_MODELS,creativeCustomerQuote,creativeCustomerRelease} from '../../../../lib/server/creative-customer-policy.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=300;
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private,no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
const options={auth:{persistSession:false,autoRefreshToken:false}};
const known=Object.entries(CUSTOMER_CREATIVE_MODELS);
const byModel=new Map(known.map(([id,m])=>[m.dbModel,{...m,id}]));
const hash=payload=>createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const budget=env=>{
 const daily=Math.round(Number(env.K4K_PROVIDER_DAILY_BUDGET_USD)*1e6);
 const total=Math.round(Number(env.K4K_PROVIDER_TOTAL_BUDGET_USD)*1e6);
 const active=Number(env.K4K_MAX_ACTIVE_JOBS_PER_USER);
 if(!Number.isSafeInteger(daily)||daily<1||daily>1e11||!Number.isSafeInteger(total)||total<1||total>1e11||!Number.isSafeInteger(active)||active<1||active>10)throw Error('BUDGET_NOT_CONFIGURED');
 return {dailyBudgetMicros:daily,totalBudgetMicros:total,maxActive:active};
};
async function auth(req){
 if(req.headers.get('origin')!==new URL(req.url).origin)throw Error('INVALID_ORIGIN');
 if(Number(req.headers.get('content-length')||0)>14000)throw Error('INVALID_INPUT');
 const token=req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)throw Error('UNAUTHENTICATED');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('UNAVAILABLE');
 const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
 if(error||!user||user.is_anonymous||!user.email_confirmed_at)throw Error('UNAUTHENTICATED');
 const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
 return {user,db};
}
async function owned(db,userId,jobId){
 if(!uuid.test(jobId||''))throw Error('INVALID_JOB');
 const {data,error}=await db.from('k4k_multimodel_jobs').select('*').eq('id',jobId).eq('user_id',userId).eq('provider','fal').maybeSingle();
 if(error)throw Error('UNAVAILABLE');
 if(!data||!byModel.has(data.model))throw Error('JOB_NOT_FOUND');
 return data;
}
async function fal(path,method='GET',input){
 const key=process.env.FAL_KEY;if(!key)throw Error('PROVIDER_CREDENTIALS_MISSING');
 const url='https://queue.fal.run/'+path;
 const res=await fetch(url,{method,headers:{Authorization:'Key '+key,'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});
 if(!res.ok){const err=Error(res.status===401?'PROVIDER_AUTH_FAILED':res.status===402||res.status===403?'PROVIDER_BALANCE_BLOCKED':'PROVIDER_HTTP_ERROR');err.http=res.status;throw err}
 return res.json();
}
async function state(db,userId,job){
 const model=byModel.get(job.model);
 if(!job.provider_request_id||!uuid.test(job.provider_request_id))throw Error('PROVIDER_REQUEST_UNVERIFIED');
 const base=model.endpoint.split('/').slice(0,2).join('/')+'/requests/'+job.provider_request_id;
 const info=await fal(base+'/status');
 if(info.request_id&&info.request_id!==job.provider_request_id)throw Error('PROVIDER_RESPONSE_INVALID');
 if(['IN_QUEUE','IN_PROGRESS'].includes(info.status))return {jobId:job.id,status:'processing'};
 if(info.status==='FAILED'){await refund(db,userId,job);return {jobId:job.id,status:'failed',refunded:true}}
 if(info.status!=='COMPLETED')throw Error('PROVIDER_STATUS_UNVERIFIED');
 let result;
 if(info.error||info.error_type){await refund(db,userId,job);return {jobId:job.id,status:'failed',refunded:true}}
 try{result=await fal(base)}catch(e){if([400,422].includes(e.http)){await refund(db,userId,job);return {jobId:job.id,status:'failed',refunded:true}}throw e}
 if(result.error||result.error_type){await refund(db,userId,job);return {jobId:job.id,status:'failed',refunded:true}}
 const media=model.kind==='video'?result.video?.url:result.images?.[0]?.url;
 let cdn;try{cdn=new URL(media)}catch{throw Error('PROVIDER_OUTPUT_MISSING')}
 if(cdn.protocol!=='https:'||cdn.username||cdn.password||cdn.port||cdn.hash||!(cdn.hostname==='fal.media'||cdn.hostname.endsWith('.fal.media')))throw Error('UNTRUSTED_OUTPUT_URL');
 const fetched=await fetch(cdn.href,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000)});
 const bytes=await boundedCreativeDownload(fetched,{mime:model.mime,maxBytes:model.kind==='video'?70_000_000:12_000_000});
 const ext=model.mime==='video/mp4'?'mp4':model.mime==='image/png'?'png':'jpg';
 const path=userId+'/'+job.id+'.'+ext;
 const {error:uploadError}=await db.storage.from(model.bucket).upload(path,bytes,{contentType:model.mime,upsert:false});
 if(uploadError){
  // Treat an identical existing object as a recoverable post-upload settlement, never overwrite.
  const {data:details,error:infoErr}=await db.storage.from(model.bucket).info(path);
  if(infoErr||!details||Number(details.size)!==bytes.length||String(details.contentType||details.metadata?.mimetype||'').split(';')[0]!==model.mime)throw Error('OUTPUT_STORAGE_REVIEW');
 }
 const ledger=createMultimodelLedger({client:db,enabled:true});
 await ledger.finish({userId,jobId:job.id,outcome:'completed',contentType:model.mime,outputPath:path});
 return {jobId:job.id,status:'completed',creditsCharged:job.credits_quoted};
}
async function refund(db,userId,job){
 const digest=hash(['fal-confirmed-terminal-v1',job.provider_request_id,'failed']);
 const {data,error}=await db.rpc('k4k_multimodel_refund_confirmed_provider_failure',{
  p_user:userId,p_job:job.id,p_provider_request:job.provider_request_id,p_terminal_status:'failed',p_evidence_digest:digest});
 if(error||data?.status!=='refunded')throw Error('REFUND_REVIEW_REQUIRED');
}
async function signed(db,userId,jobId,download){
 const job=await owned(db,userId,jobId);
 const model=byModel.get(job.model);
 return createMultimodelPrivateDelivery({jobStore:{getOwnedJob:(uid,id)=>owned(db,uid,id)},storage:db.storage,bucket:model.bucket,enabled:true}).getSignedUrl({userId,jobId,download:download===true});
}
export async function POST(req){
 let ctx;try{ctx=await auth(req)}catch(e){return response({error:e.message==='UNAUTHENTICATED'?'UNAUTHENTICATED':e.message==='INVALID_ORIGIN'?'INVALID_ORIGIN':'UNAVAILABLE'},e.message==='UNAUTHENTICATED'?401:403)}
 let body;try{const str=await req.text();if(str.length>14000)throw Error();body=JSON.parse(str);if(!body||Array.isArray(body)||typeof body!=='object')throw Error()}catch{return response({error:'INVALID_INPUT'},400)}
 const {user,db}=ctx;
 try{
 if(body.action==='models')return response({models:known.map(([id,m])=>({id,kind:m.kind,enabled:creativeCustomerRelease(process.env,id,user.id)}))});
 if(body.action==='quote'){
  const model=creativeCustomerQuote(body.modelId,process.env,user.id);
  const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
  const aspect=['9:16','16:9','1:1'].includes(body.aspect)?body.aspect:null;
  if(!aspect||prompt.length<10||prompt.length>1200)throw Error('INVALID_INPUT');
  if(body.modelId==='seedance_2_5'){
   // One paid Seedance request per account per UTC day. SQL unique index is the
   // authoritative concurrency barrier at credit-reservation transition.
   const today=new Date().toISOString().slice(0,10)+'T00:00:00.000Z';
   const {count,error:seedanceCheck}=await db.from('k4k_multimodel_jobs').select('id',{head:true,count:'exact'}).eq('user_id',user.id).eq('model','seedance-25-t2v').gte('created_at',today).in('status',['queued','processing','completed','failed']);
   if(seedanceCheck)throw Error('UNAVAILABLE');
   if(count>0)throw Error('SEEDANCE_DAILY_LIMIT');
  }
  assertResponsiblePrompt(prompt);
  const {count,error:limitError}=await db.from('k4k_multimodel_jobs').select('id',{head:true,count:'exact'}).eq('user_id',user.id).eq('provider','fal').eq('status','draft').gte('created_at',new Date(Date.now()-600000).toISOString());
  if(limitError)throw Error('UNAVAILABLE');if(count>=5)throw Error('TOO_MANY_QUOTES');
  budget(process.env);
  const credits=generationCredits(model.quoteUsdMicros/1e6);
  const {data:account,error:accountError}=await db.from('k4k_live_credit_accounts').select('balance,billing_hold').eq('user_id',user.id).maybeSingle();
  if(accountError)throw Error('UNAVAILABLE');if(!account||account.billing_hold||account.balance<credits)throw Error(account?.billing_hold?'BILLING_REVIEW_REQUIRED':'INSUFFICIENT_CREDITS');
  const jobId=randomUUID(),fingerprint=hash(['creative-customer-v1',user.id,jobId,body.modelId,model.endpoint,prompt,aspect,model.quoteUsdMicros,credits]);
  const signing=process.env.K4K_CREATIVE_QUOTE_SECRET;
  if(!signing||signing.length<32)throw Error('QUOTE_SIGNING_UNAVAILABLE');
  const signer=quoteSigner(signing),token=signer.issue({provider:'fal',userId:user.id,jobId,modelId:body.modelId,usdMicros:model.quoteUsdMicros,credits,fingerprint});
  const signedQuote=signer.verify(token);
  const {error}=await db.from('k4k_multimodel_jobs').insert({
   id:jobId,user_id:user.id,provider:'fal',model:model.dbModel,media_kind:model.kind,status:'draft',prompt,
   normalized_input:{aspect_ratio:aspect,endpoint:model.endpoint},input_fingerprint:fingerprint,
   quoted_usd_micros:model.quoteUsdMicros,credits_quoted:credits,quote_expires_at:new Date(signedQuote.expiresAt).toISOString()
  });
  if(error)throw Error('JOB_CREATION_FAILED');
  return response({jobId,modelId:body.modelId,credits,quotedProviderUsd:model.quoteUsdMicros/1e6,quoteToken:token,expiresAt:signedQuote.expiresAt,estimateOnly:true,providerChargeMayVary:true,...(model.providerBilling==='variable-tokens-public-beta'?{tokenBillingUnverified:true,publicBeta:true,providerBillingUnit:'1000 tokens',providerUnitRateUsd:0.0214,usageLimit:'1 per UTC day',fixedCustomerPriceCredits:credits}:{})});
 }
 if(body.action==='submit'){
  if(!uuid.test(body.requestKey||''))throw Error('INVALID_INPUT');
  const job=await owned(db,user.id,body.jobId),model=byModel.get(job.model);
  if(!creativeCustomerRelease(process.env,model.id,user.id))throw Error('CREATIVE_MODEL_NOT_LIVE');
  if(model.id==='seedance_2_5'&&job.status==='draft'){
   const today=new Date().toISOString().slice(0,10)+'T00:00:00.000Z';
   const {count,error}=await db.from('k4k_multimodel_jobs').select('id',{head:true,count:'exact'}).eq('user_id',user.id).eq('model','seedance-25-t2v').neq('id',job.id).gte('created_at',today).in('status',['queued','processing','completed','failed']);
   if(error)throw Error('UNAVAILABLE');
   if(count>0)throw Error('SEEDANCE_DAILY_LIMIT');
  }
  const signing=process.env.K4K_CREATIVE_QUOTE_SECRET;
  if(!signing||signing.length<32)throw Error('QUOTE_SIGNING_UNAVAILABLE');
  const signed=quoteSigner(signing).verify(body.quoteToken);
  if(signed.jobId!==job.id||signed.userId!==user.id||signed.modelId!==model.id||
   signed.usdMicros!==job.quoted_usd_micros||signed.credits!==job.credits_quoted||
   signed.fingerprint!==job.input_fingerprint)throw Error('QUOTE_CHANGED');
  if(job.status==='processing'||job.status==='completed'||job.status==='failed')return response({jobId:job.id,status:job.status});
  if(!['draft','queued'].includes(job.status))throw Error('INVALID_JOB_STATE');
  if(new Date(job.quote_expires_at).getTime()<=Date.now()+25000)throw Error('QUOTE_EXPIRED');
  // Fail BEFORE atomically reserving credits or claiming an irreversible dispatch.
  if(typeof process.env.FAL_KEY!=='string'||!process.env.FAL_KEY.trim())throw Error('PROVIDER_CREDENTIALS_MISSING');
  const b=budget(process.env);
  const ledger=createMultimodelLedger({client:db,enabled:true});
  await ledger.reserve({userId:user.id,jobId:job.id,requestKey:body.requestKey,inputFingerprint:job.input_fingerprint,quoteMicros:job.quoted_usd_micros,credits:job.credits_quoted,...b});
  const {data:claim,error:claimError}=await db.rpc('k4k_multimodel_claim_dispatch',{p_user:user.id,p_job:job.id});
  if(claimError||!claim||claim.job_id!==job.id||typeof claim.claimed!=='boolean')throw Error('DISPATCH_CLAIM_REVIEW');
  if(!claim.claimed)return response({jobId:job.id,status:claim.state||'queued',reviewRequired:true});
  let created;
  try{created=await fal(model.endpoint,'POST',model.input(job.prompt,job.normalized_input.aspect_ratio))}
  catch{throw Error('SUBMISSION_UNCERTAIN_DO_NOT_RETRY')}
  if(!uuid.test(created.request_id||''))throw Error('SUBMISSION_UNCERTAIN_DO_NOT_RETRY');
  const {data:record,error:recErr}=await db.rpc('k4k_multimodel_record_provider_request',{p_user:user.id,p_job:job.id,p_provider_request:created.request_id});
  if(recErr||record?.status!=='processing'||record?.job_id!==job.id)throw Error('PROVIDER_RECORDING_REVIEW');
  return response({jobId:job.id,status:'processing',creditsReserved:job.credits_quoted},202);
 }
 if(body.action==='status'){
  let job=await owned(db,user.id,body.jobId);
  if(job.status==='processing')return response(await state(db,user.id,job));
  return response({jobId:job.id,status:job.status,credits:job.credits_quoted});
 }
 if(body.action==='download')return response(await signed(db,user.id,body.jobId,body.download));
 if(body.action==='list'){
  const {data,error}=await db.from('k4k_multimodel_jobs').select('id,model,status,media_kind,credits_quoted,created_at').eq('user_id',user.id).eq('provider','fal').in('model',[...byModel.keys()]).neq('status','draft').order('created_at',{ascending:false}).limit(20);
  if(error)throw Error('UNAVAILABLE');
  return response({jobs:data});
 }
 return response({error:'INVALID_ACTION'},400);
 }catch(e){
  const allowed=new Set(['CREATIVE_MODEL_NOT_LIVE','INVALID_INPUT','CONTENT_POLICY_BLOCKED','TOO_MANY_QUOTES','SEEDANCE_DAILY_LIMIT','INSUFFICIENT_CREDITS','BILLING_REVIEW_REQUIRED','QUOTE_EXPIRED','QUOTE_CHANGED','SUBMISSION_UNCERTAIN_DO_NOT_RETRY','PROVIDER_RECORDING_REVIEW','DISPATCH_CLAIM_REVIEW','PROVIDER_BUDGET_BLOCKED','REFUND_REVIEW_REQUIRED','OUTPUT_STORAGE_REVIEW','PROVIDER_STATUS_UNVERIFIED','INVALID_JOB_STATE','JOB_NOT_FOUND','UNAVAILABLE']);
  const code=allowed.has(e.message)?e.message:'GENERATION_UNAVAILABLE';
  return response({error:code,reviewRequired:/REVIEW|UNCERTAIN/.test(code)},['INSUFFICIENT_CREDITS','BILLING_REVIEW_REQUIRED','QUOTE_EXPIRED','QUOTE_CHANGED','TOO_MANY_QUOTES','SEEDANCE_DAILY_LIMIT'].includes(code)?409:code==='CREATIVE_MODEL_NOT_LIVE'?503:code==='JOB_NOT_FOUND'?404:code==='INVALID_INPUT'?400:code==='CONTENT_POLICY_BLOCKED'?422:code==='SUBMISSION_UNCERTAIN_DO_NOT_RETRY'?202:503);
 }
}
