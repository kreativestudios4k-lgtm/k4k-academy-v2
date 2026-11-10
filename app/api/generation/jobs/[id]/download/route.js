import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const NO_STORE={'Cache-Control':'no-store'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const respond=(body,status)=>NextResponse.json(body,{status,headers:NO_STORE});

// Return a short-lived signed URL only after authenticating the job owner.
export async function GET(request,{params}){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 const {id}=await params;
 if(!UUID.test(id||''))return respond({error:'INVALID_JOB_ID'},400);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!serviceKey)return respond({error:'UNAVAILABLE'},503);
 try{
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}={},error:authError}=await auth.auth.getUser(token);
  if(authError||!user||user.is_anonymous)return respond({error:'UNAUTHENTICATED'},401);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:job,error:readError}=await admin.from('studio_generation_jobs')
   .select('id,user_id,status,output_path').eq('id',id).eq('user_id',user.id).maybeSingle();
  if(readError)return respond({error:'UNAVAILABLE'},503);
  if(!job)return respond({error:'JOB_NOT_FOUND'},404);
  if(job.status!=='completed'||!job.output_path)return respond({error:'OUTPUT_NOT_READY'},409);
  const path=job.output_path;
  if(typeof path!=='string'||path!==user.id+'/'+id+'.mp4')
   return respond({error:'INVALID_OUTPUT_PATH'},409);
  const {data:signed,error:signError}=await admin.storage.from('studio-generations').createSignedUrl(path,60,{download:true});
  if(signError||!signed?.signedUrl)return respond({error:'OUTPUT_UNAVAILABLE'},503);
  return respond({url:signed.signedUrl,expiresIn:60},200);
 }catch{return respond({error:'UNAVAILABLE'},503)}
}
