import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
export async function POST(request){
 if(process.env.VERCEL_ENV!=='preview')return respond({error:'PREVIEW_ONLY'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return respond({error:'AUTH_UNAVAILABLE'},503);
 const supabase=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await supabase.auth.getUser(token);
 if(error||!user||user.is_anonymous||user.email?.toLowerCase()!=='hello@kreativestudios4k.com')return respond({error:'FORBIDDEN'},403);
 const credentials=process.env.HF_CREDENTIALS;
 if(typeof credentials!=='string'||!credentials.trim().length>0)return respond({authenticated:false,error:'CREDENTIAL_MISSING'},503);
 // The documented status GET is non-billable. A deliberately nonexistent UUID
 // probes authorization without submitting or charging for generation.
 const requestId='00000000-0000-4000-8000-000000000000';
 try{
  const response=await fetch('https://api.higgsfield.ai/requests/'+requestId+'/status',{
   method:'GET',headers:{Authorization:'Key '+credentials,Accept:'application/json'},
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)
  });
  // A not-found response can be returned by an auth gateway as well;
  // do not claim verified authentication without a documented auth endpoint.
  return respond({authenticated:false,probeCompleted:true,httpStatus:response.status,
   interpretation:response.status===401||response.status===403?'CREDENTIALS_REJECTED':response.status===404?'REQUEST_NOT_FOUND_AUTH_NOT_PROVEN':'AUTH_NOT_PROVEN',
   billableGenerationSubmitted:false});
 }catch{return respond({authenticated:false,probeCompleted:false,error:'PROVIDER_UNREACHABLE'},502)}
}
