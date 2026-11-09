import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {assertTestModeKey, buildCheckoutForm, resolvePrice} from '../../../../lib/server/stripe-billing.mjs';

export const runtime = 'nodejs';

const NO_STORE = {'Cache-Control': 'no-store'};

function json(body, status) {
  return NextResponse.json(body, {status, headers: NO_STORE});
}

// Creates a Stripe test-mode subscription Checkout session for a signed-in user.
// The browser sends only plan and currency. The price is resolved on the server.
export async function POST(request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({error: 'UNAUTHENTICATED'}, 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) return json({error: 'UNAVAILABLE'}, 503);

  const auth = createClient(url, publishableKey, {auth: {persistSession: false, autoRefreshToken: false}});
  const {data: {user} = {}, error} = await auth.auth.getUser(token);
  if (error || !user || user.is_anonymous) return json({error: 'UNAUTHENTICATED'}, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({error: 'INVALID_REQUEST'}, 400);
  }

  const priceId = resolvePrice(body?.plan, body?.currency);
  if (!priceId) return json({error: 'INVALID_PLAN'}, 400);

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return json({error: 'UNAVAILABLE'}, 503);
  try {
    assertTestModeKey(secret);
  } catch {
    return json({error: 'LIVE_CHECKOUT_DISABLED'}, 503);
  }

  // Block a second subscription while an active membership exists.
  const scoped = createClient(url, publishableKey, {
    global: {headers: {Authorization: `Bearer ${token}`}},
    auth: {persistSession: false, autoRefreshToken: false},
  });
  const {data: membership, error: membershipError} = await scoped.from('memberships').select('status').eq('user_id', user.id).maybeSingle();
  // Failure to read the subscription guard must not permit a duplicate Checkout.
  if (membershipError) {
    console.error('Checkout membership guard unavailable', {code: membershipError.code || 'unknown'});
    return json({error: 'MEMBERSHIP_CHECK_UNAVAILABLE'}, 503);
  }
  if (membership && ['active', 'trialing'].includes(membership.status)) {
    return json({error: 'ALREADY_SUBSCRIBED'}, 409);
  }

  // Keep Stripe test Checkout returning to this exact Preview deployment rather
  // than a shared production site URL. Do not trust a client-supplied origin.
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  let res;
  try {
    res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded'},
      body: buildCheckoutForm({priceId, userId: user.id, origin, plan: body.plan, currency: body.currency}).toString(),
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    console.error('Stripe test checkout request failed', {type: error?.name === 'TimeoutError' ? 'timeout' : 'network_error'});
    return json({error: 'STRIPE_UNREACHABLE'}, 502);
  }
  if (!res.ok) {
    // Return only Stripe's machine-readable error category; never expose API keys or raw responses.
    const payload = await res.json().catch(() => ({}));
    const stripeError = payload?.error || {};
    const safeCode = typeof stripeError.code === 'string' && /^[a-z0-9_]{1,64}$/.test(stripeError.code) ? stripeError.code : null;
    const safeType = typeof stripeError.type === 'string' && /^[a-z0-9_]{1,64}$/.test(stripeError.type) ? stripeError.type : 'stripe_error';
    console.error('Stripe test checkout failed', {status: res.status, type: safeType, code: safeCode, param: typeof stripeError.param === 'string' ? stripeError.param.slice(0,80) : null});
    return json({error: 'CHECKOUT_FAILED', stripeCode: safeCode, stripeType: safeType}, 502);
  }

  const session = await res.json();
  return json({url: session.url}, 200);
}
