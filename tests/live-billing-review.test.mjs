import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveLiveBillingReview} from '../lib/server/live-billing-review.mjs';
import {handleStripeEvent} from '../lib/server/stripe-webhook-handler.mjs';
const env={VERCEL_ENV:'production',STRIPE_SECRET_KEY:'sk_live_fixture',K4K_LIVE_PAYMENTS_ENABLED:'false',K4K_LIVE_PLAN_PRICES_JSON:JSON.stringify(Object.fromEntries(['starter','creator','pro','studio'].map(p=>[p,Object.fromEntries(['GBP','EUR','USD','BRL'].map(c=>[c,'price_'+p+c]))])))};
const charge={id:'ch_fixture',livemode:true,customer:'cus_fixture',payment_intent:'pi_fixture',amount_refunded:1599,metadata:{}};
const invoice={id:'in_fixture',livemode:true,customer:'cus_fixture',parent:{subscription_details:{subscription:'sub_fixture'}},lines:{data:[{pricing:{price_details:{price:'price_starterGBP'}}}],has_more:false}};
const refund={id:'evt_refund',livemode:true,type:'charge.refunded',data:{object:charge}};
const dispute={id:'evt_dispute',livemode:true,type:'charge.dispute.created',data:{object:{id:'dp_fixture',charge:'ch_fixture',payment_intent:'pi_fixture'}}};
function stripe({bill=invoice,charged=charge,empty=false,fail=false,more=false}={}){
 return async url=>{
  const u=new URL(url);assert.equal(u.origin,'https://api.stripe.com');
  let body;
  if(u.pathname==='/v1/charges/ch_fixture')body=charged;
  else if(u.pathname==='/v1/invoice_payments'){
   assert.equal(u.searchParams.get('payment[type]'),'payment_intent');assert.equal(u.searchParams.get('payment[payment_intent]'),'pi_fixture');
   body={data:empty?[]:[{invoice:'in_fixture',payment:{type:'payment_intent',payment_intent:'pi_fixture'}}],has_more:more};
  }else if(u.pathname==='/v1/invoices/in_fixture')body=bill;
  else assert.fail('Unexpected Stripe path '+u.pathname);
  return new Response(JSON.stringify(body),{status:fail?403:200,headers:{'Content-Type':'application/json'}});
 };
}
test('metadata-free live subscription refund resolves through Invoice Payments even while checkout closed',async()=>{
 const x=await resolveLiveBillingReview(refund,{env,fetchImpl:stripe()});
 assert.equal(x.kind,'subscription');assert.equal(x.event.data.object.customer,'cus_fixture');
});
test('live dispute retrieves charge and only holds the isolated APP account',async()=>{
 const x=await resolveLiveBillingReview(dispute,{env,fetchImpl:stripe()});assert.equal(x.kind,'subscription');
 let holds=0;const store={hasProcessedEvent:async()=>false,holdBilling:async args=>{holds++;assert.deepEqual(args,{p_event:'evt_dispute',p_type:'charge.dispute.created',p_customer:'cus_fixture'});return {handled:true,reviewRequired:true}},reverseTopup:async()=>assert.fail('Legacy topup reversal must not run')};
 assert.equal((await handleStripeEvent(x.event,store,{liveMode:true,env,billingReviewKind:x.kind})).reviewRequired,true);assert.equal(holds,1);
});
test('legacy Academy price or unrelated charge is not attributed to APP',async()=>{
 const legacy={...invoice,lines:{data:[{price:{id:'price_legacy'}}],has_more:false}};
 assert.equal(await resolveLiveBillingReview(refund,{env,fetchImpl:stripe({bill:legacy})}),null);
 assert.equal(await resolveLiveBillingReview(refund,{env,fetchImpl:stripe({empty:true})}),null);
});
test('legacy invoice pointer is supported; mismatched invoice customer and failed lookup retry',async()=>{
 const old={...refund,data:{object:{...charge,invoice:'in_fixture'}}};
 assert.equal((await resolveLiveBillingReview(old,{env,fetchImpl:stripe()})).kind,'subscription');
 await assert.rejects(()=>resolveLiveBillingReview(refund,{env,fetchImpl:stripe({bill:{...invoice,customer:'cus_other'}})}),/LIVE_BILLING_REVIEW_UNAVAILABLE/);
 await assert.rejects(()=>resolveLiveBillingReview(refund,{env,fetchImpl:stripe({fail:true})}),/LIVE_BILLING_REVIEW_UNAVAILABLE/);
 await assert.rejects(()=>resolveLiveBillingReview(refund,{env,fetchImpl:stripe({more:true})}),/LIVE_BILLING_REVIEW_UNAVAILABLE/);
});
test('unlinked APP customer retries rather than acknowledging a lost billing hold',async()=>{
 const x=await resolveLiveBillingReview(refund,{env,fetchImpl:stripe()});
 await assert.rejects(()=>handleStripeEvent(x.event,{hasProcessedEvent:async()=>false,holdBilling:async()=>({handled:false,reason:'UNKNOWN_CUSTOMER'})},{liveMode:true,env,billingReviewKind:x.kind}),/UNKNOWN_CUSTOMER/);
});
test('duplicate review event does not apply hold twice',async()=>{
 const x=await resolveLiveBillingReview(dispute,{env,fetchImpl:stripe()});
 const result=await handleStripeEvent(x.event,{hasProcessedEvent:async()=>true,holdBilling:async()=>assert.fail('duplicate hold')},{liveMode:true,env,billingReviewKind:x.kind});
 assert.equal(result.reason,'DUPLICATE');
});
