import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {genjutsuEstimate} from '../../../../lib/server/higgsfield-genjutsu-motion.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const OWNER='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
export async function POST(request){
 if(process.env.VERCEL_ENV!=='preview')return reply({error:'NOT_AVAILABLE'},404);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'INVALID_ORIGIN'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return reply({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return reply({error:'AUTH_NOT_CONFIGURED'},503);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await auth.auth.getUser(token);
 if(error||!user||user.is_anonymous||user.id!==OWNER)return reply({error:'NOT_AVAILABLE'},404);
 let body;try{body=await request.json()}catch{return reply({error:'INVALID_REQUEST'},400)}
 if(!body||Array.isArray(body)||Object.keys(body).some(k=>!['seconds','resolution','imageCount'].includes(k)))
  return reply({error:'INVALID_REQUEST'},400);
 if(typeof body.seconds!=='number'||!Number.isFinite(body.seconds)
  ||!Number.isSafeInteger(body.imageCount)||body.imageCount<1||body.imageCount>8)
  return reply({error:'INVALID_MEDIA_SELECTION'},400);
 try{
  const estimate=genjutsuEstimate({sourceSeconds:body.seconds,resolution:body.resolution});
  return reply({
   status:'estimate_only',referenceImages:body.imageCount,sourceSeconds:body.seconds,
   billedSeconds:estimate.duration,resolution:estimate.resolution,estimatedProviderUsd:estimate.usd,
   providerRateType:'published_estimate_not_verified_invoice',
   verifiedVideoDuration:false,verifiedInputStorage:false,verifiedProviderCharge:false,
   signedQuote:false,creditsReserved:false,providerDispatched:false,generationEnabled:false,
   nextRequirement:'SERVER_MEDIA_VERIFICATION_AND_APPROVED_RATE_CARD'
  });
 }catch{return reply({error:'INVALID_DURATION_OR_RESOLUTION'},400)}
}
