import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const KEY='genjutsu-owner-central-player-pizza-480p-20261117';
const OWNER='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
const REQUEST='01a1e884-0fb7-70e0-bf45-b42cfd747410';
const MAX=100*1024*1024;
const respond=(obj,status=200)=>NextResponse.json(obj,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
function safeOutput(url){
 try{
  const x=new URL(url);
  return x.protocol==='https:'&&x.hostname==='d3u0tzju9qaucj.cloudfront.net'&&!x.username&&!x.password&&
   /^\/[0-9a-f-]+\/01a1e884-0fb7-70e0-bf45-b42cfd747410\/[0-9a-f-]+\.mp4$/i.test(x.pathname)&&!x.search&&!x.hash;
 }catch{return false;}
}
export async function GET(request){
 const env=process.env;
 if(env.VERCEL_ENV!=='preview'||env.K4K_HIGGSFIELD_OWNER_PAID_QA_ENABLED!=='true')return respond({error:'NOT_AVAILABLE'},404);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 if(!env.NEXT_PUBLIC_SUPABASE_URL||!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)return respond({error:'NOT_CONFIGURED'},503);
 const auth=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await auth.auth.getUser(token);
 if(error||!user||user.is_anonymous||user.id!==OWNER)return respond({error:'NOT_AVAILABLE'},404);
 const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:row,error:dbError}=await db.from('k4k_higgsfield_first_paid_qa')
  .select('state,provider_request_id,result_video_url').eq('test_key',KEY).eq('user_id',OWNER).maybeSingle();
 if(dbError)return respond({error:'QA_LEDGER_UNAVAILABLE'},503);
 if(row?.state!=='completed'||row?.provider_request_id!==REQUEST||!safeOutput(row?.result_video_url))
  return respond({outputAvailable:false,reason:'UNVERIFIED_COMPLETED_OUTPUT'});
 const url=row.result_video_url;
 try{
  // Read-only, bounded probe; no full media download, customer storage mutation or provider generation.
  const response=await fetch(url,{method:'GET',headers:{Range:'bytes=0-31',Accept:'video/mp4'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)});
  const contentType=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  const size=Number(response.headers.get('content-length'));
  if(response.status!==206||contentType!=='video/mp4'||!Number.isFinite(size)||size<12||size>64)
    {try{await response.body?.cancel()}catch{};return respond({outputAvailable:response.ok,mp4HeaderValid:false,reason:'RANGE_OR_MIME_NOT_VERIFIED'});}
  const bytes=new Uint8Array(await response.arrayBuffer());
  const valid=bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==='ftyp';
  return respond({outputAvailable:true,rangeSupported:true,mp4HeaderValid:valid,providerRequestId:REQUEST,downloadInK4KLibrary:false,actualChargeVerified:false});
 }catch{
  return respond({outputAvailable:false,mp4HeaderValid:false,reason:'PROVIDER_FILE_NOT_REACHABLE'});
 }
}
