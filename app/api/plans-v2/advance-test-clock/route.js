import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {v2PreviewAllowed} from '../../../../lib/k4k-plan-v2.mjs';

export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
const respond=(body,status=200)=>NextResponse.json(body,{status,headers});
// Only the disposable K4K renewal QA clock; the original paid Starter has no test clock.
const CLOCK='clock_1UcbK6L7fmdMaK0kkmocUbFl';
const CUSTOMER='cus_Vdt6TAJm7yrkwE';
const SUB='sub_1UcbMbL7fmdMaK0ks4E7jNBR';
const INITIAL_FROZEN=1794879300;
const RENEW_AT=1797471360; // > first cycle end 1797471300. Fixed one-time advance.

async function stripe(path,env,body){
 const response=await fetch('https://api.stripe.com/v1/'+path,{
  method:body?'POST':'GET',
  headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,...(body?{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'k4k-v2-qa-first-renewal-20261117'}:{})},
  body:body?.toString(),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(16000)
 });
 if(!response.ok)throw Error('STRIPE_TEST_CLOCK_REQUEST_FAILED');
 return response.json();
}
export async function POST(request){
 const env=process.env;
 if(!v2PreviewAllowed(env)||env.K4K_PLAN_V2_OWNER_TEST_CHECKOUT!=='true')
  return respond({error:'NOT_AVAILABLE'},404);
 if(typeof env.STRIPE_SECRET_KEY!=='string'||!env.STRIPE_SECRET_KEY.startsWith('sk_test_'))
  return respond({error:'STRIPE_TEST_KEY_REQUIRED'},503);
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return respond({error:'INVALID_ORIGIN'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 const endpoint=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!endpoint||!key)return respond({error:'NOT_READY'},503);
 const supabase=createClient(endpoint,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await supabase.auth.getUser(token);
 if(error||!user||user.is_anonymous||user.id!==env.K4K_PLAN_V2_OWNER_ID)
  return respond({error:'NOT_AVAILABLE'},404);
 let body;try{body=await request.json()}catch{return respond({error:'INVALID_REQUEST'},400)}
 if(body?.confirmation!=='ADVANCE_TEST_CLOCK_ONCE'||Object.keys(body).length!==1)
  return respond({error:'CONFIRMATION_REQUIRED'},400);
 try{
  const [clock,sub]=await Promise.all([
   stripe('test_helpers/test_clocks/'+CLOCK,env),
   stripe('subscriptions/'+SUB,env)
  ]);
  if(clock.livemode!==false||clock.id!==CLOCK||
     sub.livemode!==false||sub.test_clock!==CLOCK||sub.customer!==CUSTOMER||
     sub.items?.data?.[0]?.price?.id!=='price_1UcaJsL7fmdMaK0kLOS4WqvG')
   return respond({error:'TEST_CLOCK_OWNERSHIP_CHECK_FAILED'},409);
  if(clock.frozen_time>=RENEW_AT)
   return respond({alreadyAdvanced:true,clockStatus:clock.status,renewalDue:true});
  if(clock.frozen_time!==INITIAL_FROZEN||clock.status!=='ready'||sub.status!=='active')
   return respond({error:'TEST_CLOCK_NOT_READY'},409);
  const form=new URLSearchParams({frozen_time:String(RENEW_AT)});
  const advanced=await stripe('test_helpers/test_clocks/'+CLOCK+'/advance',env,form);
  if(advanced.id!==CLOCK||advanced.livemode!==false)throw Error('STRIPE_CLOCK_RESPONSE_INVALID');
  return respond({advanced:true,clockStatus:advanced.status,renewalDue:true});
 }catch(error){
  console.warn('K4K test clock advance failed',{reason:String(error?.message||'UNKNOWN').slice(0,80)});
  return respond({error:'STRIPE_CLOCK_ADVANCE_UNAVAILABLE'},503);
 }
}
