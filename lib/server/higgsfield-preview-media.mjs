import {verifyStudioMedia} from './studio-media-verification.mjs';
import {genjutsuEstimate} from './higgsfield-genjutsu-motion.mjs';

// Read-only validation through the caller's RLS-scoped storage client.
// This result is informational, never a signed quote or dispatch authorization.
export async function inspectHiggsfieldPreviewMedia({client,userId,body}){
 if(!body||typeof body!=='object'||Array.isArray(body)
  ||Object.keys(body).some(k=>!['videoPath','referencePaths','resolution'].includes(k)))throw Error('INVALID_REQUEST');
 if(!['480p','720p','1080p'].includes(body.resolution))throw Error('INVALID_RESOLUTION');
 const media=await verifyStudioMedia({client,userId,videoPath:body.videoPath,referencePaths:body.referencePaths});
 const estimate=genjutsuEstimate({sourceSeconds:media.durationSeconds,resolution:body.resolution});
 return {
  status:'verified_media_estimate',sourceSeconds:media.durationSeconds,
  referenceImages:media.images,billedSeconds:estimate.duration,resolution:estimate.resolution,
  estimatedProviderUsd:estimate.usd,verifiedVideoDuration:true,verifiedInputStorage:true,
  providerRateType:'published_estimate_not_verified_invoice',verifiedProviderCharge:false,
  signedQuote:false,creditsReserved:false,providerDispatched:false,generationEnabled:false,
  nextRequirement:'IMMUTABLE_PROVIDER_MEDIA_AND_APPROVED_SIGNED_QUOTE'
 };
}

export function createHiggsfieldPreviewMediaHandler({env=process.env,createClient}){
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
 return async request=>{
  if(env.VERCEL_ENV!=='preview')return reply({error:'NOT_AVAILABLE'},404);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'INVALID_ORIGIN'},403);
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return reply({error:'UNAUTHENTICATED'},401);
  const url=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return reply({error:'AUTH_NOT_CONFIGURED'},503);
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  let user;
  try{
   const result=await client.auth.getUser(token);
   if(result.error||!result.data?.user||result.data.user.is_anonymous)return reply({error:'UNAUTHENTICATED'},401);
   user=result.data.user;
  }catch{return reply({error:'AUTH_UNAVAILABLE'},503)}
  if(user.id!=='0ef1af08-4df8-4858-967b-eac1a16f9f2c')return reply({error:'NOT_AVAILABLE'},404);
  // Preflight before browser uploads; no storage or financial writes.
  if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
  let body;try{body=await request.json()}catch{return reply({error:'INVALID_REQUEST'},400)}
  if(body?.preflight===true&&Object.keys(body).length===1)return reply({uploadAllowed:true,generationEnabled:false});
  try{return reply(await inspectHiggsfieldPreviewMedia({client,userId:user.id,body}));}
  catch{return reply({error:'MEDIA_VERIFICATION_FAILED'},422)}
 };
}
