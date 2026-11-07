import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {quoteImage} from '../../../../lib/server/image-generation-pricing.mjs';

export const runtime = 'nodejs';

const NO_STORE = {'Cache-Control': 'no-store'};
const MODEL = 'gemini-3.1-flash-image';

// Quote-only route. It does NOT call the provider, reserve credits or store images.
// Generation stays off unless K4K_IMAGE_GENERATION_ENABLED=true, and that flag must
// not be set until the credit ledger, spend caps, moderation and consent checks are live.
export async function POST(request) {
 const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if (!token) return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401, headers: NO_STORE});

 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!url || !publishableKey) {
  return NextResponse.json({error: 'UNAVAILABLE'}, {status: 503, headers: NO_STORE});
 }

 const auth = createClient(url, publishableKey, {auth: {persistSession: false, autoRefreshToken: false}});
 const {data: {user} = {}, error} = await auth.auth.getUser(token);
 if (error || !user || user.is_anonymous) {
  return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401, headers: NO_STORE});
 }

 let body;
 try {
  body = await request.json();
 } catch {
  return NextResponse.json({error: 'INVALID_REQUEST'}, {status: 400, headers: NO_STORE});
 }

 const referenceImageCount = body?.referenceImageCount ?? 0;
 // Reference photos are real people's likenesses: require explicit consent before any use.
 if (referenceImageCount > 0 && body?.consentToReferenceUse !== true) {
  return NextResponse.json({error: 'CONSENT_REQUIRED'}, {status: 400, headers: NO_STORE});
 }

 let quote;
 try {
  quote = quoteImage({model: MODEL, resolution: body?.resolution, referenceImageCount});
 } catch (err) {
  return NextResponse.json({error: 'INVALID_REQUEST', detail: err.message}, {status: 400, headers: NO_STORE});
 }

 if (process.env.K4K_IMAGE_GENERATION_ENABLED !== 'true') {
  return NextResponse.json({error: 'GENERATION_DISABLED', quote}, {status: 503, headers: NO_STORE});
 }

 // Not wired yet: the credit reservation, provider call and AI label go here.
 return NextResponse.json({error: 'NOT_IMPLEMENTED', quote}, {status: 501, headers: NO_STORE});
}
