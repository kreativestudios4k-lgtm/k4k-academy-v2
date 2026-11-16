import {createClient} from '@supabase/supabase-js';
import {assertProcessingKey} from './billing-policy.mjs';
import {configuredLivePrices} from './live-price-config.mjs';
import {invoiceSubscriptionId,invoiceLinePriceId} from './stripe-invoice-shape.mjs';
import {verifiedManualPix} from './manual-pix.mjs';
const idOf=x=>typeof x==='string'?x:x?.id;
const stripeId=(x,prefix)=>typeof x==='string'&&x.startsWith(prefix)&&/^[A-Za-z0-9_]{4,250}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(x);
const int=x=>Number.isSafeInteger(x)&&x>=0&&x<=2147483647;
export const financeEnabled=(env=process.env)=>env.VERCEL_ENV==='production'&&env.K4K_AFFILIATE_FINANCE_ENABLED==='true';
export const validCommissionSource=(kind,id)=>kind==='card_invoice'?stripeId(id,'in_'):kind==='manual_pix'&&uuid(id);
export const statementFields='source_kind,source_id,partner_code,currency,gross_minor,tax_minor,refunded_minor,eligible_minor,commission_bps,commission_minor,state,paid_minor,payout_channel,payout_reference,payment_at,approved_at,requested_at,paid_at';
const fail=()=>{throw Error('AFFILIATE_PAYMENT_REVIEW_REQUIRED')};
async function read(result){const {data,error}=await result;if(error)throw Error('AFFILIATE_DATABASE_UNAVAILABLE');return data}
export async function affiliateContext(request,{admin=false,env=process.env}={}){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)throw Error('UNAUTHENTICATED');
 const url=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!secret)throw Error('UNAVAILABLE');
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
 if(error||!user||user.is_anonymous)throw Error('UNAUTHENTICATED');
 const db=createClient(url,secret,options);
 const row=await read(db.from(admin?'k4k_admins':'k4k_app_partners').select(admin?'user_id':'user_id,active').eq('user_id',user.id).maybeSingle());
 if(!row||(!admin&&!row.active))throw Error('FORBIDDEN');
 return {db,user};
}
export function stripeReader(env=process.env,fetchImpl=fetch){
 if(assertProcessingKey(env.STRIPE_SECRET_KEY,env)!=='live')throw Error('BILLING_MODE_MISMATCH');
 return async path=>{const r=await fetchImpl('https://api.stripe.com/v1/'+path,{headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('AFFILIATE_STRIPE_UNAVAILABLE');return r.json()};
}
export function verifiedCharge(intent,{gross,currency,liveMode=true}){
 const charge=intent?.latest_charge;
 if(!int(gross)||gross<=0||!['brl','gbp','eur','usd'].includes(currency)||intent?.livemode!==liveMode||intent.status!=='succeeded'||intent.currency!==currency||intent.amount!==gross||intent.amount_received!==gross||!stripeId(intent.id,'pi_')||!charge||typeof charge!=='object'||charge.livemode!==liveMode||charge.paid!==true||charge.captured===false||charge.currency!==currency||charge.amount!==gross||idOf(charge.payment_intent)!==intent.id||(!stripeId(charge.id,'ch_')&&!stripeId(charge.id,'py_'))||!int(charge.amount_refunded)||charge.amount_refunded>gross||typeof charge.disputed!=='boolean')fail();
 return {chargeId:charge.id,refund:charge.amount_refunded,disputed:charge.disputed};
}
export function invoiceTax(invoice,gross){
 const ex=invoice.total_excluding_tax;
 if(int(ex)&&ex<=gross)return gross-ex;
 const taxes=invoice.total_taxes??invoice.total_tax_amounts;
 if(!Array.isArray(taxes)||taxes.some(t=>!int(t.amount)))fail();
 const total=taxes.reduce((n,t)=>n+t.amount,0);if(!int(total)||total>gross)fail();return total;
}
async function hasReferral(db,userId){
 const referral=await read(db.from('k4k_app_referrals').select('user_id').eq('user_id',userId).maybeSingle());
 return !!referral;
}
async function invoicePaymentIntent(invoice,get,gross){
 if(stripeId(idOf(invoice.payment_intent),'pi_'))return idOf(invoice.payment_intent);
 const query=new URLSearchParams({invoice:invoice.id,limit:'100'});
 const payments=await get('invoice_payments?'+query.toString());
 if(!Array.isArray(payments.data)||payments.has_more!==false)fail();
 const paid=payments.data.filter(p=>p.status==='paid'&&p.amount_paid>0);
 if(paid.length!==1||paid[0].amount_paid!==gross||idOf(paid[0].invoice)!==invoice.id||paid[0].payment?.type!=='payment_intent'||!stripeId(idOf(paid[0].payment.payment_intent),'pi_'))fail();
 return idOf(paid[0].payment.payment_intent);
}
export async function syncAffiliateCommission({db,kind,sourceId,env=process.env,get=stripeReader(env)}){
 if(!validCommissionSource(kind,sourceId))throw Error('INVALID_COMMISSION_SOURCE');
 let userId,gross,tax,currency,paymentAt,charge;
 if(kind==='card_invoice'){
  const invoice=await get('invoices/'+sourceId);
  if(invoice.id!==sourceId||invoice.livemode!==true)fail();
  const subscriptionId=invoiceSubscriptionId(invoice);
  if(!stripeId(subscriptionId,'sub_'))return {skipped:true,reason:'NOT_SUBSCRIPTION'};
  const membership=await read(db.from('k4k_app_memberships').select('user_id,stripe_customer_id,stripe_subscription_id').eq('stripe_subscription_id',subscriptionId).maybeSingle());
  if(!membership||!await hasReferral(db,membership.user_id))return {skipped:true,reason:'NO_ELIGIBLE_REFERRAL'};
  if(idOf(invoice.customer)!==membership.stripe_customer_id)fail();
  if(!['subscription_create','subscription_cycle'].includes(invoice.billing_reason)||invoice.status!=='paid')return {skipped:true,reason:'NOT_ELIGIBLE_INVOICE'};
  if(invoice.amount_paid===0)return {skipped:true,reason:'ZERO_PAYMENT'};
  const approved=new Set(Object.values(configuredLivePrices('plans',env)||{}).flatMap(Object.values));
  const lines=invoice.lines?.data;
  if(invoice.lines?.has_more!==false||!Array.isArray(lines)||lines.length!==1||!approved.has(invoiceLinePriceId(lines[0]))||!int(invoice.total)||invoice.total<=0||invoice.amount_paid!==invoice.total||!int(invoice.status_transitions?.paid_at))fail();
  userId=membership.user_id;gross=invoice.total;currency=invoice.currency;tax=invoiceTax(invoice,gross);paymentAt=new Date(invoice.status_transitions.paid_at*1000).toISOString();
  const pi=await invoicePaymentIntent(invoice,get,gross);
  const intent=await get('payment_intents/'+pi+'?expand[]=latest_charge');if(intent.id!==pi||idOf(intent.customer)!==membership.stripe_customer_id)fail();
  charge=verifiedCharge(intent,{gross,currency});
 }else{
  const order=await read(db.from('k4k_manual_pix_orders').select('*').eq('id',sourceId).maybeSingle());
  if(!order||order.credit_mode!=='live'||!order.fulfilled_at||!await hasReferral(db,order.user_id))return {skipped:true,reason:'NO_ELIGIBLE_REFERRAL'};
  if(!stripeId(order.stripe_session_id,'cs_live_')||!stripeId(order.stripe_payment_intent_id,'pi_'))fail();
  const session=await get('checkout/sessions/'+order.stripe_session_id+'?expand[]=line_items&expand[]=payment_intent.latest_charge');
  if(session.id!==order.stripe_session_id||session.payment_intent?.id!==order.stripe_payment_intent_id)fail();
  const result=verifiedManualPix(session,order,{liveMode:true,env});
  if(result.pending)fail();
  userId=order.user_id;gross=order.amount;currency='brl';tax=session.total_details?.amount_tax;paymentAt=new Date(order.paid_at).toISOString();
  if(!int(tax)||tax>gross)fail();
  charge=verifiedCharge(session.payment_intent,{gross,currency});
 }
 return read(db.rpc('k4k_affiliate_record_commission',{p_kind:kind,p_source:sourceId,p_charge:charge.chargeId,p_user:userId,p_currency:currency.toUpperCase(),p_gross:gross,p_tax:tax,p_refund:charge.refund,p_disputed:charge.disputed,p_paid_at:paymentAt}));
}
export async function reconcileAffiliateEvent(event,{db,env=process.env,get}={}){
 if(!financeEnabled(env)||event?.livemode!==true)return;
 const obj=event.data?.object;
 if(event.type==='invoice.paid'&&obj?.id)return syncAffiliateCommission({db,kind:'card_invoice',sourceId:obj.id,env,get});
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&obj?.metadata?.kind==='k4k_manual_pix'&&obj.payment_status==='paid')return syncAffiliateCommission({db,kind:'manual_pix',sourceId:obj.metadata.order_id,env,get});
 if(['charge.refunded','charge.dispute.created'].includes(event.type)&&obj?.id&&int(obj.amount_refunded)){
  return read(db.rpc('k4k_affiliate_review_charge',{p_charge:obj.id,p_refund:obj.amount_refunded,p_disputed:event.type==='charge.dispute.created'||obj.disputed===true}));
 }
}
export function commissionError(error){
 const code=error?.message||'UNAVAILABLE';
 const status=code==='UNAUTHENTICATED'?401:code==='FORBIDDEN'?403:['INVALID_COMMISSION_SOURCE','INVALID_ACTION','INVALID_REQUEST'].includes(code)?400:['AFFILIATE_PAYMENT_REVIEW_REQUIRED','COMMISSION_NOT_READY','COMMISSION_REVIEW_REQUIRED','PAYOUT_NOT_AVAILABLE','PAYOUT_RECORD_INVALID'].includes(code)?409:503;
 return Response.json({error:status===503?'AFFILIATE_FINANCE_UNAVAILABLE':code},{status,headers:{'Cache-Control':'no-store'}});
}
export async function listCommissionRows(db,{partnerId=null,limit=200}={}){
 let query=db.from('k4k_affiliate_commissions').select(partnerId?statementFields:statementFields+',partner_user_id');
 if(partnerId)query=query.eq('partner_user_id',partnerId);
 return read(query.order('payment_at',{ascending:false}).limit(limit));
}
export async function transitionCommission(db,{kind,sourceId,action,expectedMinor,reference=null,channel=null}){
 const {data,error}=await db.rpc('k4k_affiliate_commission_transition',{p_kind:kind,p_source:sourceId,p_action:action,p_expected_minor:expectedMinor,p_reference:reference,p_channel:channel});
 if(error)throw Error(['COMMISSION_NOT_READY','COMMISSION_REVIEW_REQUIRED','PAYOUT_RECORD_INVALID'].includes(error.message)?error.message:'AFFILIATE_DATABASE_UNAVAILABLE');return data;
}
