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
    invoice.status!=='paid'||(Object.hasOwn(invoice,'paid')&&invoice.paid!==true)||
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
  },
  async applyFullRefund({eventId,chargeId,receiptId}={}){
   // A refund is never inferred from webhook metadata. Re-fetch a current TEST
   // charge, then tie its original invoice or payment intent to an existing
   // unique V2 receipt in the isolated database.
   if(!id(eventId,'evt_')||!id(chargeId,'ch_')||
      (!id(receiptId,'in_')&&!id(receiptId,'pi_')))
     throw Error('V2_TEST_REFUND_INVALID');
   if(typeof stripe.getCharge!=='function'||typeof gateway.findReceipt!=='function')
     throw Error('V2_TEST_REFUND_VERIFIER_UNAVAILABLE');
   const charge=await stripe.getCharge(chargeId);
   const linkedInvoice=typeof charge?.invoice==='string'?charge.invoice:charge?.invoice?.id;
   const linkedIntent=typeof charge?.payment_intent==='string'?charge.payment_intent:charge?.payment_intent?.id;
   if(charge?.id!==chargeId||charge.livemode!==false||charge.refunded!==true||
      charge.disputed===true||!Number.isSafeInteger(charge.amount)||
      charge.amount<=0||charge.amount_refunded!==charge.amount||
      (receiptId!==linkedInvoice&&receiptId!==linkedIntent))
     throw Error('V2_TEST_FULL_REFUND_UNVERIFIED');
   const receipt=await gateway.findReceipt(receiptId);
   if(!receipt||!uuid.test(receipt.userId)||receipt.status!=='paid'&&receipt.status!=='refunded'||
      receipt.amountMinor!==charge.amount||
      receipt.currency?.toLowerCase()!==charge.currency||
      (receipt.sourceKind==='subscription_invoice'&&linkedInvoice!==receiptId)||
      (receipt.sourceKind==='single_video_payment'&&linkedIntent!==receiptId))
      throw Error('V2_TEST_REFUND_RECEIPT_MISMATCH');
   const result=await gateway.rpc('k4k_v2_refund_paid',{
    p_event:eventId,p_user:receipt.userId,p_receipt:receiptId
   });
   if(result?.error||typeof result?.data?.refunded!=='boolean')
     throw Error('V2_TEST_REFUND_RPC_FAILED');
   return Object.freeze({handled:true,...result.data,userId:receipt.userId});
  }
 });
}
export function createV2SandboxSupabaseGateway(db,{isolatedProjectConfirmed=false,projectRef}={}){
 // Defense against accidentally targeting the ONLY currently connected Supabase
 // project, which is the production Academy/K4K APP database.
 if(!isolatedProjectConfirmed||typeof projectRef!=='string'||
    projectRef!=='yhbhrkyihiyyfzqogyri'||
    typeof db?.from!=='function'||typeof db?.rpc!=='function')
  throw Error('V2_TEST_DB_NOT_ISOLATED');
 return Object.freeze({
  // Server-only Stripe Checkout binding lifecycle. All writes require the
  // TEST project's service-role client and server-authenticated owner.
  async insertPendingBinding(binding){
   const payload={
    session_key:binding.sessionId,
    stripe_session_id:binding.sessionId,
    user_id:binding.userId,
    kind:binding.kind,
    status:'pending',
    price_id:binding.priceId,
    stripe_customer_id:binding.customerId,
    stripe_subscription_id:null
   };
   const {data,error}=await db.from('k4k_v2_checkout_bindings')
    .insert(payload)
    .select('user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id')
    .single();
   if(error||!data)throw Error('V2_TEST_BINDING_CREATE_FAILED');
   return {
    sessionId:data.stripe_session_id,userId:data.user_id,kind:data.kind,
    status:data.status,priceId:data.price_id,customerId:data.stripe_customer_id,
    subscriptionId:data.stripe_subscription_id
   };
  },
  async findSessionBinding(sessionId){
   const {data,error}=await db.from('k4k_v2_checkout_bindings')
    .select('user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id')
    .eq('session_key',sessionId).maybeSingle();
   if(error)throw Error('V2_TEST_BINDING_LOOKUP_FAILED');
   return data?{
    sessionId:data.stripe_session_id,userId:data.user_id,kind:data.kind,
    status:data.status,priceId:data.price_id,customerId:data.stripe_customer_id,
    subscriptionId:data.stripe_subscription_id
   }:null;
  },
  async expirePendingBinding(binding){
   // Only expire an existing, still-pending, exact owner-bound TEST Checkout.
   // A completed or active subscription can never be expired by this path.
   if(!uuid.test(binding?.userId||'')||!id(binding?.sessionId,'cs_test_')||
      !id(binding?.customerId,'cus_')||
      !['subscription','single_video'].includes(binding.kind)||
      !sandboxPriceAllowed(binding.priceId,
        binding.kind==='subscription'?'subscription_invoice':'single_video_payment')||
      binding.status!=='pending'||binding.subscriptionId!==null)
     throw Error('V2_TEST_EXPIRED_BINDING_INPUT_INVALID');
   const {data,error}=await db.from('k4k_v2_checkout_bindings')
     .update({status:'expired'})
     .eq('session_key',binding.sessionId).eq('stripe_session_id',binding.sessionId)
     .eq('user_id',binding.userId).eq('kind',binding.kind)
     .eq('price_id',binding.priceId)
     .eq('stripe_customer_id',binding.customerId)
     .eq('status','pending').is('stripe_subscription_id',null)
     .select('user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id')
     .maybeSingle();
   if(error||!data)throw Error('V2_TEST_EXPIRED_BINDING_UPDATE_FAILED');
   return {
    sessionId:data.stripe_session_id,userId:data.user_id,kind:data.kind,
    status:data.status,priceId:data.price_id,customerId:data.stripe_customer_id,
    subscriptionId:data.stripe_subscription_id
   };
  },
  async activatePendingBinding(binding){
   const {data,error}=await db.from('k4k_v2_checkout_bindings')
    .update({status:'active',stripe_subscription_id:binding.subscriptionId})
    .eq('session_key',binding.sessionId)
    .eq('user_id',binding.userId)
    .eq('kind',binding.kind)
    .eq('price_id',binding.priceId)
    .eq('stripe_customer_id',binding.customerId)
    .eq('status','pending')
    .select('user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id')
    .maybeSingle();
   if(error)throw Error('V2_TEST_BINDING_ACTIVATE_FAILED');
   return data?{
    sessionId:data.stripe_session_id,userId:data.user_id,kind:data.kind,
    status:data.status,priceId:data.price_id,customerId:data.stripe_customer_id,
    subscriptionId:data.stripe_subscription_id
   }:null;
  },
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
  async setSubscriptionBillingState({binding,state,invoiceId}={}){
   // TEST service-role only, exact server-verified subscriber. No credit changes.
   if(!uuid.test(binding?.userId||'')||binding.kind!=='subscription'||
      binding.status!=='active'||!id(binding.customerId,'cus_')||
      !id(binding.subscriptionId,'sub_')||
      !sandboxPriceAllowed(binding.priceId,'subscription_invoice')||
      !id(invoiceId,'in_')||!['current','past_due'].includes(state))
     throw Error('V2_TEST_BILLING_STATE_INPUT_INVALID');
   const query=()=>db.from('k4k_v2_checkout_bindings')
     .select('user_id,billing_state,billing_invoice_id')
     .eq('user_id',binding.userId).eq('kind','subscription').eq('status','active')
     .eq('price_id',binding.priceId)
     .eq('stripe_customer_id',binding.customerId)
     .eq('stripe_subscription_id',binding.subscriptionId);
   const {data:prior,error:readError}=await query().maybeSingle();
   if(readError||!prior)throw Error('V2_TEST_BILLING_STATE_BINDING_NOT_FOUND');
   if(prior.billing_state===state&&prior.billing_invoice_id===invoiceId)
     return {state,invoiceId,duplicate:true};
   let update=db.from('k4k_v2_checkout_bindings')
     .update({billing_state:state,billing_invoice_id:invoiceId,
       billing_updated_at:new Date().toISOString()})
     .eq('user_id',binding.userId).eq('kind','subscription').eq('status','active')
     .eq('price_id',binding.priceId)
     .eq('stripe_customer_id',binding.customerId)
     .eq('stripe_subscription_id',binding.subscriptionId)
     .eq('billing_state',prior.billing_state);
   update=prior.billing_invoice_id===null?
     update.is('billing_invoice_id',null):
     update.eq('billing_invoice_id',prior.billing_invoice_id);
   const {data,error}=await update
     .select('billing_state,billing_invoice_id').maybeSingle();
   if(error||!data||data.billing_state!==state||data.billing_invoice_id!==invoiceId)
     throw Error('V2_TEST_BILLING_STATE_CONCURRENT_UPDATE');
   return {state,invoiceId,duplicate:false};
  },
  async cancelSubscriptionBinding(binding){
   // Only transitions the exact Stripe TEST subscription that a prior paid
   // Checkout bound. Cancellation does not revoke previously paid credits.
   if(!uuid.test(binding?.userId||'')||
      !id(binding?.subscriptionId,'sub_')||
      !id(binding?.customerId,'cus_')||
      !sandboxPriceAllowed(binding?.priceId,'subscription_invoice'))
    throw Error('V2_TEST_CANCEL_BINDING_INPUT_INVALID');
   const {data,error}=await db.from('k4k_v2_checkout_bindings')
    .update({status:'canceled'})
    .eq('user_id',binding.userId)
    .eq('kind','subscription')
    .eq('status','active')
    .eq('price_id',binding.priceId)
    .eq('stripe_customer_id',binding.customerId)
    .eq('stripe_subscription_id',binding.subscriptionId)
    .select('user_id,kind,status,price_id,stripe_customer_id,stripe_subscription_id,stripe_session_id')
    .maybeSingle();
   if(error)throw Error('V2_TEST_CANCEL_BINDING_UPDATE_FAILED');
   return data?{userId:data.user_id,kind:data.kind,status:data.status,
    priceId:data.price_id,customerId:data.stripe_customer_id,
    subscriptionId:data.stripe_subscription_id,sessionId:data.stripe_session_id}:null;
  },
  async findReceipt(receiptId){
   const {data,error}=await db.from('k4k_v2_credit_receipts')
    .select('receipt_key,user_id,source_kind,amount_minor,currency,status')
    .eq('receipt_key',receiptId).maybeSingle();
   if(error)throw Error('V2_TEST_RECEIPT_LOOKUP_FAILED');
   return data?{
    receiptId:data.receipt_key,userId:data.user_id,sourceKind:data.source_kind,
    amountMinor:Number(data.amount_minor),currency:data.currency,status:data.status
   }:null;
  },
  async rpc(name,args){
   if(![V2_SANDBOX_RPC_NAME,'k4k_v2_refund_paid'].includes(name))
    throw Error('V2_TEST_RPC_NAME_REJECTED');
   const {data,error}=await db.rpc(name,args);
   return {data,error};
  }
 });
}
