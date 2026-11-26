import {createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {K4K_V2_PLANS,v2PreviewAllowed} from '../../../../lib/k4k-plan-v2.mjs';
import {assertTestModeKey,buildCheckoutForm} from '../../../../lib/server/stripe-billing.mjs';

export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const respond=(body,status=200)=>NextResponse.json(body,{status,headers});

export function v2OwnerCheckoutAllowed(env=process.env){
 return v2PreviewAllowed(env)&&env.K4K_PLAN_V2_OWNER_TEST_CHECKOUT==='true'
  &&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(env.K4K_PLAN_V2_OWNER_ID??'');
}
export async function POST(request){
 if(!v2OwnerCheckoutAllowed())return respond({error:'NOT_AVAILABLE'},404);
 if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return respond({error:'INVALID_REQUEST'},400);
 let body;try{body=await request.json()}catch{return respond({error:'INVALID_REQUEST'},400)}
 const plan=typeof body?.plan==='string'&&Object.hasOwn(K4K_V2_PLANS,body.plan)?K4K_V2_PLANS[body.plan]:null;
 if(!plan||Object.keys(body).some(k=>k!=='plan'))return respond({error:'INVALID_PLAN'},400);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!publicKey)return respond({error:'SETUP_REQUIRED'},503);
 const client=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
 let user;try{const result=await client.auth.getUser(token);if(result.error)throw Error('auth');user=result.data.user;}catch{return respond({error:'UNAUTHENTICATED'},401)}
 if(!user||user.is_anonymous||user.id!==process.env.K4K_PLAN_V2_OWNER_ID)return respond({error:'NOT_AVAILABLE'},404);
 const scoped=createClient(url,publicKey,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:membership,error:membershipError}=await scoped.from('memberships').select('status').eq('user_id',user.id).maybeSingle();
 if(membershipError)return respond({error:'MEMBERSHIP_CHECK_UNAVAILABLE'},503);
 if(membership&&['active','trialing','past_due'].includes(membership.status))return respond({error:'EXISTING_TEST_SUBSCRIPTION'},409);
 const secret=process.env.STRIPE_SECRET_KEY;
 try{assertTestModeKey(secret)}catch{return respond({error:'TEST_KEY_REQUIRED'},503)}
 const host=new URL(request.url);
 if(host.protocol!=='https:'||!/^kreativestudios4k-site-[a-z0-9-]+\.vercel\.app$/.test(host.hostname))
  return respond({error:'PREVIEW_ORIGIN_REQUIRED'},403);
 const form=buildCheckoutForm({priceId:plan.priceId,userId:user.id,origin:host.origin,plan:plan.key,currency:'GBP'});
 form.set('success_url',host.origin+'/k4k-app/plans-preview/qa?checkout=success&session_id={CHECKOUT_SESSION_ID}');
 form.set('cancel_url',host.origin+'/k4k-app/plans-preview/qa?checkout=cancelled');
 form.set('automatic_tax[enabled]','true');
 form.set('tax_id_collection[enabled]','true');
 form.set('metadata[k4k_catalog_version]','creator_2026_v2');
 form.set('subscription_data[metadata][k4k_catalog_version]','creator_2026_v2');
 form.set('client_reference_id',user.id);
 let response;try{response=await fetch('https://api.stripe.com/v1/checkout/sessions',{
  method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/x-www-form-urlencoded',
   'Idempotency-Key':'k4k-v2-'+createHash('sha256').update('creator_2026_v2:'+user.id+':'+plan.key).digest('hex').slice(0,42)},
  body:form.toString(),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)
 })}catch{return respond({error:'TEST_STRIPE_UNAVAILABLE'},502)}
 if(!response.ok)return respond({error:'TEST_CHECKOUT_FAILED'},502);
 let session;try{session=await response.json()}catch{return respond({error:'TEST_CHECKOUT_FAILED'},502)}
 let dest;try{dest=new URL(session.url)}catch{return respond({error:'TEST_CHECKOUT_FAILED'},502)}
 if(session.livemode!==false||session.mode!=='subscription'||!/^cs_test_/.test(session.id??'')||dest.protocol!=='https:'||dest.hostname!=='checkout.stripe.com')
  return respond({error:'TEST_CHECKOUT_FAILED'},502);
 return respond({url:dest.href,testMode:true,plan:plan.key});
}
