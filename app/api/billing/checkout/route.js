import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {assertTestModeKey, buildCheckoutForm, resolvePrice} from '../../../../lib/server/stripe-billing.mjs';
import {livePrices} from '../../../../lib/server/live-price-config.mjs';
import {assertBillingKey,assertTaxReady,billingMode,assertLiveLaunchReady} from '../../../../lib/server/billing-policy.mjs';
import {currencyForCountry} from '../../../../lib/k4k-market.mjs';
import {launchLimits,claimPaidSeat,openLaunchCheckout} from '../../../../lib/server/soft-launch.mjs';
import {REFERRAL_COOKIE,recordReferral,referralsEnabled,validReferralCode} from '../../../../lib/server/referral-tracking.mjs';

import {findPartner} from '../../../../lib/server/partner-policy.mjs';
import {studentCode,studentDiscountRequested,applyStudentDiscount} from '../../../../lib/k4k-student-discount.mjs';
export const runtime = 'nodejs';

const NO_STORE = {'Cache-Control': 'no-store'};

function json(body, status) {
  return NextResponse.json(body, {status, headers: NO_STORE});
}

// Creates a Stripe test-mode subscription Checkout session for a signed-in user.
// The browser sends only plan and currency. The price is resolved on the server.
export async function POST(request) {
  if(process.env.K4K_WAITLIST_ONLY==='true')return Response.json({error:'WAITLIST_ONLY'},{status:503});
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

  const requestedDiscount=studentDiscountRequested(body?.discountCode);
  if(requestedDiscount&&!studentCode(body.discountCode))return json({error:'INVALID_DISCOUNT_CODE'},400);
  // Region must be derived from the trusted Vercel edge header, not browser input.
  // Reject mismatches before any Stripe API request to avoid currency/price surprises.
  const expectedCurrency = currencyForCountry(request.headers.get('x-vercel-ip-country'));
  if (body?.currency !== expectedCurrency) return json({error: 'CURRENCY_REGION_MISMATCH', currency: expectedCurrency}, 409);
  let priceId;
  try { priceId = billingMode()==='test'?resolvePrice(body?.plan, expectedCurrency):livePrices('plans')?.[body?.plan]?.[expectedCurrency]; }
  catch { return json({error:'BILLING_SETUP_REQUIRED'},503); }
  if (!priceId) return json({error: 'INVALID_PLAN'}, 400);

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return json({error: 'UNAVAILABLE'}, 503);
  try {
    if(billingMode()==='test')assertTestModeKey(secret);
    assertBillingKey(secret);assertTaxReady();assertLiveLaunchReady();

  } catch {
    return json({error:'BILLING_SETUP_REQUIRED'},503);
  }

  // Block a second subscription while an active membership exists.
  const scoped = createClient(url, publishableKey, {
    global: {headers: {Authorization: `Bearer ${token}`}},
    auth: {persistSession: false, autoRefreshToken: false},
  });
  const {data: membership, error: membershipError} = await scoped.from(billingMode()==='live'?'k4k_app_memberships':'memberships').select('status').eq('user_id', user.id).maybeSingle();
  // Failure to read the subscription guard must not permit a duplicate Checkout.
  if (membershipError) {
    console.error('Checkout membership guard unavailable', {code: membershipError.code || 'unknown'});
    return json({error: 'MEMBERSHIP_CHECK_UNAVAILABLE'}, 503);
  }
  if (membership && ['active', 'trialing'].includes(membership.status)) {
    return json({error: 'ALREADY_SUBSCRIBED'}, 409);
  }

  // A live customer must hold a funded seat before a Stripe Session exists.
  if(billingMode()==='live'){
    try{
      const limits=launchLimits();
      const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!serviceKey)throw Error('LAUNCH_UNAVAILABLE');
      const database=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
      const code=requestedDiscount?'matheusborrascah':request.cookies?.get(REFERRAL_COOKIE)?.value;
      const partner=referralsEnabled()?await findPartner(database,code):null;
      if(requestedDiscount&&(!partner||user.id===partner.user_id))return json({error:'STUDENT_DISCOUNT_UNAVAILABLE'},409);
      const referral=referralsEnabled()?await recordReferral(database,user.id,partner&&user.id!==partner.user_id?code:null):null;
      if(referral&&(!validReferralCode(referral)||!await findPartner(database,referral)))throw Error('REFERRAL_REVIEW_REQUIRED');
      if(requestedDiscount&&referral!=='matheusborrascah')return json({error:'STUDENT_DISCOUNT_UNAVAILABLE'},409);
      const claim=await claimPaidSeat(database,{userId:user.id,plan:body.plan,priceId,currency:expectedCurrency,limits});
      const form=buildCheckoutForm({priceId,userId:user.id,origin:'https://kreativestudios4k.com',plan:body.plan,currency:expectedCurrency});
      form.set('automatic_tax[enabled]','true');form.set('tax_id_collection[enabled]','true');
      if(referral){form.set('metadata[k4k_referral_code]',referral);form.set('subscription_data[metadata][k4k_referral_code]',referral);if(referral==='matheusborrascah')applyStudentDiscount(form);}
      const destination=await openLaunchCheckout({database,claim,secret,form});
      return json({url:destination},200);
    }catch(problem){
      const conflict=['LAUNCH_SOLD_OUT','LAUNCH_CREDIT_CAPACITY','LAUNCH_CHECKOUT_PENDING','ALREADY_SUBSCRIBED','CHECKOUT_EXPIRED_RETRY','CHECKOUT_RECONCILE_REQUIRED'];
      const known=[...conflict,'LAUNCH_NOT_OPEN','LAUNCH_CONFIG_INVALID','LAUNCH_CHECKOUT_REVIEW','STRIPE_UNREACHABLE','CHECKOUT_FAILED','LAUNCH_SESSION_INVALID'];
      return json({error:known.includes(problem?.message)?problem.message:'LAUNCH_UNAVAILABLE'},conflict.includes(problem?.message)?409:503);
    }
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
      body: (()=>{const form=buildCheckoutForm({priceId,userId:user.id,origin,plan:body.plan,currency:expectedCurrency});form.set('automatic_tax[enabled]','true');form.set('tax_id_collection[enabled]','true');if(requestedDiscount)applyStudentDiscount(form);return form.toString()})(),
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
