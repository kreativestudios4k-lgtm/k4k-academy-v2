import {NextResponse} from 'next/server';
import {verifyStripeSignature} from '../../../../lib/server/stripe-billing.mjs';
import {v2PreviewAllowed} from '../../../../lib/k4k-plan-v2.mjs';
import {reconcileV2QaPaidInvoice} from '../../../../lib/server/k4k-v2-qa-invoice.mjs';

export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function POST(request){
 if(!v2PreviewAllowed()||process.env.K4K_PLAN_V2_OWNER_TEST_CHECKOUT!=='true')
  return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers});
 const secret=process.env.STRIPE_V2_QA_WEBHOOK_SECRET;
 if(typeof secret!=='string'||!secret.startsWith('whsec_'))
  return NextResponse.json({error:'V2_WEBHOOK_NOT_READY'},{status:503,headers});
 const raw=await request.text();
 if(raw.length>256000||!verifyStripeSignature({payload:raw,header:request.headers.get('stripe-signature'),secret}))
  return NextResponse.json({error:'INVALID_SIGNATURE'},{status:400,headers});
 let event;try{event=JSON.parse(raw)}catch{return NextResponse.json({error:'INVALID_EVENT'},{status:400,headers})}
 if(event?.livemode!==false)return NextResponse.json({error:'LIVE_EVENT_FORBIDDEN'},{status:400,headers});
 if(event.type!=='invoice.paid')return NextResponse.json({received:true,handled:false},{status:200,headers});
 const invoice=event.data?.object;
 if(!invoice?.id||invoice.parent?.subscription_details?.metadata?.k4k_catalog_version!=='creator_2026_v2')
  return NextResponse.json({received:true,handled:false,reason:'OUTSIDE_V2_QA'},{status:200,headers});
 try{
  const result=await reconcileV2QaPaidInvoice({invoiceId:invoice.id,eventId:event.id});
  return NextResponse.json({received:true,handled:true,granted:result.granted,credits:result.credits},{status:200,headers});
 }catch(error){
  console.warn('K4K v2 QA paid invoice needs retry',{reason:String(error?.message||'FAILED').slice(0,64)});
  return NextResponse.json({error:'RETRY'},{status:503,headers});
 }
}
