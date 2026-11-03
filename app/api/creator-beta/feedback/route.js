import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {getGenerationBetaGate} from '../../../../lib/server/generation-beta-gate.mjs';
import {validateCreatorFeedback} from '../../../../lib/server/creator-beta-feedback.mjs';

export const runtime = 'nodejs';
const json = (body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function POST(request) {
  // Separate feedback enablement from video generation readiness.
  if (process.env.K4K_CREATOR_FEEDBACK_ENABLED !== 'true')
    return json({error:'FEEDBACK_NOT_ENABLED'},503);
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({error:'AUTH_REQUIRED'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return json({error:'SERVICE_NOT_CONFIGURED'},503);
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}={},error:authError}=await supabase.auth.getUser(token);
  if (authError || !user || user.is_anonymous) return json({error:'AUTH_REQUIRED'},401);
  const gate=getGenerationBetaGate(process.env);
  if (gate.invitedCount > gate.cohortLimit) return json({error:'BETA_COHORT_LIMIT_EXCEEDED'},503);
  const invited=(process.env.K4K_GENERATION_BETA_USER_IDS||'').split(',').map(x=>x.trim().toLowerCase());
  if (!invited.includes(user.id.toLowerCase())) return json({error:'BETA_ACCESS_DENIED'},403);
  const length=Number(request.headers.get('content-length')||0);
  if (length>8192) return json({error:'PAYLOAD_TOO_LARGE'},413);
  let input;
  try {
    const raw=await request.text();
    if (raw.length>8192) return json({error:'PAYLOAD_TOO_LARGE'},413);
    input=validateCreatorFeedback(JSON.parse(raw));
  } catch {
    return json({error:'INVALID_FEEDBACK'},400);
  }
  // Job-linked feedback stays disabled until ownership verification is wired.
  if (input.jobId !== null) return json({error:'JOB_FEEDBACK_NOT_READY'},422);
  // Authenticated RLS restricts feedback rows to the submitting creator.
  const scoped=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await scoped.from('k4k_creator_beta_feedback').insert({
    user_id:user.id,category:input.category,message:input.message,job_id:input.jobId
  });
  if (error) return json({error:'FEEDBACK_UNAVAILABLE'},503);
  return json({ok:true},201);
}
