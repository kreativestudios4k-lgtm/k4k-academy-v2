import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
export const maxDuration=30;
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function adminDatabase(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];if(!token)throw Error('UNAUTHENTICATED');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!service)throw Error('UNAVAILABLE');
 const opts={auth:{persistSession:false,autoRefreshToken:false}};
 const {data:{user}={},error}=await createClient(url,key,opts).auth.getUser(token);
 if(error||!user||user.is_anonymous)throw Error('UNAUTHENTICATED');
 const db=createClient(url,service,opts);
 const {data:role,error:roleError}=await db.from('k4k_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError)throw Error('UNAVAILABLE');if(!role)throw Error('FORBIDDEN');
 return db;
}
const mapError=error=>['CONTENT_POLICY_BLOCKED','PROVIDER_GENERATION_FAILED'].includes(error)?error:error?'GENERATION_ERROR':null;
export async function GET(request){
 try{
  const db=await adminDatabase(request);
  const since=new Date(Date.now()-86400000).toISOString();
  // The monitor is read-only. New generations, refunds and provider events
  // stay in their existing transactional flows. These are bounded queries.
  const [jobsQuery,eventsQuery]=await Promise.all([
   db.from('studio_generation_jobs').select('id,user_id,template_id,model,status,error_message,credits_reserved,created_at,updated_at').gte('created_at',since).order('created_at',{ascending:false}).limit(500),
   db.from('k4k_generation_monitor_events').select('id,job_id,user_id,previous_status,status,error_code,event_at').order('event_at',{ascending:false}).limit(200)
  ]);
  if(jobsQuery.error||eventsQuery.error)throw Error('UNAVAILABLE');
  const jobs=jobsQuery.data||[],events=eventsQuery.data||[];
  const jobIds=jobs.map(x=>x.id);
  const reservations=jobIds.length?await db.from('k4k_generation_reservations').select('job_id,credits,status,credit_mode').in('job_id',jobIds):{data:[],error:null};
  if(reservations.error)throw Error('UNAVAILABLE');
  const byJob=new Map((reservations.data||[]).map(x=>[x.job_id,x]));
  const userIds=[...new Set([...jobs.map(x=>x.user_id),...events.map(x=>x.user_id)])];
  // Resolve email server-side only AFTER verifying the administrator.
  // Never send Auth user fields other than the exact email used for identification.
  const emails=new Map();
  for(let page=1;page<=5&&emails.size<userIds.length;page++){
   const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});
   if(error)throw Error('UNAVAILABLE');
   for(const user of data?.users||[])if(userIds.includes(user.id))emails.set(user.id,user.email||'—');
   if((data?.users||[]).length<1000)break;
  }
  const output=jobs.map(j=>{const r=byJob.get(j.id);return {id:j.id,userId:j.user_id,email:emails.get(j.user_id)||'—',templateId:j.template_id,model:j.model,status:j.status,errorCode:mapError(j.error_message),reservedCredits:r?.credits??0,settlement:r?.status??null,creditMode:r?.credit_mode??null,createdAt:j.created_at,updatedAt:j.updated_at,stale:['queued','processing'].includes(j.status)&&Date.now()-Date.parse(j.updated_at)>10*60000}});
  const count=s=>output.filter(j=>j.status===s).length;
  const pending=output.filter(j=>['queued','processing'].includes(j.status));
  const stats={total:output.length,drafts:count('draft'),processing:pending.length,completed:count('completed'),failed:count('failed'),stale:pending.filter(j=>j.stale).length,unrefunded:output.filter(j=>j.status==='failed'&&j.settlement==='reserved').length,refunded:output.filter(j=>j.settlement==='refunded').length};
  return json({asOf:new Date().toISOString(),window:'24h',stats,jobs:output,events:events.map(e=>({id:e.id,jobId:e.job_id,email:emails.get(e.user_id)||'—',previousStatus:e.previous_status,status:e.status,errorCode:e.error_code,eventAt:e.event_at})),truncated:jobs.length===500});
 }catch(error){const status=error.message==='UNAUTHENTICATED'?401:error.message==='FORBIDDEN'?403:503;return json({error:status===503?'MONITOR_UNAVAILABLE':error.message},status)}
}
