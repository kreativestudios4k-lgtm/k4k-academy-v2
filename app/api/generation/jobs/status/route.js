import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
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
 const jobId=new URL(request.url).searchParams.get('jobId');
 if(!jobId||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(jobId))return respond({error:'INVALID_JOB'},400);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error:dbError}=await admin.from('studio_generation_jobs')
  .select('id,status,model,created_at,updated_at,credits_reserved')
  .eq('id',jobId).eq('user_id',user.id).maybeSingle();
 if(dbError)return respond({error:'UNAVAILABLE'},503);
 if(!data)return respond({error:'NOT_FOUND'},404);
 // Never return internal provider IDs, storage paths, raw errors or credentials.
 return respond({jobId:data.id,status:data.status,model:data.model,creditsReserved:data.credits_reserved,createdAt:data.created_at,updatedAt:data.updated_at,generationEnabled:false});
}
