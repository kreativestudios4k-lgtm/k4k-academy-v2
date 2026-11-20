// Dedicated signed Stripe TEST webhook. No calls to original LIVE/legacy
// billing handlers. Deployment Protection may require an approved bypass
// configured directly in Vercel/Stripe TEST dashboard (never in this source).
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {verifyStripeSignature} from '../../../../../lib/server/stripe-billing.mjs';
import {assertV2SandboxRuntime} from '../../../../../lib/server/v2-sandbox-catalog.mjs';
import {createV2SandboxSupabaseGateway} from '../../../../../lib/server/v2-sandbox-payment-adapter.mjs';
import {createStripeTestReader} from '../../../../../lib/server/v2-stripe-test-reader.mjs';
import {createV2SandboxWebhookDispatcher} from '../../../../../lib/server/v2-sandbox-webhook-dispatch.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const reply=(value,status)=>NextResponse.json(value,{status,headers});
export async function POST(request){
 try{
  assertV2SandboxRuntime(process.env);
  if(process.env.K4K_V2_SANDBOX_WEBHOOK_ENABLED!=='true')
   return reply({error:'V2_TEST_WEBHOOK_NOT_ENABLED'},503);
  if(process.env.K4K_V2_SANDBOX_PROJECT_REF!=='yhbhrkyihiyyfzqogyri'||
    process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://yhbhrkyihiyyfzqogyri.supabase.co')
   return reply({error:'TEST_DATABASE_NOT_ISOLATED'},503);
  const secret=process.env.STRIPE_V2_TEST_WEBHOOK_SECRET;
  const stripeKey=process.env.STRIPE_V2_TEST_SECRET_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret||!/^whsec_[A-Za-z0-9]+$/.test(secret)||
    !/^sk_test_[A-Za-z0-9]+$/.test(stripeKey||'')||!serviceKey)
   return reply({error:'TEST_CREDENTIALS_UNAVAILABLE'},503);
  const contentLength=Number(request.headers.get('content-length'));
  if(Number.isFinite(contentLength)&&contentLength>1048576)
   return reply({error:'REQUEST_TOO_LARGE'},413);
  const raw=await request.text();
  if(raw.length>1048576)return reply({error:'REQUEST_TOO_LARGE'},413);
  if(!verifyStripeSignature({payload:raw,header:request.headers.get('stripe-signature'),secret}))
   return reply({error:'INVALID_SIGNATURE'},400);
  let event;
  try{event=JSON.parse(raw)}catch{return reply({error:'INVALID_JSON'},400);}
  if(event.livemode!==false)return reply({error:'LIVE_EVENT_REJECTED'},400);
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKey,{
   auth:{persistSession:false,autoRefreshToken:false}
  });
  const gateway=createV2SandboxSupabaseGateway(db,{
   isolatedProjectConfirmed:true,projectRef:process.env.K4K_V2_SANDBOX_PROJECT_REF
  });
  const stripe=createStripeTestReader({secret:stripeKey});
  const dispatcher=createV2SandboxWebhookDispatcher({stripe,gateway,env:process.env});
  const processed=await dispatcher.handleVerifiedEvent(event);
  return reply({received:true,handled:processed.handled===true},200);
 }catch{
  // Fail closed and let Stripe TEST retry. Never print incoming session data.
  return reply({error:'V2_TEST_RETRY'},503);
 }
}
