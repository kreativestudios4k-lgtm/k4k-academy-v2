import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createGenerationJobStore} from '../../../../../lib/server/generation-job-store.mjs';
import {createGenerationOutputVerifier} from '../../../../../lib/server/generation-output-verifier.mjs';
import {createGenerationOutputDelivery} from '../../../../../lib/server/generation-output-delivery.mjs';
export const runtime='nodejs';
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return respond({error:'UNAVAILABLE'},503);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await auth.auth.getUser(token);
 if(error||!user||user.is_anonymous)return respond({error:'UNAUTHENTICATED'},401);
 const params=new URL(request.url).searchParams;
 const jobId=params.get('jobId');
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(jobId??''))return respond({error:'INVALID_JOB'},400);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const jobStore=createGenerationJobStore({client:admin,enabled:true});
 const verifyOutput=createGenerationOutputVerifier({storage:admin.storage,enabled:true});
 const delivery=createGenerationOutputDelivery({jobStore,storage:admin.storage,verifyOutput,enabled:true});
 try{
  const result=await delivery.getSignedUrl({userId:user.id,jobId,download:params.get('download')==='1'});
  return respond(result);
 }catch(error){
  if(['JOB_NOT_FOUND','JOB_NOT_COMPLETED','INVALID_OUTPUT_PATH','OUTPUT_NOT_VERIFIED','OUTPUT_NOT_FOUND','INVALID_OUTPUT_SIZE','INVALID_OUTPUT_TYPE'].includes(error.message))return respond({error:'OUTPUT_NOT_AVAILABLE'},404);
  return respond({error:'UNAVAILABLE'},503);
 }
}
