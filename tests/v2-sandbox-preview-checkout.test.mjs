import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {V2_SANDBOX_PRICE_CONTRACTS} from '../lib/server/v2-sandbox-catalog.mjs';
import {
 V2_SANDBOX_CHECKOUT_READY,validateV2SandboxCheckoutInput,
 createV2SandboxStripeCheckoutClient,initiateV2SandboxCheckout
} from '../lib/server/v2-sandbox-checkout-create.mjs';
import {createV2SandboxWebhookDispatcher} from '../lib/server/v2-sandbox-webhook-dispatch.mjs';
const user='11111111-1111-4111-8111-111111111111';
const testEnv=Object.freeze({
 VERCEL_ENV:'preview',K4K_V2_SANDBOX_ADAPTER_ENABLED:'true',
 K4K_V2_SANDBOX_PROJECT_ISOLATED:'true',
 K4K_V2_SANDBOX_PROJECT_REF:'yhbhrkyihiyyfzqogyri',
 NEXT_PUBLIC_SUPABASE_URL:'https://yhbhrkyihiyyfzqogyri.supabase.co',
 STRIPE_V2_TEST_SECRET_KEY:'sk_test_mock1234567890',
 K4K_V2_SANDBOX_ALLOWED_TEST_USERS:user,
 VERCEL_URL:'k4k-nextjs-isolated-preview-abc123-kreative-studios4k.vercel.app'
});
test('all three exact TEST price contracts resolve by trusted offer name, not client-provided Stripe Price ID',()=>{
 for(const offer of Object.keys(V2_SANDBOX_PRICE_CONTRACTS)){
  const x=validateV2SandboxCheckoutInput({verifiedUserId:user,offer,env:testEnv});
  assert.equal(x.price.priceId,V2_SANDBOX_PRICE_CONTRACTS[offer].priceId);
  assert.equal(x.verifiedUserId,user);
 }
 assert.throws(()=>validateV2SandboxCheckoutInput({verifiedUserId:user,offer:'price_live_123',env:testEnv}),/V2_TEST_OFFER_NOT_ALLOWED/);
});
test('unapproved user, LIVE secret, production environment and wrong deployment all fail before side effects',()=>{
 const args={verifiedUserId:user,offer:'starterGBP',env:testEnv};
 assert.throws(()=>validateV2SandboxCheckoutInput({...args,verifiedUserId:'22222222-2222-4222-8222-222222222222'}),/V2_TEST_NOT_APPROVED_USER/);
 assert.throws(()=>validateV2SandboxCheckoutInput({...args,env:{...testEnv,STRIPE_V2_TEST_SECRET_KEY:'sk_live_notallowed'}}),/V2_TEST_SECRET_REQUIRED/);
 assert.throws(()=>validateV2SandboxCheckoutInput({...args,env:{...testEnv,VERCEL_ENV:'production'}}),/V2_SANDBOX_ONLY/);
 assert.throws(()=>validateV2SandboxCheckoutInput({...args,env:{...testEnv,VERCEL_URL:'kreativestudios4k.com'}}),/V2_TEST_DEPLOYMENT_ORIGIN_INVALID/);
 assert.throws(()=>validateV2SandboxCheckoutInput({...args,env:{...testEnv,K4K_V2_SANDBOX_PROJECT_REF:'tqlvfqjvfqfigsauqjtl'}}),/V2_TEST_DB_NOT_ISOLATED/);
});
test('hard off switch prevents even a synthetic writer from creating a chargeable session',async()=>{
 let called=0;
 assert.equal(V2_SANDBOX_CHECKOUT_READY,false);
 await assert.rejects(initiateV2SandboxCheckout({
  verifiedUserId:user,offer:'starterGBP',env:testEnv,
  stripeReader:{getSession:async()=>{called++;}},
  stripeWriter:{createCustomer:async()=>{called++;}},
  gateway:{findSessionBinding:async()=>{called++;}}
 }),/V2_TEST_CHECKOUT_NOT_READY/);
 assert.equal(called,0);
});
test('TEST-only writer builds single-item checkout with no coupons or LIVE keys and explicit one-time mode',async()=>{
 const calls=[];
 const fetchImpl=async(url,args)=>{
  const fields=new URLSearchParams(args.body);
  calls.push({url,method:args.method,auth:args.headers.Authorization,fields});
  if(url.endsWith('/v1/customers'))
   return {ok:true,json:async()=>({id:'cus_test_1234567890',livemode:false})};
  if(url.endsWith('/v1/checkout/sessions'))
   return {ok:true,json:async()=>({
    id:'cs_test_1234567890',livemode:false,mode:fields.get('mode'),customer:fields.get('customer'),
    status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/cs_test_1234567890'
   })};
  return {ok:false,json:async()=>({})};
 };
 const stripe=createV2SandboxStripeCheckoutClient({secret:testEnv.STRIPE_V2_TEST_SECRET_KEY,fetchImpl});
 const customer=await stripe.createCustomer({userId:user});
 const data=validateV2SandboxCheckoutInput({verifiedUserId:user,offer:'singleGBP',env:testEnv});
 const session=await stripe.createSession({userId:user,customerId:customer.id,price:data.price,origin:data.origin});
 assert.equal(session.livemode,false);
 assert.equal(calls.length,2);
 const f=calls[1].fields;
 assert.equal(f.get('mode'),'payment');
 assert.equal(f.get('line_items[0][price]'),V2_SANDBOX_PRICE_CONTRACTS.singleGBP.priceId);
 assert.equal(f.get('line_items[0][quantity]'),'1');
 assert.equal(f.get('allow_promotion_codes'),'false');
 assert.equal(f.get('metadata[credit_version]'),'v2');
 assert.equal(f.get('metadata[kind]'),'k4k_v2_single_video');
 assert.equal(f.get('automatic_tax[enabled]'),'true');
 assert.equal(f.get('customer'),customer.id);
 assert.ok(f.get('success_url').startsWith('https://k4k-nextjs-isolated-preview-'));
 assert.equal(calls[1].auth,'Bearer sk_test_mock1234567890');
});
test('TEST-only subscription writer has correct product metadata and subscription mode',async()=>{
 let last;
 const fetchImpl=async(url,args)=>{last=new URLSearchParams(args.body);
  return {ok:true,json:async()=>({id:'cs_test_sub12345678',livemode:false,
   mode:last.get('mode'),customer:last.get('customer'),status:'open',payment_status:'unpaid',
   url:'https://checkout.stripe.com/c/pay/cs_test_sub12345678'})};};
 const stripe=createV2SandboxStripeCheckoutClient({secret:testEnv.STRIPE_V2_TEST_SECRET_KEY,fetchImpl});
 const data=validateV2SandboxCheckoutInput({verifiedUserId:user,offer:'creatorBRL',env:testEnv});
 await stripe.createSession({userId:user,customerId:'cus_test_1234567890',price:data.price,origin:data.origin});
 assert.equal(last.get('mode'),'subscription');
 assert.equal(last.get('line_items[0][price]'),V2_SANDBOX_PRICE_CONTRACTS.creatorBRL.priceId);
 assert.equal(last.get('subscription_data[metadata][credit_version]'),'v2');
 assert.equal(last.get('metadata[kind]'),'k4k_v2_subscription');
});
test('sandbox dispatcher rejects LIVE events and dispute automation while ignoring out-of-scope types',async()=>{
 let queries=0;
 const stripe={getInvoice:async()=>{queries++;},getSession:async()=>{queries++;}};
 const gateway={
  findBinding:async()=>{queries++;},rpc:async()=>{queries++;},
  insertPendingBinding:async()=>{queries++;},findSessionBinding:async()=>{queries++;},
  activatePendingBinding:async()=>{queries++;}
 };
 const handler=createV2SandboxWebhookDispatcher({stripe,gateway,env:testEnv});
 const event={id:'evt_test_1234567890',livemode:false,type:'customer.subscription.deleted',data:{object:{id:'sub_test_1234567890'}}};
 const x=await handler.handleVerifiedEvent(event);
 assert.equal(x.handled,false);assert.equal(queries,0);
 await assert.rejects(handler.handleVerifiedEvent({...event,livemode:true}),/V2_TEST_WEBHOOK_EVENT_INVALID/);
 await assert.rejects(handler.handleVerifiedEvent({...event,type:'charge.dispute.created'}),/V2_TEST_DISPUTE_REVIEW_REQUIRED/);
 assert.equal(queries,0);
});
test('new HTTP routes preserve compile-time shutdown and dedicated Stripe TEST-only credentials',()=>{
 const checkout=readFileSync(new URL('../app/api/v2/sandbox/checkout/route.js',import.meta.url),'utf8');
 const webhook=readFileSync(new URL('../app/api/v2/sandbox/webhook/route.js',import.meta.url),'utf8');
 assert.match(checkout,/V2_SANDBOX_CHECKOUT_READY/);
 assert.match(checkout,/STRIPE_V2_TEST_SECRET_KEY/);
 assert.match(webhook,/STRIPE_V2_TEST_WEBHOOK_SECRET/);
 assert.match(webhook,/verifyStripeSignature/);
 assert.match(webhook,/K4K_V2_SANDBOX_WEBHOOK_ENABLED/);
 assert.doesNotMatch(checkout,/createMembershipStore/);
 assert.doesNotMatch(webhook,/createMembershipStore/);
});
