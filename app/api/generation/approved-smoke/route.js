// Preview-only, single-job operator smoke test. No customer billing flags are enabled.
import {timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createHiggsfieldRest} from '../../../../lib/server/higgsfield-rest.mjs';
import {mp4DurationSeconds} from '../../../../lib/server/mp4-duration.mjs';
export const runtime='nodejs';
export const maxDuration=60;
const jobId='e561e30d-873e-4989-b882-c72d6add8531';
const userId='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
function context(request){
 const expected=process.env.K4K_APPROVED_SMOKE_TOKEN;
 const actual=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(process.env.VERCEL_ENV!=='preview'||!expected||actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))throw Error('FORBIDDEN');
 return {db:createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),provider:createHiggsfieldRest({credentials:process.env.HF_CREDENTIALS})};
}
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
export async function POST(request){
 try{
  const {db,provider}=context(request);
  const videoUrl='https://kreativestudios4k.com/videos/template-1.mp4';
  const source=await fetch(videoUrl,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!source.ok||Number(source.headers.get('content-length'))>50*1024*1024)throw Error('INPUT_UNAVAILABLE');
  const bytes=new Uint8Array(await source.arrayBuffer());
  if(bytes.length>50*1024*1024)throw Error('INPUT_TOO_LARGE');
  const seconds=mp4DurationSeconds(bytes);
  const input={video_url:videoUrl,image_urls:['https://kreativestudios4k.com/videos/template-1.webp'],resolution:'480p',prompt:'Preserve the people and their clothing from the reference image. Follow the original motion and camera movement.'};
  const quote=await provider.estimate('pro',input,{sourceSeconds:seconds});
  if(quote.usd>5)throw Error('BUDGET_EXCEEDED');
  const {data:claim,error}=await db.from('studio_generation_jobs').update({status:'queued',error_message:'Approved operator smoke test; customer credits untouched.'}).eq('id',jobId).eq('user_id',userId).eq('status','draft').select('id').maybeSingle();
  if(error)throw Error('CLAIM_FAILED');
  if(!claim)return json({status:'already_claimed',jobId});
  // Never reset this claim or retry a provider submission after an uncertain outcome.
  let result;
  try{result=await provider.submit('pro',input,{enabled:true,idempotencyKey:jobId,maxUsd:5,quotedUsd:quote.usd});}catch(error){return json({status:'submission_requires_review',jobId,error:error.message,httpStatus:error.httpStatus??null},202)}
  const saved=await db.from('studio_generation_jobs').update({status:'processing',provider_job_id:result.request_id}).eq('id',jobId).eq('user_id',userId);
  if(saved.error)return json({status:'recording_requires_review',jobId,providerJobId:result.request_id,quoteUsd:quote.usd},202);
  return json({status:'processing',jobId,providerJobId:result.request_id,quoteUsd:quote.usd,sourceSeconds:seconds});
 }catch(error){return json({error:error.message},error.message==='FORBIDDEN'?403:503)}
}
export async function GET(request){
 try{
  const {db,provider}=context(request);
  const {data:job,error}=await db.from('studio_generation_jobs').select('id,status,provider_job_id,output_path').eq('id',jobId).eq('user_id',userId).single();
  if(error)throw Error('JOB_UNAVAILABLE');
  if(!job.provider_job_id)return json(job);
  return json({job,...await provider.status(job.provider_job_id)});
 }catch(error){return json({error:error.message},error.message==='FORBIDDEN'?403:503)}
}
