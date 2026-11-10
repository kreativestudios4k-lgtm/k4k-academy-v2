// Preview-only, single-job operator smoke test. No customer billing flags are enabled.
import {timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createHiggsfieldRest} from '../../../../lib/server/higgsfield-rest.mjs';
import {createTrustedProviderMp4Downloader} from '../../../../lib/server/trusted-provider-mp4-downloader.mjs';
import {createGenerationOutputIngestor} from '../../../../lib/server/generation-output-ingestion.mjs';
import {createGenerationOutputVerifier} from '../../../../lib/server/generation-output-verifier.mjs';
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
export async function POST(){return json({error:'APPROVED_TEST_ALREADY_SUBMITTED'},410)}
export async function GET(request){
 try{
  const {db,provider}=context(request);
  const {data:job,error}=await db.from('studio_generation_jobs').select('id,status,provider_job_id,output_path').eq('id',jobId).eq('user_id',userId).single();
  if(error)throw Error('JOB_UNAVAILABLE');
  if(!job.provider_job_id)return json(job);
  return json({job,...await provider.status(job.provider_job_id)});
 }catch(error){return json({error:error.message},error.message==='FORBIDDEN'?403:503)}
}

// Collect the same approved request without ever submitting a second generation.
export async function PUT(request){
 try{
  const {db,provider}=context(request);
  const {data:job,error}=await db.from('studio_generation_jobs').select('status,provider_job_id,output_path').eq('id',jobId).eq('user_id',userId).single();
  if(error||!job.provider_job_id)throw Error('JOB_UNAVAILABLE');
  const outputPath=userId+'/'+jobId+'.mp4';
  const verify=createGenerationOutputVerifier({storage:db.storage,enabled:true});
  if(job.status!=='completed'){
   const status=await provider.status(job.provider_job_id);
   if(status.status!=='completed')return json({status:status.status});
   const download=createTrustedProviderMp4Downloader({enabled:true,fetchImpl:fetch,resolveTrustedUrl:async()=>status.video?.url,allowedHosts:['d3u0tzju9qaucj.cloudfront.net']});
   let exists=false;try{exists=await verify({userId,jobId,outputPath})}catch{}
   if(!exists){
    const media=await download({providerJobId:job.provider_job_id});
    await createGenerationOutputIngestor({storage:db.storage,enabled:true})({userId,jobId,providerJobId:job.provider_job_id,...media});
   }
   await verify({userId,jobId,outputPath});
   const saved=await db.from('studio_generation_jobs').update({status:'completed',output_path:outputPath}).eq('id',jobId).eq('user_id',userId).eq('provider_job_id',job.provider_job_id).eq('status','processing');
   if(saved.error)throw Error('OUTPUT_RECORD_FAILED');
  }
  await verify({userId,jobId,outputPath});
  const signed=await db.storage.from('studio-generations').createSignedUrl(outputPath,900);
  if(signed.error)throw Error('DELIVERY_FAILED');
  return json({status:'completed',jobId,url:signed.data.signedUrl,expiresIn:900});
 }catch(error){return json({error:error.message},error.message==='FORBIDDEN'?403:503)}
}
