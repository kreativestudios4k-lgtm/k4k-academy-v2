import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {verifyStudioMedia} from '../../../../../lib/server/studio-media-verification.mjs';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const reply=(body,status)=>NextResponse.json(body,{status,headers});
export async function POST(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return reply({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!serviceKey)return reply({error:'UNAVAILABLE'},503);
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await auth.auth.getUser(token);
 if(error||!user||user.is_anonymous)return reply({error:'UNAUTHENTICATED'},401);
 let body;
 try{body=await request.json()}catch{return reply({error:'INVALID_JSON'},400)}
 if(!body||typeof body.jobId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.jobId))return reply({error:'INVALID_JOB'},400);
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:job,error:jobError}=await admin.from('studio_generation_jobs').select('id,user_id,status,model,reference_paths,reference_video_path').eq('id',body.jobId).eq('user_id',user.id).maybeSingle();
 if(jobError)return reply({error:'UNAVAILABLE'},503);
 if(!job)return reply({error:'NOT_FOUND'},404);
 if(job.status!=='draft'||!['lite','pro'].includes(job.model))return reply({error:'INVALID_JOB_STATE'},409);
 try{
  const verified=await verifyStudioMedia({client:admin,userId:user.id,referencePaths:job.reference_paths,videoPath:job.reference_video_path});
  return reply({jobId:job.id,mediaVerified:true,durationVerified:verified.durationVerified,images:verified.images,generationEnabled:false,creditsReserved:0,note:'Private media verified. Duration and provider billing still require trusted verification; generation disabled.'},200);
 }catch{return reply({error:'MEDIA_VERIFICATION_FAILED'},422)}
}
