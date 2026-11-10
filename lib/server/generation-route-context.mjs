import {createClient} from '@supabase/supabase-js';
import {verifyStudioMedia} from './studio-media-verification.mjs';
import {estimateK4KProviderCost,K4K_MODELS} from './k4k-models.mjs';
import {ownedMediaPath} from './generation-media.mjs';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export async function generationContext(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)throw Error('UNAUTHENTICATED');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!secret)throw Error('UNAVAILABLE');
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
 if(error||!user||user.is_anonymous)throw Error('UNAUTHENTICATED');
 let body;try{body=await request.json()}catch{throw Error('INVALID_JSON')}
 if(!uuid.test(body?.jobId??''))throw Error('INVALID_JOB');
 const database=createClient(url,secret,options);
 const {data:job,error:dbError}=await database.from('studio_generation_jobs').select('id,user_id,status,model,prompt,reference_paths,reference_video_path,provider_job_id,credits_reserved').eq('id',body.jobId).eq('user_id',user.id).maybeSingle();
 if(dbError)throw Error('UNAVAILABLE');
 if(!job)throw Error('NOT_FOUND');
 return {user,body,job,database};
}
export async function prepareGenerationInput(database,job,resolution){
 if(!K4K_MODELS[job.model])throw Error('UNSUPPORTED_MODEL');
 const verified=await verifyStudioMedia({client:database,userId:job.user_id,referencePaths:job.reference_paths,videoPath:job.reference_video_path});
 // This validates the trusted duration and resolution; pricing comes from /estimate.
 estimateK4KProviderCost(job.model,{resolution,sourceSeconds:verified.durationSeconds});
 async function sign(path,kind){
  const item=ownedMediaPath(job.user_id,path,kind);
  const {data,error}=await database.storage.from(item.bucket).createSignedUrl(item.path,3600);
  if(error||!data?.signedUrl)throw Error('MEDIA_SIGNING_UNAVAILABLE');
  return data.signedUrl;
 }
 return {input:{video_url:await sign(job.reference_video_path,'video'),image_urls:await Promise.all(job.reference_paths.map(path=>sign(path,'image'))),prompt:job.prompt??'',resolution},sourceSeconds:verified.durationSeconds,referenceSeconds:job.model==='lite'?verified.durationSeconds:0};
}
export function generationError(error){
 const code=error?.authenticated&&error?.message==='PROVIDER_QUOTE_INVALID'?'PROVIDER_QUOTE_REQUIRES_PRICE_POLICY':error?.message;
 const statuses={UNAUTHENTICATED:401,BILLING_REVIEW_REQUIRED:409,INSUFFICIENT_CREDITS:409,IDEMPOTENCY_CONFLICT:409,PROVIDER_QUOTE_REQUIRES_PRICE_POLICY:503,NOT_FOUND:404,INVALID_JSON:400,INVALID_JOB:400,JOB_NOT_DRAFT:409,QUOTE_INVALID:409,QUOTE_EXPIRED:409,QUOTE_CHANGED:409,GENERATION_DISABLED:503,TEST_GENERATION_NOT_AUTHORIZED:403,CREDIT_PRICING_NOT_APPROVED:503,CREDIT_PRICING_NOT_CONFIGURED:503,PROVIDER_BUDGET_BLOCKED:503,PROVIDER_SUBMISSION_UNCERTAIN:202,PROVIDER_RECORDING_REQUIRES_RECONCILIATION:202,PROVIDER_CREDENTIALS_REJECTED:502,PROVIDER_ACCESS_OR_BALANCE_BLOCKED:502};
 const safe=Object.hasOwn(statuses,code)?code:'GENERATION_UNAVAILABLE';
 return Response.json({error:safe,providerAuthenticated:error?.authenticated===true,reconciliationRequired:statuses[code]===202},{status:statuses[code]??503,headers:{'Cache-Control':'no-store'}});
}
