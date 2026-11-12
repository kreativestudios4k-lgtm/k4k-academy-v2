import {falMotionEstimate} from '../../../../lib/server/fal-wan.mjs';
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {FAL_MOTION_TIERS} from '../../../../lib/k4k-motion-tiers.mjs';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const reply=(body,status=200)=>NextResponse.json(body,{status,headers});
export async function POST(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return reply({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return reply({error:'UNAVAILABLE'},503);
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await auth.auth.getUser(token);
 if(error||!user||user.is_anonymous)return reply({error:'UNAUTHENTICATED'},401);
 let body;
 try{body=await request.json()}catch{return reply({error:'INVALID_JSON'},400)}
 if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'INVALID_INPUT'},400);
 const {tier,resolution='720p',sourceSeconds,imageCount}=body;
 if(!Number.isInteger(imageCount)||imageCount<1||imageCount>8)return reply({error:'IMAGE_COUNT_OUT_OF_RANGE'},400);
 try{
  if(body.provider&&body.provider!=='fal')return reply({error:'UNSUPPORTED_PROVIDER'},400);
  const estimatedProviderUsd=falMotionEstimate(tier,{resolution,sourceSeconds}).usd;
  return reply({tier,model:FAL_MOTION_TIERS[tier].label,resolution,estimatedProviderUsd,estimatedOnly:true,
   note:'Estimate only. Source duration and reference media have not been independently verified. No credits reserved or provider request submitted.',
   generationEnabled:false});
 }catch{return reply({error:'UNSUPPORTED_GENERATION_CONFIGURATION'},400)}
}
