import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createHiggsfieldPlatformApi} from '../../../../lib/server/higgsfield-platform-api.mjs';
import {genjutsuEstimate} from '../../../../lib/server/higgsfield-genjutsu-motion.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const KEY='genjutsu-owner-first-480p-20261117';
// Permanently close this already-used paid QA path. A new test requires reviewed media,
// a matching scene prompt, an independent ledger key and fresh explicit approval.
const FIRST_PAID_TEST_CLOSED=true;
const USER_ID='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
const VIDEO='https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/85a1d371-b29e-435d-8a28-44f39132716f.mp4';
const IMAGES=[
 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/7e61b364-13b6-463a-91d8-0ff114bb37ce.jpg',
 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/37cbd4c4-4b94-4726-9006-f3665607d609.jpg'
];
const PROMPT='Replace the two people in the uploaded vertical TV interview video with the two uploaded reference characters, preserving the original acting and camera movements. The seated foreground speaker is the footballer from reference image 1 wearing the exact dark navy Santos FC Umbro jersey, red captain armband, curled highlighted hair, facial hair and visible neck tattoos. The standing person facing the camera is the grey-haired glasses-wearing man from reference image 2 wearing his black printed sweatshirt. Preserve the original stage, background, lighting, shot timing and natural body anatomy. Keep the two identities, outfits and faces distinct. No extra people, face blends, extra limbs, distortions, text, new logos or changed camera angles.';
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
async function owner(request,{mutation=false}={}){
 const env=process.env;
 if(env.VERCEL_ENV!=='preview'||env.K4K_HIGGSFIELD_OWNER_PAID_QA_ENABLED!=='true')return {status:404,error:'NOT_AVAILABLE'};
 if(!env.HF_CREDENTIALS||!env.SUPABASE_SERVICE_ROLE_KEY||!env.NEXT_PUBLIC_SUPABASE_URL||!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return {status:503,error:'TEST_NOT_CONFIGURED'};
 if(mutation&&request.headers.get('origin')!==new URL(request.url).origin)return {status:403,error:'INVALID_ORIGIN'};
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return {status:401,error:'UNAUTHENTICATED'};
 const auth=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await auth.auth.getUser(token);
 if(error||!user||user.is_anonymous||user.id!==USER_ID)return {status:404,error:'NOT_AVAILABLE'};
 const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 return {db,credential:env.HF_CREDENTIALS};
}
const cost=genjutsuEstimate({sourceSeconds:4.133333,resolution:'480p'});
function publicJob(row){
 return {state:row?.state??'not_started',estimatedCostUsd:cost.usd,secondsBilled:cost.duration,
  requestId:row?.provider_request_id??null,videoUrl:row?.state==='completed'?row.result_video_url:null,
  errorCode:row?.error_code??null};
}
export async function POST(request){
 if(FIRST_PAID_TEST_CLOSED)return respond({error:'FIRST_PAID_TEST_CLOSED',reason:'SOURCE_PROMPT_MISMATCH',noRetry:true},410);
 const a=await owner(request,{mutation:true});if(a.error)return respond({error:a.error},a.status);
 if(cost.usd>1.60||cost.duration!==5||cost.usd!==1.59)return respond({error:'COST_CAP_BLOCKED'},409);
 let body;try{body=await request.json()}catch{return respond({error:'INVALID_REQUEST'},400)}
 if(body?.confirmation!=='RUN_ONE_5_SECOND_480P_TEST'||Object.keys(body).length!==1)return respond({error:'CONFIRMATION_REQUIRED'},400);
 // Unique row is committed BEFORE sending any paid provider request.
 const {error:claimError}=await a.db.from('k4k_higgsfield_first_paid_qa').insert({
  test_key:KEY,user_id:USER_ID,state:'submitting',expected_cost_usd:cost.usd,source_video_url:VIDEO
 });
 if(claimError){
  if(claimError.code==='23505')return respond({error:'TEST_ALREADY_CLAIMED',statusUrl:'/api/higgsfield/first-paid-qa'},409);
  return respond({error:'TEST_LEDGER_UNAVAILABLE'},503);
 }
 try{
  const provider=createHiggsfieldPlatformApi({credentials:a.credential});
  const submitted=await provider.submit({enabled:true,modelPath:'higgsfield/genjutsu/motion-transfer/v1.0',
   input:{video_url:VIDEO,image_urls:IMAGES,prompt:PROMPT,resolution:'480p'}});
  const {error}=await a.db.from('k4k_higgsfield_first_paid_qa').update({
   state:'submitted',provider_request_id:submitted.request_id,updated_at:new Date().toISOString()
  }).eq('test_key',KEY).eq('user_id',USER_ID).eq('state','submitting');
  if(error)return respond({error:'PROVIDER_RECORDING_REQUIRES_RECONCILIATION',noRetry:true},503);
  return respond({state:'submitted',requestId:submitted.request_id,estimatedCostUsd:cost.usd,secondsBilled:cost.duration,oneTime:true},201);
 }catch(e){
  await a.db.from('k4k_higgsfield_first_paid_qa').update({state:'submission_uncertain',error_code:'PROVIDER_SUBMISSION_UNCERTAIN',updated_at:new Date().toISOString()}).eq('test_key',KEY).eq('state','submitting');
  return respond({error:'PROVIDER_SUBMISSION_UNCERTAIN',noRetry:true},503);
 }
}
export async function GET(request){
 const a=await owner(request);if(a.error)return respond({error:a.error},a.status);
 const {data:row,error}=await a.db.from('k4k_higgsfield_first_paid_qa').select('state,provider_request_id,result_video_url,error_code').eq('test_key',KEY).eq('user_id',USER_ID).maybeSingle();
 if(error)return respond({error:'TEST_LEDGER_UNAVAILABLE'},503);
 if(!row)return respond(publicJob(null));
 if(row.state==='failed'&&row.provider_request_id){
  // Read-only diagnostic for the original failed request. Never dispatch a new paid job,
  // change the failed ledger state, or expose the provider's arbitrary raw payload.
  try{
   const response=await fetch('https://api.higgsfield.ai/requests/'+encodeURIComponent(row.provider_request_id)+'/status',{
    method:'GET',headers:{Authorization:'Key '+a.credential,Accept:'application/json'},
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)
   });
   if(!response.ok)return respond({...publicJob(row),diagnostic:'PROVIDER_STATUS_UNAVAILABLE'});
   const payload=await response.json();
   const err=payload?.error;
   const code=typeof err==='object'&&err!==null?err.code??err.type:payload?.error_code;
   const rawMessage=typeof err==='string'?err:typeof err==='object'&&err!==null?err.message:payload?.message;
   const safe=value=>typeof value==='string'&&/^[\w .,:;()/\-]{1,180}$/u.test(value)?value:null;
   return respond({...publicJob(row),providerStatus:['failed','nsfw','canceled'].includes(payload?.status)?payload.status:'unknown',
    providerErrorCode:safe(code),providerErrorMessage:safe(rawMessage),diagnostic:err||payload?.error_code?'REASON_RECEIVED':'NO_DETAIL_RETURNED'});
  }catch{return respond({...publicJob(row),diagnostic:'PROVIDER_STATUS_UNAVAILABLE'});}
 }
 if(!row.provider_request_id||['completed','submission_uncertain'].includes(row.state))return respond(publicJob(row));
 try{
  const provider=createHiggsfieldPlatformApi({credentials:a.credential});
  const status=await provider.status(row.provider_request_id);
  const terminal=['failed','nsfw','canceled'].includes(status.status);
  const complete=status.status==='completed'&&typeof status.video?.url==='string'&&status.video.url.startsWith('https://');
  if(complete||terminal){
   const next=complete?'completed':'failed';
   await a.db.from('k4k_higgsfield_first_paid_qa').update({
    state:next,error_code:terminal?'PROVIDER_GENERATION_FAILED':null,
    result_video_url:complete?status.video.url:null,updated_at:new Date().toISOString()
   }).eq('test_key',KEY).eq('provider_request_id',row.provider_request_id);
   return respond({state:next,requestId:row.provider_request_id,videoUrl:complete?status.video.url:null,estimatedCostUsd:cost.usd});
  }
  return respond({state:status.status,requestId:row.provider_request_id,estimatedCostUsd:cost.usd});
 }catch{return respond({state:'submitted',requestId:row.provider_request_id,warning:'STATUS_TEMPORARILY_UNAVAILABLE',estimatedCostUsd:cost.usd});}
}
