// Runnable Stripe TEST -> isolated V2 ledger adapter, intentionally *not*
// mounted in production route or legacy createMembershipStore. The only
// available connected Supabase project is LIVE; never point this at it.
// The isolated gateway must derive identity from a server-persisted checkout
// binding, not from metadata supplied by the webhook or browser.
import {invoiceLinePriceId,invoiceSubscriptionId} from './stripe-invoice-shape.mjs';
import {sandboxPriceAllowed,assertV2SandboxRuntime,V2_SANDBOX_RPC_NAME}
 from './v2-sandbox-catalog.mjs';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const id=(s,p)=>typeof s==='string'&&s.startsWith(p)&&s.length>=p.length+7;
const noDiscounts=p=>(!p.discounts||p.discounts.length===0)&&
 (!p.total_discount_amounts||p.total_discount_amounts.every(x=>x.amount===0));
function verifiedBinding(binding,{kind,priceId,customerId,subscriptionId=null,sessionId=null}){
 if(!binding||!uuid.test(binding.userId)||binding.kind!==kind||
    binding.status!=='active'||binding.priceId!==priceId||
    (customerId&&binding.customerId!==customerId)||
    (subscriptionId&&binding.subscriptionId!==subscriptionId)||
    (sessionId&&binding.sessionId!==sessionId))throw Error('V2_TEST_OWNER_BINDING_INVALID');
 return binding.userId;
}
function verifiedSubscriptionInvoice(invoice){
 const items=invoice?.lines?.data,priceId=invoiceLinePriceId(items?.[0]);
 const contract=sandboxPriceAllowed(priceId,'subscription_invoice');
 const subscriptionId=invoiceSubscriptionId(invoice);
 if(!contract||!id(invoice?.id,'in_')||!id(invoice?.customer,'cus_')||
    !id(subscriptionId,'sub_')||invoice.livemode!==false||
    invoice.status!=='paid'||invoice.paid!==true||
    !['subscription_create','subscription_cycle'].includes(invoice.billing_reason)||
    items?.length!==1||items[0].quantity!==1||!noDiscounts(invoice)||
    invoice.currency!==contract.currency.toLowerCase()||
    invoice.amount_paid!==contract.amountMinor||
    invoice.total!==contract.amountMinor||
    invoice.amount_due!==contract.amountMinor||
    invoice.amount_remaining!==0)
   throw Error('V2_TEST_INVOICE_INVALID');
 return {contract,receiptId:invoice.id,customerId:invoice.customer,subscriptionId};
}
function verifiedSingleSession(session){
 const line=session?.line_items?.data;
 const priceId=line?.[0]?.price?.id;
 const contract=sandboxPriceAllowed(priceId,'single_video_payment');
 const intent=session?.payment_intent,charge=intent?.latest_charge;
 if(!contract||session?.livemode!==false||!id(session.id,'cs_')||
    session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||
    session.currency!==contract.currency.toLowerCase()||session.amount_total!==contract.amountMinor||
    session.amount_subtotal!==contract.amountMinor||line?.length!==1||
    line[0].quantity!==1||session.total_details?.amount_discount!==0||
    session.automatic_tax?.enabled!==true||session.automatic_tax?.status!=='complete'||
    session.metadata?.kind!=='k4k_v2_single_video'||session.metadata?.credit_version!=='v2'||
    session.metadata?.product_id!==contract.productId||
    !id(intent?.id,'pi_')||intent?.status!=='succeeded'||
    !id(charge?.id,'ch_')||charge.refunded===true||charge.disputed===true||
    charge.amount_refunded!==0||charge.payment_intent!==intent.id)
   throw Error('V2_TEST_SINGLE_INVALID');
 return {contract,receiptId:intent.id,sessionId:session.id,
  customerId:session.customer,assertedUserId:session.client_reference_id};
}
export function createV2SandboxPaymentAdapter({stripe,gateway,env=process.env}={}){
 assertV2SandboxRuntime(env);
 if(!stripe||typeof stripe.getInvoice!=='function'||typeof stripe.getSession!=='function'||
    !gateway||typeof gateway.findBinding!=='function'||typeof gateway.rpc!=='function')
   throw Error('V2_TEST_DEPENDENCIES_MISSING');
 async function grant({eventId,owner,contract,receiptId}){
  if(!id(eventId,'evt_')||!uuid.test(owner))throw Error('V2_TEST_EVENT_INVALID');
  const params={
   p_event:eventId,p_user:owner,p_receipt:receiptId,p_source_kind:contract.kind,
   p_stripe_price:contract.priceId,p_amount_minor:contract.amountMinor,
   p_currency:contract.currency,p_credits:contract.credits
  };
  const result=await gateway.rpc(V2_SANDBOX_RPC_NAME,params);
  if(result?.error||!result?.data||typeof result.data.credited!=='boolean')
   throw Error('V2_TEST_LEDGER_RPC_FAILED');
  return Object.freeze({handled:true,...result.data,userId:owner});
 }
 return Object.freeze({
  async applyPaidInvoice({invoiceId,eventId}={}){
   if(!id(invoiceId,'in_'))throw Error('V2_TEST_INVOICE_ID_INVALID');
   // Always fetch current Stripe TEST state before reading any customer wallet.
   const invoice=await stripe.getInvoice(invoiceId);
   if(invoice?.id!==invoiceId)throw Error('V2_TEST_RECEIPT_CHANGED');
   const verified=verifiedSubscriptionInvoice(invoice);
   const binding=await gateway.findBinding({
    kind:'subscription',customerId:verified.customerId,
    subscriptionId:verified.subscriptionId,priceId:verified.contract.priceId
   });
   const owner=verifiedBinding(binding,{
    kind:'subscription',priceId:verified.contract.priceId,
    customerId:verified.customerId,subscriptionId:verified.subscriptionId
   });
   return grant({eventId,owner,contract:verified.contract,receiptId:verified.receiptId});
  },
  async applyPaidSingleVideo({sessionId,eventId}={}){
   if(!id(sessionId,'cs_'))throw Error('V2_TEST_SESSION_ID_INVALID');
   const session=await stripe.getSession(sessionId);
   if(session?.id!==sessionId)throw Error('V2_TEST_RECEIPT_CHANGED');
   const verified=verifiedSingleSession(session);
   const binding=await gateway.findBinding({
    kind:'single_video',sessionId,priceId:verified.contract.priceId
   });
   const owner=verifiedBinding(binding,{
    kind:'single_video',priceId:verified.contract.priceId,sessionId
   });
   if(session.metadata?.user_id!==owner||verified.assertedUserId!==owner)
    throw Error('V2_TEST_SESSION_OWNER_CONFLICT');
   return grant({eventId,owner,contract:verified.contract,receiptId:verified.receiptId});
  }
 });
}
export function createV2SandboxSupabaseGateway(db,{isolatedProjectConfirmed=false}={}){
 if(!isolatedProjectConfirmed||typeof db?.from!=='function'||typeof db?.rpc!=='function')
  throw Error('V2_TEST_DB_NOT_ISOLATED');
 return Object.freeze({
  async findBinding(filters){
   let query=db.from('k4k_v2_checkout_bindings')
    .select('user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id')
    .eq('kind',filters.kind).eq('price_id',filters.priceId);
   if(filters.customerId)query=query.eq('stripe_customer_id',filters.customerId);
   if(filters.subscriptionId)query=query.eq('stripe_subscription_id',filters.subscriptionId);
   if(filters.sessionId)query=query.eq('stripe_session_id',filters.sessionId);
   const {data,error}=await query.maybeSingle();
   if(error)throw Error('V2_TEST_OWNER_LOOKUP_FAILED');
   if(!data)return null;
   return {userId:data.user_id,kind:data.kind,status:data.status,priceId:data.price_id,
    customerId:data.stripe_customer_id,subscriptionId:data.stripe_subscription_id,
    sessionId:data.stripe_session_id};
  },
  async rpc(name,args){
   if(name!==V2_SANDBOX_RPC_NAME)throw Error('V2_TEST_RPC_NAME_REJECTED');
   const {data,error}=await db.rpc(name,args);
   return {data,error};
  }
 });
}
