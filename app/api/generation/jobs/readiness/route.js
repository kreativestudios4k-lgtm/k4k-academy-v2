import {falMotionEstimate} from '../../../../../lib/server/fal-wan.mjs';
import {generationProviderName} from '../../../../../lib/server/generation-provider.mjs';
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {verifyStudioMedia} from '../../../../../lib/server/studio-media-verification.mjs';
import {estimateK4KProviderCost,K4K_MODELS} from '../../../../../lib/server/k4k-models.mjs';
export const runtime='nodejs';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return reply({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!secret)return reply({error:'UNAVAILABLE'},503);
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await auth.auth.getUser(token);
 if(error||!user||user.is_anonymous)return reply({error:'UNAUTHENTICATED'},401);
 let body;try{body=await request.json()}catch{return reply({error:'INVALID_JSON'},400)}
 if(typeof body?.jobId!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.jobId))return reply({error:'INVALID_JOB'},400);
 const resolution=body.resolution??'720p';
 if(!['480p','720p','1080p'].includes(resolution))return reply({error:'INVALID_RESOLUTION'},400);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:job,error:jobError}=await admin.from('studio_generation_jobs').select('id,user_id,status,provider,model,reference_paths,reference_video_path').eq('id',body.jobId).eq('user_id',user.id).maybeSingle();
 if(jobError)return reply({error:'UNAVAILABLE'},503);
 if(!job)return reply({error:'NOT_FOUND'},404);
 if(job.status!=='draft'||!K4K_MODELS[job.model])return reply({error:'INVALID_JOB_STATE'},409);
 const {data:account,error:balanceError}=await admin.from(process.env.VERCEL_ENV==='production'?'k4k_live_credit_accounts':'studio_credit_accounts').select('balance').eq('user_id',user.id).maybeSingle();
 if(balanceError)return reply({error:'CREDIT_ACCOUNT_UNAVAILABLE'},503);
 try{
  const verified=await verifyStudioMedia({client:admin,userId:user.id,referencePaths:job.reference_paths,videoPath:job.reference_video_path});
  const estimatedProviderUsd=generationProviderName(job)==='fal'?falMotionEstimate(job.model,{resolution,sourceSeconds:verified.durationSeconds}).usd:estimateK4KProviderCost(job.model,{resolution,sourceSeconds:verified.durationSeconds,referenceSeconds:job.model==='lite'?verified.durationSeconds:0});
  return reply({jobId:job.id,model:job.model,resolution,durationSeconds:verified.durationSeconds,images:verified.images,creditBalance:account?.balance??0,estimatedProviderUsd,customerCreditPrice:null,reservationReady:false,generationEnabled:false,reason:'CUSTOMER_CREDIT_PRICE_NOT_APPROVED',note:'Read-only readiness check. No credits reserved or provider requests made.'});
 }catch{return reply({error:'MEDIA_OR_DURATION_INVALID'},422)}
}
