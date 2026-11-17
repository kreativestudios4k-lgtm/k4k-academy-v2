import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {verifyGenerationOutputBytes} from '../../../../lib/server/generation-output-ingestion.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const KEY='genjutsu-owner-central-player-pizza-480p-20261117';
const OWNER='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
const REQUEST='01a1e884-0fb7-70e0-bf45-b42cfd747410';
const BUCKET='studio-generations';
const OUTPUT_PATH=OWNER+'/higgsfield-qa-'+REQUEST+'.mp4';
const MAX_BYTES=40*1024*1024;
const respond=(obj,status=200)=>NextResponse.json(obj,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
const safeProviderUrl=url=>{
 try{
  const u=new URL(url);
  return u.protocol==='https:'&&u.hostname==='d3u0tzju9qaucj.cloudfront.net'&&!u.username&&!u.password&&!u.search&&!u.hash&&
   /^\/[a-f0-9-]+\/01a1e884-0fb7-70e0-bf45-b42cfd747410\/[a-f0-9-]+\.mp4$/i.test(u.pathname);
 }catch{return false}
};
async function authOwner(request,{mutating=false}={}){
 const env=process.env;
 if(env.VERCEL_ENV!=='preview'||env.K4K_HIGGSFIELD_OWNER_PAID_QA_ENABLED!=='true')return {error:'NOT_AVAILABLE',status:404};
 if(mutating&&request.headers.get('origin')!==new URL(request.url).origin)return {error:'INVALID_ORIGIN',status:403};
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return {error:'UNAUTHENTICATED',status:401};
 if(!env.NEXT_PUBLIC_SUPABASE_URL||!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)return {error:'NOT_CONFIGURED',status:503};
 const verifier=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await verifier.auth.getUser(token);
 if(error||!user||user.is_anonymous||user.id!==OWNER)return {error:'NOT_AVAILABLE',status:404};
 const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:row,error:dbError}=await db.from('k4k_higgsfield_first_paid_qa')
  .select('state,provider_request_id,result_video_url,private_output_path,ingestion_state')
  .eq('test_key',KEY).eq('user_id',OWNER).maybeSingle();
 if(dbError)return {error:'LEDGER_UNAVAILABLE',status:503};
 if(row?.state!=='completed'||row?.provider_request_id!==REQUEST||!safeProviderUrl(row?.result_video_url))
  return {error:'COMPLETED_OUTPUT_UNVERIFIED',status:409};
 return {db,row};
}
async function signedLink(db,download){
 const obj=db.storage.from(BUCKET);
 const {data:info,error:infoError}=await obj.info(OUTPUT_PATH);
 if(infoError||!info)return respond({error:'OUTPUT_NOT_STORED'},404);
 const mime=String(info.contentType??info.metadata?.mimetype??'').split(';')[0].toLowerCase();
 const length=Number(info.size??info.metadata?.size);
 if(mime!=='video/mp4'||!Number.isSafeInteger(length)||length<1024||length>MAX_BYTES)
  return respond({error:'INVALID_STORED_VIDEO'},409);
 const {data,error}=await obj.createSignedUrl(OUTPUT_PATH,120,...(download?[{download:'K4K-Higgsfield-QA.mp4'}]:[]));
 if(error||typeof data?.signedUrl!=='string')return respond({error:'SIGNED_LINK_UNAVAILABLE'},503);
 let u;try{u=new URL(data.signedUrl)}catch{return respond({error:'SIGNED_LINK_INVALID'},503)}
 const bucketHost=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;
 if(u.protocol!=='https:'||u.host!==bucketHost||u.username||u.password)
  return respond({error:'SIGNED_LINK_INVALID'},503);
 return respond({state:'stored',outputInOwnerQaLibrary:true,downloadUrl:data.signedUrl,expiresIn:120,contentType:'video/mp4',sizeBytes:length,customerLibraryIntegrated:false,creditsSettled:false});
}
export async function GET(request){
 const a=await authOwner(request);if(a.error)return respond({error:a.error},a.status);
 if(a.row.ingestion_state!=='stored'||a.row.private_output_path!==OUTPUT_PATH)
  return respond({state:a.row.ingestion_state,outputInOwnerQaLibrary:false,customerLibraryIntegrated:false,creditsSettled:false});
 return signedLink(a.db,new URL(request.url).searchParams.get('download')==='1');
}
export async function POST(request){
 const a=await authOwner(request,{mutating:true});if(a.error)return respond({error:a.error},a.status);
 let body;try{body=await request.json()}catch{return respond({error:'INVALID_REQUEST'},400)}
 if(body?.confirmation!=='ARCHIVE_EXISTING_SUCCESS_ONLY'||Object.keys(body).length!==1)
  return respond({error:'CONFIRMATION_REQUIRED'},400);
 if(a.row.ingestion_state==='stored'&&a.row.private_output_path===OUTPUT_PATH)return signedLink(a.db,false);
 if(a.row.ingestion_state!=='not_started')return respond({error:'ALREADY_CLAIMED_CHECK_MANUALLY',state:a.row.ingestion_state,noRetry:true},409);
 // Claim once via a privileged atomic RPC. A crash after claim requires manual reconciliation.
 const {data:claimed,error:claimError}=await a.db.rpc('k4k_hf_qa_claim_output',{p_test_key:KEY,p_owner:OWNER,p_request:REQUEST});
 if(claimError||claimed!==true)return respond({error:'ARCHIVE_ALREADY_CLAIMED',noRetry:true},409);
 try{
  const response=await fetch(a.row.result_video_url,{method:'GET',redirect:'error',cache:'no-store',
   headers:{Accept:'video/mp4'},signal:AbortSignal.timeout(45000)});
  const mime=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  const lengthHeader=response.headers.get('content-length');
  const declared=lengthHeader===null?null:Number(lengthHeader);
  if(response.status!==200||mime!=='video/mp4'||(declared!==null&&(!Number.isSafeInteger(declared)||declared>MAX_BYTES||declared<1024)))
   throw Error('BAD_PROVIDER_MEDIA');
  if(!response.body)throw Error('EMPTY_PROVIDER_MEDIA');
  const reader=response.body.getReader();const chunks=[];let total=0;
  try{
   while(true){
    const {done,value}=await reader.read();if(done)break;
    if(!(value instanceof Uint8Array))throw Error('BAD_PROVIDER_MEDIA');
    total+=value.byteLength;if(total>MAX_BYTES)throw Error('MEDIA_TOO_LARGE');
    chunks.push(value);
   }
  }finally{reader.releaseLock()}
  if(total<1024||declared!==null&&total!==declared)throw Error('INVALID_FILE_LENGTH');
  const bytes=new Uint8Array(total);let pos=0;for(const part of chunks){bytes.set(part,pos);pos+=part.length}
  verifyGenerationOutputBytes(bytes,'video/mp4');
  const {error:storageError}=await a.db.storage.from(BUCKET).upload(OUTPUT_PATH,bytes,{upsert:false,contentType:'video/mp4',cacheControl:'0'});
  if(storageError)throw Error('PRIVATE_STORAGE_WRITE_REQUIRES_REVIEW');
  const {error:rowError}=await a.db.from('k4k_higgsfield_first_paid_qa').update({
   ingestion_state:'stored',private_output_path:OUTPUT_PATH,ingested_at:new Date().toISOString(),updated_at:new Date().toISOString()
  }).eq('test_key',KEY).eq('user_id',OWNER).eq('provider_request_id',REQUEST).eq('ingestion_state','claimed');
  if(rowError)throw Error('LEDGER_SETTLEMENT_REQUIRES_REVIEW');
  return signedLink(a.db,false);
 }catch(error){
  await a.db.from('k4k_higgsfield_first_paid_qa').update({ingestion_state:'needs_review',updated_at:new Date().toISOString()})
   .eq('test_key',KEY).eq('user_id',OWNER).eq('ingestion_state','claimed');
  return respond({error:'ARCHIVE_REQUIRES_REVIEW',reason:String(error?.message||'UNKNOWN').slice(0,80),noRetry:true},503);
 }
}
