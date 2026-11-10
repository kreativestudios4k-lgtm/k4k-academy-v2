import {higgsfieldAuthorization} from '../../../../lib/server/higgsfield-auth.mjs';
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
 if(typeof credentials!=='string'||credentials.trim().length===0)return respond({authenticated:false,error:'CREDENTIAL_MISSING'},503);
 let authorization;
 try{authorization=higgsfieldAuthorization(credentials)}catch{return respond({authenticated:false,error:'CREDENTIAL_INVALID'},503)}
 // The documented status GET is non-billable. A deliberately nonexistent UUID
 // probes authorization without submitting or charging for generation.
 const requestId='00000000-0000-4000-8000-000000000000';
 try{
  const response=await fetch('https://api.higgsfield.ai/requests/'+requestId+'/status',{
   method:'GET',headers:{Authorization:authorization,Accept:'application/json'},
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)
  });
  // A not-found response can be returned by an auth gateway as well;
  // do not claim verified authentication without a documented auth endpoint.
  return respond({authenticated:false,probeCompleted:true,httpStatus:response.status,
   interpretation:response.status===401||response.status===403?'CREDENTIALS_REJECTED':response.status===404?'REQUEST_NOT_FOUND_AUTH_NOT_PROVEN':'AUTH_NOT_PROVEN',
   billableGenerationSubmitted:false});
 }catch{return respond({authenticated:false,probeCompleted:false,error:'PROVIDER_UNREACHABLE'},502)}
}

// Preview-only diagnostic: fixed public sample, cached per worker. This calls
// /estimate only, never a generation endpoint or a customer's private media.
let diagnostic;
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview')return respond({error:'PREVIEW_ONLY'},403);
 if(diagnostic&&diagnostic.until>Date.now())return respond(await diagnostic.promise);
 const promise=(async()=>{
  try{
   const {createHiggsfieldRest}=await import('../../../../lib/server/higgsfield-rest.mjs');
   const quote=await createHiggsfieldRest({credentials:process.env.HF_CREDENTIALS}).estimate('pro',{
    video_url:'https://kreativestudios4k.com/videos/template-1.mp4',
    image_urls:['https://kreativestudios4k.com/videos/template-1.webp'],resolution:'720p',prompt:''
   });
   return {authenticated:true,probeCompleted:true,providerQuoteVerified:true,quoteUsd:quote.usd,billableGenerationSubmitted:false};
  }catch(error){
   const known=['PROVIDER_CREDENTIALS_REJECTED','PROVIDER_ACCESS_OR_BALANCE_BLOCKED','PROVIDER_UNREACHABLE','PROVIDER_QUOTE_INVALID','PROVIDER_REQUEST_REJECTED'];
   return {authenticated:false,probeCompleted:true,error:known.includes(error.message)?error.message:'CREDENTIAL_INVALID',httpStatus:error.httpStatus??null,billableGenerationSubmitted:false};
  }
 })();
 diagnostic={until:Date.now()+60000,promise};
 return respond(await promise);
}
