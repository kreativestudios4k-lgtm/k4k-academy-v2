import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {v2PreviewAllowed} from '../../../../lib/k4k-plan-v2.mjs';
import {reconcileV2QaPaidInvoice} from '../../../../lib/server/k4k-v2-qa-invoice.mjs';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
const respond=(body,status)=>NextResponse.json(body,{status,headers});
export async function POST(request){
 if(!v2PreviewAllowed()||process.env.K4K_PLAN_V2_OWNER_TEST_CHECKOUT!=='true')return respond({error:'NOT_AVAILABLE'},404);
 const jwt=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!jwt)return respond({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!publicKey)return respond({error:'CONFIGURATION_UNAVAILABLE'},503);
 const auth=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await auth.auth.getUser(jwt);
 if(error||!user||user.is_anonymous||user.id!==process.env.K4K_PLAN_V2_OWNER_ID)return respond({error:'NOT_AVAILABLE'},404);
 let body;try{body=await request.json()}catch{return respond({error:'INVALID_REQUEST'},400)}
 if(!body||typeof body.invoiceId!=='string'||!/^in_[A-Za-z0-9_]{6,180}$/.test(body.invoiceId)||Object.keys(body).length!==1)
  return respond({error:'INVALID_REQUEST'},400);
 try{
  // Live Stripe keys, browser-supplied credits, and unverified invoice IDs are never accepted.
  const result=await reconcileV2QaPaidInvoice({invoiceId:body.invoiceId,eventId:'evt_v2qa_reconcile_'+body.invoiceId});
  return respond({credits:result.credits,granted:result.granted,balance:result.balance,reason:result.reason},200);
 }catch(e){console.warn('K4K QA reconciliation failed',{reason:String(e?.message||'UNKNOWN').slice(0,64)});return respond({error:'RECONCILE_NOT_READY'},503)}
}
