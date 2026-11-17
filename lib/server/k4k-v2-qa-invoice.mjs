import {createClient} from '@supabase/supabase-js';
import {K4K_V2_PLANS,v2PreviewAllowed} from '../k4k-plan-v2.mjs';

const V2='creator_2026_v2';
const safeId=(value,prefix)=>typeof value==='string'&&new RegExp('^'+prefix+'_[A-Za-z0-9_]{6,180}$').test(value);

export function validateV2PaidInvoice(invoice,sessions,ownerId){
 if(!invoice||invoice.livemode!==false||invoice.status!=='paid'||invoice.currency!=='gbp'
  ||!safeId(invoice.id,'in')||!safeId(invoice.customer,'cus')
  ||!['subscription_create','subscription_cycle'].includes(invoice.billing_reason))
  throw Error('V2_INVOICE_NOT_PAID_OR_SUPPORTED');
 const subscription=invoice.parent?.subscription_details?.subscription??invoice.subscription;
 if(!safeId(subscription,'sub'))throw Error('V2_SUBSCRIPTION_MISSING');
 const line=invoice.lines?.data;
 if(!Array.isArray(line)||line.length!==1)throw Error('V2_INVALID_INVOICE_LINES');
 const priceId=line[0]?.pricing?.price_details?.price??line[0]?.price?.id;
 const plan=Object.values(K4K_V2_PLANS).find(x=>x.priceId===priceId);
 if(!plan||invoice.amount_paid!==plan.gbpMinor||invoice.amount_due!==plan.gbpMinor)
  throw Error('V2_PRICE_OR_AMOUNT_MISMATCH');
 if(invoice.parent?.subscription_details?.metadata?.k4k_catalog_version!==V2)
  throw Error('V2_NOT_OUR_CATALOG');
 const match=(Array.isArray(sessions)?sessions:[]).find(session=>
  session.livemode===false&&session.status==='complete'&&session.payment_status==='paid'
  &&session.mode==='subscription'&&session.subscription===subscription
  &&session.customer===invoice.customer&&session.client_reference_id===ownerId
  &&session.metadata?.k4k_catalog_version===V2
  &&session.metadata?.plan_key===plan.key);
 if(!match)throw Error('V2_OWNER_CHECKOUT_UNVERIFIED');
 return Object.freeze({p_user:ownerId,p_subscription:subscription,p_customer:invoice.customer,p_invoice:invoice.id,p_price:priceId,p_amount_minor:plan.gbpMinor,credits:plan.credits});
}
function assertQaEnv(env){
 if(!v2PreviewAllowed(env)||env.K4K_PLAN_V2_OWNER_TEST_CHECKOUT!=='true'
  ||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(env.K4K_PLAN_V2_OWNER_ID??''))
  throw Error('V2_QA_PREVIEW_DISABLED');
 if(!env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw Error('V2_STRIPE_TEST_KEY_REQUIRED');
 if(!env.SUPABASE_SERVICE_ROLE_KEY||!env.NEXT_PUBLIC_SUPABASE_URL)throw Error('V2_QA_STORAGE_UNAVAILABLE');
}
async function stripeGet(path,env){
 const response=await fetch('https://api.stripe.com/v1/'+path,{headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('V2_STRIPE_VERIFY_FAILED');
 return response.json();
}
export async function reconcileV2QaPaidInvoice({invoiceId,eventId,env=process.env}){
 assertQaEnv(env);
 if(!safeId(invoiceId,'in')||typeof eventId!=='string'||!/^evt_[A-Za-z0-9_]{6,180}$/.test(eventId))
  throw Error('V2_INVALID_RECONCILE_REQUEST');
 const invoice=await stripeGet('invoices/'+encodeURIComponent(invoiceId),env);
 const subscription=invoice.parent?.subscription_details?.subscription??invoice.subscription;
 if(!safeId(subscription,'sub'))throw Error('V2_SUBSCRIPTION_MISSING');
 const query=new URLSearchParams({subscription,limit:'25'});
 const list=await stripeGet('checkout/sessions?'+query,env);
 const verified=validateV2PaidInvoice(invoice,list.data,env.K4K_PLAN_V2_OWNER_ID);
 const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('k4k_v2_qa_apply_paid_invoice',{p_event:eventId,...Object.fromEntries(Object.entries(verified).filter(([key])=>key!=='credits'))});
 if(error)throw Error('V2_QA_LEDGER_WRITE_FAILED');
 return {invoiceId,credits:verified.credits,...data};
}
