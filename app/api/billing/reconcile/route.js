import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createMembershipStore} from '../../../../lib/server/stripe-membership-store.mjs';
import {reconcileCheckout, ReconcileError} from '../../../../lib/server/checkout-reconcile.mjs';
import {assertProcessingKey} from '../../../../lib/server/billing-policy.mjs';

export const runtime = 'nodejs';
export const maxDuration = 30;
const NO_STORE = {'Cache-Control': 'no-store'};
const json = (body, status) => NextResponse.json(body, {status, headers: NO_STORE});

// Grants a paid subscriber their membership and credits when the webhook has
// not arrived. Safe to call repeatedly: the database ignores a repeated event
// and the credit grant is keyed on the Stripe invoice.
export async function POST(request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({error: 'UNAUTHENTICATED'}, 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!url || !publishableKey || !serviceKey || !secret) return json({error: 'UNAVAILABLE'}, 503);

  const {data: {user} = {}, error} = await createClient(url, publishableKey, {auth: {persistSession: false, autoRefreshToken: false}}).auth.getUser(token);
  if (error || !user || user.is_anonymous) return json({error: 'UNAUTHENTICATED'}, 401);

  let mode;
  try { mode = assertProcessingKey(secret); } catch { return json({error: 'BILLING_SETUP_REQUIRED'}, 503); }

  let body = {};
  try { body = await request.json(); } catch { /* a session id is optional */ }
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    try {
      const outcome = await reconcileCheckout({
        userId: user.id,
        sessionId: typeof body.sessionId === 'string' ? body.sessionId : null,
        secret, store: createMembershipStore({url, serviceKey, liveMode:mode==='live'}), liveMode: mode === 'live',
      });
      return json(outcome, 200);
    } catch (problem) {
      if (problem instanceof ReconcileError) return json({error: problem.code}, problem.status);
      // Never leak Stripe or database detail to the browser.
      console.error('Checkout reconcile failed', {code: String(problem?.message || 'UNKNOWN').slice(0, 80)});
      return json({error: 'RECONCILE_FAILED'}, 503);
    }
  }
  return json({error: 'INVALID_REQUEST'}, 400);
}
