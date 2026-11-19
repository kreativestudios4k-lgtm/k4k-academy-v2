// Separate internal-only Stripe TEST checkout. NEVER use the legacy checkout
// or any LIVE Stripe / production Supabase credentials for this route.
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {assertV2SandboxRuntime} from '../../../../../lib/server/v2-sandbox-catalog.mjs';
import {
 V2_SANDBOX_CHECKOUT_READY,createV2SandboxStripeCheckoutClient,initiateV2SandboxCheckout
} from '../../../../../lib/server/v2-sandbox-checkout-create.mjs';
import {createStripeTestReader} from '../../../../../lib/server/v2-stripe-test-reader.mjs';
import {createV2SandboxSupabaseGateway} from '../../../../../lib/server/v2-sandbox-payment-adapter.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const reply=(body,status)=>NextResponse.json(body,{status,headers});
export async function POST(request){
 try{
  assertV2SandboxRuntime(process.env);
  // Required before any HTTP request, Auth query, Supabase write or Stripe call.
  if(!V2_SANDBOX_CHECKOUT_READY)return reply({error:'V2_TEST_CHECKOUT_NOT_READY'},503);
  if(process.env.K4K_V2_SANDBOX_PROJECT_REF!=='yhbhrkyihiyyfzqogyri'||
   process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://yhbhrkyihiyyfzqogyri.supabase.co')
   return reply({error:'TEST_DATABASE_NOT_ISOLATED'},503);
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if(!token)return reply({error:'AUTH_REQUIRED'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey=process.env.STRIPE_V2_TEST_SECRET_KEY;
  if(!url||!publishable||!serviceKey||!/^sk_test_[A-Za-z0-9]+$/.test(stripeKey||''))
   return reply({error:'TEST_CREDENTIALS_UNAVAILABLE'},503);
  const userClient=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}={},error}=await userClient.auth.getUser(token);
  if(error||!user||user.is_anonymous)return reply({error:'AUTH_REQUIRED'},401);
  let input;
  try{input=await request.json();}catch{return reply({error:'INVALID_REQUEST'},400);}
  if(!input||typeof input.offer!=='string'||Object.keys(input).some(key=>key!=='offer'))
   return reply({error:'INVALID_TEST_OFFER'},400);
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const gateway=createV2SandboxSupabaseGateway(db,{
   isolatedProjectConfirmed:true,projectRef:process.env.K4K_V2_SANDBOX_PROJECT_REF
  });
  const stripeReader=createStripeTestReader({secret:stripeKey});
  const stripeWriter=createV2SandboxStripeCheckoutClient({secret:stripeKey});
  const session=await initiateV2SandboxCheckout({
   verifiedUserId:user.id,offer:input.offer,
   env:process.env,stripeReader,stripeWriter,gateway
  });
  return reply({url:session.checkoutUrl,mode:'test',kind:input.offer},200);
 }catch(e){
  // The route does not expose secret keys, Stripe payloads or customer identity.
  if(String(e?.message)==='V2_TEST_NOT_APPROVED_USER')return reply({error:'TESTER_NOT_ALLOWED'},403);
  return reply({error:'V2_TEST_CHECKOUT_DISABLED'},503);
 }
}
