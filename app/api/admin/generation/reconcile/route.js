import {createClient} from '@supabase/supabase-js';
import {reconcileGenerationJob} from '../../../../../lib/server/generation-reconcile-service.mjs';
export const runtime='nodejs';
export const maxDuration=60;
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

// The support API uses the existing database-backed administrator role.
// Preview only until explicitly reviewed and enabled for production.
async function adminContext(request){
 if(process.env.VERCEL_ENV!=='preview')throw Error('NOT_AVAILABLE');
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!token)throw Error('UNAUTHENTICATED');
 if(!url||!key||!secret)throw Error('NOT_AVAILABLE');
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
 if(error||!user||user.is_anonymous)throw Error('UNAUTHENTICATED');
 const database=createClient(url,secret,options);
 const {data:admin,error:adminError}=await database.from('k4k_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError)throw Error('NOT_AVAILABLE');
 if(!admin)throw Error('FORBIDDEN');
 return database;
}
function failure(error){
 const code=error?.message;
 const statuses={UNAUTHENTICATED:401,FORBIDDEN:403,NOT_AVAILABLE:503,INVALID_JOB:400,NOT_FOUND:404,PROVIDER_RECORDING_REQUIRES_RECONCILIATION:409};
 return json({error:Object.hasOwn(statuses,code)?code:'RECONCILIATION_UNAVAILABLE'},statuses[code]||503);
}
export async function GET(request){
 try{
  const database=await adminContext(request);
  // Oldest first: reveal stuck reservations, never customer files or prompts.
  const {data,error}=await database.from('studio_generation_jobs')
   .select('id,user_id,status,provider,provider_job_id,credits_reserved,created_at,updated_at')
   .in('status',['queued','processing']).order('updated_at',{ascending:true}).limit(100);
  if(error)throw Error('NOT_AVAILABLE');
  return json({jobs:(data||[]).map(job=>({...job,reconciliationRequired:!job.provider_job_id,stale:Date.now()-Date.parse(job.updated_at||job.created_at)>600000}))});
 }catch(error){return failure(error)}
}
export async function POST(request){
 try{
  const database=await adminContext(request);
  let body;try{body=await request.json()}catch{throw Error('INVALID_JOB')}
  if(!uuid.test(body?.jobId??'')||Object.keys(body).some(k=>k!=='jobId'))throw Error('INVALID_JOB');
  const {data:job,error}=await database.from('studio_generation_jobs')
   .select('id,user_id,status,provider,provider_job_id,credits_reserved').eq('id',body.jobId).maybeSingle();
  if(error)throw Error('NOT_AVAILABLE');
  if(!job)throw Error('NOT_FOUND');
  // Never accept a caller-supplied provider ID, output URL, or refund decision.
  const result=await reconcileGenerationJob({database,job});
  return json(result,result.reconciliationRequired?409:200);
 }catch(error){return failure(error)}
}
