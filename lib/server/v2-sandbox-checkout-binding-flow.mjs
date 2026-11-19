// Stage 7 — server-only Stripe TEST checkout binding lifecycle.
// NOT a public route. Requires independently verified Supabase user from the
// protected TEST backend. No LIVE Stripe or production Supabase mutation.
import {sandboxContractForPrice,assertV2SandboxRuntime} from './v2-sandbox-catalog.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stripeId=(id,prefix)=>typeof id==='string'&&id.startsWith(prefix)&&id.length>=prefix.length+7;
function validateSession(session){
 if(!session||session.livemode!==false||!stripeId(session.id,'cs_test_')||
    !stripeId(session.customer,'cus_')||
    !['subscription','payment'].includes(session.mode)||
    !['open','complete'].includes(session.status)||
    !['unpaid','paid'].includes(session.payment_status)||
    session.metadata?.credit_version!=='v2'||
    !uuid.test(session.client_reference_id||''))throw Error('V2_TEST_CHECKOUT_SESSION_INVALID');
 const lines=session.line_items?.data;
 if(!Array.isArray(lines)||lines.length!==1||lines[0]?.quantity!==1)
  throw Error('V2_TEST_CHECKOUT_ITEMS_INVALID');
 const contract=sandboxContractForPrice(lines[0]?.price?.id);
 if(!contract||session.currency!==contract.currency.toLowerCase())
  throw Error('V2_TEST_CHECKOUT_PRICE_INVALID');
 if((contract.kind==='subscription_invoice')!==(session.mode==='subscription'))
  throw Error('V2_TEST_CHECKOUT_MODE_INVALID');
 const intendedKind=contract.kind==='subscription_invoice'?'k4k_v2_subscription':'k4k_v2_single_video';
 if(session.metadata?.kind!==intendedKind||
    session.metadata?.user_id!==session.client_reference_id||
    (contract.kind==='single_video_payment'&&session.metadata?.product_id!==contract.productId))
  throw Error('V2_TEST_CHECKOUT_METADATA_INVALID');
 if(session.amount_subtotal!=null&&session.amount_subtotal!==contract.amountMinor)
  throw Error('V2_TEST_CHECKOUT_AMOUNT_INVALID');
 if(session.amount_total!=null&&session.amount_total!==contract.amountMinor)
  throw Error('V2_TEST_CHECKOUT_AMOUNT_INVALID');
 return contract;
}
export function createV2SandboxCheckoutBindingFlow({stripe,gateway,env=process.env}={}){
 assertV2SandboxRuntime(env);
 if(typeof stripe?.getSession!=='function'||typeof gateway?.insertPendingBinding!=='function'||
    typeof gateway?.findSessionBinding!=='function'||typeof gateway?.activatePendingBinding!=='function')
   throw Error('V2_TEST_CHECKOUT_BINDING_DEPENDENCY_MISSING');
 return Object.freeze({
  // Call only from the trusted server immediately after creating a TEST session.
  // The verifiedUserId comes from a fresh authenticated Supabase identity, NOT the browser.
  async recordPendingSession({sessionId,verifiedUserId}={}){
   if(!stripeId(sessionId,'cs_test_')||!uuid.test(verifiedUserId||''))
    throw Error('V2_TEST_CHECKOUT_OWNER_INVALID');
   const session=await stripe.getSession(sessionId);
   if(session.id!==sessionId||session.status!=='open'||session.payment_status!=='unpaid'||
      session.subscription!=null)throw Error('V2_TEST_PENDING_SESSION_INVALID');
   const contract=validateSession(session);
   if(session.client_reference_id!==verifiedUserId)
    throw Error('V2_TEST_CHECKOUT_OWNER_MISMATCH');
   const binding={
    sessionId,userId:verifiedUserId,kind:contract.kind==='subscription_invoice'?'subscription':'single_video',
    status:'pending',priceId:contract.priceId,customerId:session.customer,subscriptionId:null
   };
   const result=await gateway.insertPendingBinding(binding);
   if(result?.status!=='pending'||result.userId!==verifiedUserId||
      result.sessionId!==sessionId||result.priceId!==contract.priceId)
    throw Error('V2_TEST_PENDING_BINDING_FAILED');
   return Object.freeze({...result});
  },
  async activatePaidSession({sessionId}={}){
   if(!stripeId(sessionId,'cs_test_'))throw Error('V2_TEST_SESSION_INVALID');
   const session=await stripe.getSession(sessionId);
   if(session.id!==sessionId||session.status!=='complete'||session.payment_status!=='paid')
    throw Error('V2_TEST_SESSION_NOT_PAID');
   const contract=validateSession(session);
   const prior=await gateway.findSessionBinding(sessionId);
   const kind=contract.kind==='subscription_invoice'?'subscription':'single_video';
   if(!prior||prior.status!=='pending'&&prior.status!=='active'||
      prior.kind!==kind||prior.priceId!==contract.priceId||
      prior.customerId!==session.customer||prior.userId!==session.client_reference_id)
    throw Error('V2_TEST_CHECKOUT_BINDING_CONFLICT');
   const subscriptionId=kind==='subscription'
     ?typeof session.subscription==='string'?session.subscription:session.subscription?.id
     :null;
   if(kind==='subscription'&&!stripeId(subscriptionId,'sub_')||
      kind==='single_video'&&session.subscription!=null)
    throw Error('V2_TEST_SUBSCRIPTION_ID_INVALID');
   if(prior.status==='active'){
    if(prior.subscriptionId!==subscriptionId)throw Error('V2_TEST_BINDING_REPLAY_CONFLICT');
    return Object.freeze({...prior,duplicate:true});
   }
   const result=await gateway.activatePendingBinding({
    sessionId,userId:prior.userId,kind,priceId:contract.priceId,
    customerId:session.customer,subscriptionId
   });
   if(result?.status!=='active'||result.subscriptionId!==subscriptionId||
      result.userId!==prior.userId)throw Error('V2_TEST_ACTIVATION_FAILED');
   return Object.freeze({...result,duplicate:false});
  }
 });
}
