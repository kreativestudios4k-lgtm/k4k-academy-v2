import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createMultimodelJobStore} from '../../../../../lib/server/multimodel-job-store.mjs';
import {createMultimodelPrivateDelivery} from '../../../../../lib/server/multimodel-private-delivery.mjs';
export const runtime='nodejs';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{
 'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Authorization'
}});
export async function GET(request){
 // Explicit preview-only switch: never enabled by an existing production
 // generation flag or a customer-controlled request parameter.
 if(process.env.VERCEL_ENV!=='preview'||process.env.K4K_MULTIMODEL_DELIVERY_PREVIEW!=='true')
  return respond({error:'NOT_AVAILABLE'},404);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 const params=new URL(request.url).searchParams;
 const jobId=params.get('jobId');
 if(!UUID.test(jobId??''))return respond({error:'INVALID_JOB'},400);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return respond({error:'UNAVAILABLE'},503);
 try{
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}={},error}=await auth.auth.getUser(token);
  if(error||!user||user.is_anonymous)return respond({error:'UNAUTHENTICATED'},401);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const store=createMultimodelJobStore({client:admin,enabled:true});
  const delivery=createMultimodelPrivateDelivery({
   jobStore:store,storage:admin.storage,enabled:true
  });
  const result=await delivery.getSignedUrl({userId:user.id,jobId,download:params.get('download')==='1'});
  return respond(result);
 }catch(error){
  if(['JOB_NOT_FOUND','JOB_NOT_COMPLETED','INVALID_OUTPUT_PATH','INVALID_OUTPUT_TYPE',
    'OUTPUT_NOT_FOUND','INVALID_OUTPUT_SIZE','PROVIDER_NOT_RECORDED'].includes(error?.message))
    return respond({error:'OUTPUT_NOT_AVAILABLE'},404);
  return respond({error:'UNAVAILABLE'},503);
 }
}
