// Dedicated K4K V3 Stripe TEST-only signed webhook -> isolated Phase42 wallet.
// It is impossible to call a production Supabase project or LIVE Stripe account.
// All external account-wide invoice events outside the synthetic QA scope are ignored.
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {verifyStripeSignature} from '../../../../../lib/server/stripe-billing.mjs';
import {verifyV3SignedTestInvoice} from '../../../../../lib/server/v3-sandbox-signed-invoice.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(value,status)=>NextResponse.json(value,{status,headers:noStore});
const DB='https://yhbhrkyihiyyfzqogyri.supabase.co';
const PRICE='price_1Ue2WXL7fmdMaK0kstFPcl8A';
const stripeId=(id,prefix)=>typeof id==='string'&&
 new RegExp('^'+prefix+'_[A-Za-z0-9]{8,120}$').test(id);
const stripeGet=async(key,kind,id)=>{
 const prefix=kind==='invoices'?'in':kind==='subscriptions'?'sub':'price';
 if(!stripeId(id,prefix))throw Error('K4K_V3_TEST_STRIPE_ID_INVALID');
 const result=await fetch('https://api.stripe.com/v1/'+kind+'/'+encodeURIComponent(id),{
  method:'GET',cache:'no-store',redirect:'error',
  headers:{Authorization:'Bearer '+key,Accept:'application/json'},
  signal:AbortSignal.timeout(8000)
 });
 if(!result.ok)throw Error('K4K_V3_TEST_STRIPE_FETCH_FAILED');
 return result.json();
};
export async function POST(request){
 if(process.env.VERCEL_ENV!=='preview'||
   process.env.NEXT_PUBLIC_SUPABASE_URL!==DB||
   process.env.K4K_V3_TEST_WEBHOOK_ENABLED!=='true')
  return reply({error:'V3_TEST_WEBHOOK_NOT_CONFIGURED'},503);
 const key=process.env.STRIPE_V2_TEST_SECRET_KEY||'';
 const secret=process.env.K4K_V3_TEST_WEBHOOK_SECRET||'';
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
 if(!/^sk_test_[A-Za-z0-9]{12,}$/.test(key)||
    !/^whsec_[A-Za-z0-9]{12,}$/.test(secret)||
    service.length<35||service.startsWith('sb_publishable_'))
  return reply({error:'V3_TEST_SERVER_AUTH_UNAVAILABLE'},503);
 const length=Number(request.headers.get('content-length')||0);
 if(!Number.isSafeInteger(length)||length>262144)
  return reply({error:'INVALID_SIZE'},413);
 let raw;
 try{raw=await request.text();}catch{return reply({error:'UNREADABLE'},400);}
 if(raw.length<10||raw.length>262144)
  return reply({error:'INVALID_BODY_SIZE'},400);
 if(!verifyStripeSignature({
  payload:raw,header:request.headers.get('stripe-signature'),secret
 }))return reply({error:'INVALID_STRIPE_SIGNATURE'},400);
 let event;
 try{event=JSON.parse(raw);}catch{return reply({error:'INVALID_JSON'},400);}
 if(event?.livemode!==false)return reply({error:'LIVE_EVENT_REJECTED'},400);
 if(event?.type!=='invoice.paid')
  return reply({received:true,handled:false,creditsAdded:0},200);
 const snapshot=event?.data?.object;
 // Trial-start and zero-value invoices are never purchases: acknowledge
 // without Stripe reads, DB writes or retry storms.
 if(!Number.isSafeInteger(snapshot?.amount_paid)||snapshot.amount_paid<=0)
  return reply({received:true,handled:false,creditsAdded:0},200);
 const hinted=snapshot?.lines?.data?.[0]?.pricing?.price_details?.price||
  snapshot?.lines?.data?.[0]?.price?.id;
 // Stripe webhooks are account-wide: unrelated apps' invoices are not ours.
 if(hinted!==PRICE)
  return reply({received:true,handled:false,creditsAdded:0},200);
 try{
  const invoice=await stripeGet(key,'invoices',snapshot.id);
  const subId=invoice?.parent?.subscription_details?.subscription||invoice?.subscription;
  if(!stripeId(subId,'sub'))throw Error('V3_TEST_SUBSCRIPTION_ID_UNVERIFIED');
  const [subscription,price]=await Promise.all([
   stripeGet(key,'subscriptions',subId),
   stripeGet(key,'prices',PRICE)
  ]);
  const rpcArgs=verifyV3SignedTestInvoice(event,invoice,subscription,price);
  if(!rpcArgs)throw Error('V3_TEST_PAYMENT_PROOF_REJECTED');
  // Only the service role has EXECUTE on this isolated QA wrapper. The
  // underlying Phase42 ledger independently checks ownership, price, wallet,
  // legacy membership absence and invoice/period idempotency.
  const db=createClient(DB,service,{
   auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data,error}=await db.rpc('k4k_v3_test_phase43_grant_signed_invoice',rpcArgs);
  if(error)throw Error('V3_TEST_PROTECTED_RPC_FAILED');
  const granted=data?.result==='granted'&&data.creditsAdded===420&&
   Number.isSafeInteger(data.newAvailable)&&data.newAvailable>=0;
  const duplicate=data?.result==='duplicate'&&data.creditsAdded===0;
  if(!granted&&!duplicate)throw Error('V3_TEST_RPC_RESPONSE_UNVERIFIED');
  // No invoice/customer/subscription/secret in response or logs.
  return reply({received:true,handled:true,
   result:granted?'granted':'duplicate',
   creditsAdded:granted?420:0,liveCustomerAffected:false},200);
 }catch{
  // Stripe TEST retries when reconciliation cannot prove an exact grant.
  return reply({error:'V3_TEST_RECONCILIATION_RETRY'},503);
 }
}
