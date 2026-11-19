// REVIEW ONLY: protected Vercel Preview + Stripe TEST + isolated TEST Supabase.
// No public checkout is allowed until the real TEST webhook and signed payment
// grants are installed and independently verified.
import {assertV2SandboxRuntime,V2_SANDBOX_PRICE_CONTRACTS} from './v2-sandbox-catalog.mjs';
import {createV2SandboxCheckoutBindingFlow} from './v2-sandbox-checkout-binding-flow.mjs';

const userUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isStripeTestKey=s=>typeof s==='string'&&/^sk_test_[A-Za-z0-9]+$/.test(s);
const id=(s,prefix)=>typeof s==='string'&&s.startsWith(prefix)&&s.length>=prefix.length+7;
export const V2_SANDBOX_CHECKOUT_READY=false; // hard launch gate, requires separate review

export function validateV2SandboxCheckoutInput({verifiedUserId,offer,env=process.env}={}){
 assertV2SandboxRuntime(env);
 if(!userUUID.test(verifiedUserId||''))throw Error('V2_TEST_LOGIN_REQUIRED');
 const allowlist=String(env.K4K_V2_SANDBOX_ALLOWED_TEST_USERS||'')
  .split(',').map(x=>x.trim()).filter(Boolean);
 if(allowlist.length===0||!allowlist.includes(verifiedUserId))
  throw Error('V2_TEST_NOT_APPROVED_USER');
 if(!Object.hasOwn(V2_SANDBOX_PRICE_CONTRACTS,offer))
  throw Error('V2_TEST_OFFER_NOT_ALLOWED');
 if(!isStripeTestKey(env.STRIPE_V2_TEST_SECRET_KEY))
  throw Error('V2_TEST_SECRET_REQUIRED');
 const safeOrigin='https://'+String(env.VERCEL_URL||'');
 if(!/^https:\/\/k4k-nextjs-isolated-preview-[a-z0-9-]+\.vercel\.app$/.test(safeOrigin))
  throw Error('V2_TEST_DEPLOYMENT_ORIGIN_INVALID');
 if(env.K4K_V2_SANDBOX_PROJECT_REF!=='yhbhrkyihiyyfzqogyri'||
  env.NEXT_PUBLIC_SUPABASE_URL!=='https://yhbhrkyihiyyfzqogyri.supabase.co')
  throw Error('V2_TEST_DB_NOT_ISOLATED');
 return Object.freeze({
  offer,verifiedUserId,price:V2_SANDBOX_PRICE_CONTRACTS[offer],
  origin:safeOrigin,secret:env.STRIPE_V2_TEST_SECRET_KEY
 });
}
export function createV2SandboxStripeCheckoutClient({secret,fetchImpl=fetch}={}){
 if(!isStripeTestKey(secret))throw Error('V2_TEST_SECRET_REQUIRED');
 const post=async (path,params)=>{
  const r=await fetchImpl('https://api.stripe.com'+path,{
   method:'POST',
   headers:{Authorization:'Bearer '+secret,'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams(params).toString(),
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)
  });
  if(!r.ok)throw Error('V2_TEST_STRIPE_REQUEST_FAILED');
  const value=await r.json();
  if(value?.livemode!==false)throw Error('V2_TEST_STRIPE_MODE_MISMATCH');
  return value;
 };
 return Object.freeze({
  async createCustomer({userId}){
   if(!userUUID.test(userId||''))throw Error('V2_TEST_LOGIN_REQUIRED');
   const cust=await post('/v1/customers',{
    'metadata[k4k_v2_sandbox]':'true','metadata[user_id]':userId
   });
   if(!id(cust?.id,'cus_'))throw Error('V2_TEST_CUSTOMER_INVALID');
   return cust;
  },
  async createSession({userId,customerId,price,origin}={}){
   if(!userUUID.test(userId||'')||!id(customerId,'cus_')||
      !price?.priceId||!['subscription_invoice','single_video_payment'].includes(price.kind)||
      typeof origin!=='string'||!/^https:\/\/k4k-nextjs-isolated-preview-[a-z0-9-]+\.vercel\.app$/.test(origin))
    throw Error('V2_TEST_CHECKOUT_INPUT_INVALID');
   const isSubscription=price.kind==='subscription_invoice';
   const fields={
    mode:isSubscription?'subscription':'payment',
    customer:customerId,client_reference_id:userId,
    'line_items[0][price]':price.priceId,'line_items[0][quantity]':'1',
    'payment_method_types[0]':'card','automatic_tax[enabled]':'true',
    billing_address_collection:'required',
    allow_promotion_codes:'false',
    success_url:origin+'/billing?test_payment=return&session_id={CHECKOUT_SESSION_ID}',
    cancel_url:origin+'/billing?test_payment=cancelled',
    'metadata[credit_version]':'v2',
    'metadata[kind]':isSubscription?'k4k_v2_subscription':'k4k_v2_single_video',
    'metadata[user_id]':userId
   };
   if(!isSubscription)fields['metadata[product_id]']=price.productId;
   if(isSubscription){
    fields['subscription_data[metadata][credit_version]']='v2';
    fields['subscription_data[metadata][kind]']='k4k_v2_subscription';
    fields['subscription_data[metadata][user_id]']=userId;
   }
   const session=await post('/v1/checkout/sessions',fields);
   if(!id(session?.id,'cs_test_')||session?.mode!==fields.mode||
      session?.customer!==customerId||session?.status!=='open'||session?.payment_status!=='unpaid'||
      typeof session.url!=='string'||!session.url.startsWith('https://checkout.stripe.com/'))
    throw Error('V2_TEST_SESSION_INVALID');
   return session;
  },
  async expireSession(sessionId){
   if(!id(sessionId,'cs_test_'))throw Error('V2_TEST_SESSION_INVALID');
   const session=await post('/v1/checkout/sessions/'+encodeURIComponent(sessionId)+'/expire',{});
   if(session.id!==sessionId||session.status!=='expired')throw Error('V2_TEST_SESSION_EXPIRE_FAILED');
   return session;
  }
 });
}
// This function is intentionally unusable until an explicitly audited,
 // protected webhook, E2E payment test and V2 funding gate are completed.
export async function initiateV2SandboxCheckout({verifiedUserId,offer,env=process.env,stripeReader,stripeWriter,gateway}={}){
 const validated=validateV2SandboxCheckoutInput({verifiedUserId,offer,env});
 if(!V2_SANDBOX_CHECKOUT_READY)throw Error('V2_TEST_CHECKOUT_NOT_READY');
 if(!stripeWriter||!stripeReader||!gateway)throw Error('V2_TEST_DEPENDENCIES_MISSING');
 const binding=createV2SandboxCheckoutBindingFlow({stripe:stripeReader,gateway,env});
 const customer=await stripeWriter.createCustomer({userId:verifiedUserId});
 const session=await stripeWriter.createSession({
  userId:verifiedUserId,customerId:customer.id,
  price:validated.price,origin:validated.origin
 });
 try{
  await binding.recordPendingSession({sessionId:session.id,verifiedUserId});
 }catch(error){
  try{await stripeWriter.expireSession(session.id);}catch{}
  throw Error('V2_TEST_BINDING_CREATE_FAILED');
 }
 return Object.freeze({checkoutUrl:session.url,sessionId:session.id,priceId:validated.price.priceId});
}
