import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createStudioReadStore} from '../../../../../lib/server/studio-job-reader.mjs';
import {getOwnedJobStatus, JobStatusError} from '../../../../../lib/server/generation-job-status.mjs';
import {buildGenerationService} from '../../../../../lib/server/generation-request.mjs';

export const runtime = 'nodejs';
// A finished video is copied into private storage during this request.
export const maxDuration = 120;

const NO_STORE = {'Cache-Control': 'no-store'};

export async function GET(request, {params}) {
 const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if (!token) return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401, headers: NO_STORE});

 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!url || !publishableKey || !serviceKey) {
  return NextResponse.json({error: 'UNAVAILABLE'}, {status: 503, headers: NO_STORE});
 }

 // Verify the caller's session with the publishable key, then use the
 // service-role client only on the server for the ownership-checked read.
 const auth = createClient(url, publishableKey, {auth: {persistSession: false, autoRefreshToken: false}});
 const {data: {user} = {}, error} = await auth.auth.getUser(token);
 if (error || !user || user.is_anonymous) {
  return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401, headers: NO_STORE});
 }

 const {id} = await params;
 const admin = createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});
 const store = createStudioReadStore(admin);

 try {
  let job = await getOwnedJobStatus({store, userId: user.id, jobId: id});
  // While the job is in flight, ask the provider (server to server) and settle
  // or refund exactly once. A failure here never hides the stored status.
  let progress = null;
  if (job.status === 'queued' || job.status === 'processing') {
   try {
    progress = await buildGenerationService({admin}).service.refresh({userId: user.id, jobId: job.id});
    if (progress.state === 'completed' || progress.state === 'refunded') job = await getOwnedJobStatus({store, userId: user.id, jobId: id});
   } catch { progress = {state: 'provider_unavailable'}; }
  }
  return NextResponse.json({job, progress: progress ? {state: progress.state, blocked: progress.blocked ?? null} : null}, {headers: NO_STORE});
 } catch (err) {
  if (err instanceof JobStatusError) {
   return NextResponse.json({error: err.code}, {status: err.status, headers: NO_STORE});
  }
  return NextResponse.json({error: 'UNAVAILABLE'}, {status: 503, headers: NO_STORE});
 }
}
