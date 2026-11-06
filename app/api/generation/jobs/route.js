import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createStudioReadStore} from '../../../../lib/server/studio-job-reader.mjs';
import {getOwnedJobHistory} from '../../../../lib/server/generation-job-history.mjs';
import {JobStatusError} from '../../../../lib/server/generation-job-status.mjs';

export const runtime = 'nodejs';

const NO_STORE = {'Cache-Control': 'no-store'};

export async function GET(request) {
 const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if (!token) return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401, headers: NO_STORE});

 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!url || !publishableKey || !serviceKey) {
  return NextResponse.json({error: 'UNAVAILABLE'}, {status: 503, headers: NO_STORE});
 }

 const auth = createClient(url, publishableKey, {auth: {persistSession: false, autoRefreshToken: false}});
 const {data: {user} = {}, error} = await auth.auth.getUser(token);
 if (error || !user || user.is_anonymous) {
  return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401, headers: NO_STORE});
 }

 const {searchParams} = new URL(request.url);
 const store = createStudioReadStore(
  createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}})
 );

 try {
  const history = await getOwnedJobHistory({
   store,
   userId: user.id,
   limit: searchParams.get('limit'),
   before: searchParams.get('before'),
  });
  return NextResponse.json(history, {headers: NO_STORE});
 } catch (err) {
  if (err instanceof JobStatusError) {
   return NextResponse.json({error: err.code}, {status: err.status, headers: NO_STORE});
  }
  return NextResponse.json({error: 'UNAVAILABLE'}, {status: 503, headers: NO_STORE});
 }
}
