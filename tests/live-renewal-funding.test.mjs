import test from 'node:test';
import assert from 'node:assert/strict';
import {firstPaidAppSubscription,ensureAppRenewalHold} from '../lib/server/live-renewal-funding.mjs';
const claim='11111111-1111-4111-8111-111111111111',subscriptionId='sub_app',customerId='cus_app';
const env={VERCEL_ENV:'production',K4K_RENEWAL_FUNDING_GUARD_ENABLED:'true',STRIPE_SECRET_KEY:'rk_live_fixture',K4K_LIVE_PLAN_PRICES_JSON:JSON.stringify(Object.fromEntries(['starter','creator','pro','studio'].map(p=>[p,Object.fromEntries(['GBP','EUR','USD','BRL'].map(c=>[c,'price_'+p+c]))])))};
const sub={id:subscriptionId,customer:customerId,livemode:true,status:'active',metadata:{k4k_launch_claim:claim,plan_key:'starter'},items:{data:[{quantity:1,price:{id:'price_starterGBP'}}]},pause_collection:null};
const ok=x=>({ok:true,json:async()=>x});
test('only first paid live APP checkout or initial invoice invokes renewal protection',()=>{
 const checkout={livemode:true,type:'checkout.session.completed',data:{object:{mode:'subscription',status:'complete',payment_status:'paid',subscription:subscriptionId,customer:customerId,metadata:{k4k_launch_claim:claim}}}};
 assert.deepEqual(firstPaidAppSubscription(checkout),{subscriptionId,customerId,claimId:claim});
 assert.equal(firstPaidAppSubscription({...checkout,livemode:false}),null);
 assert.equal(firstPaidAppSubscription({...checkout,data:{object:{...checkout.data.object,payment_status:'unpaid'}}}),null);
 assert.equal(firstPaidAppSubscription({...checkout,data:{object:{...checkout.data.object,metadata:{}}}}),null);
 const invoice={livemode:true,type:'invoice.paid',data:{object:{status:'paid',billing_reason:'subscription_create',customer:customerId,parent:{subscription_details:{subscription:subscriptionId,metadata:{k4k_launch_claim:claim}}}}}};
 assert.deepEqual(firstPaidAppSubscription(invoice),{subscriptionId,customerId,claimId:claim});
 assert.equal(firstPaidAppSubscription({...invoice,data:{object:{...invoice.data.object,billing_reason:'subscription_cycle'}}}),null);
});
test('only verified APP subscription is held as draft; no charge, cancellation or price change',async()=>{
 const calls=[];const result=await ensureAppRenewalHold({subscriptionId,customerId,claimId:claim,env,fetchImpl:async(url,o)=>{calls.push({url,o});return ok(calls.length===1?sub:{...sub,pause_collection:{behavior:'keep_as_draft',resumes_at:null}})}});
 assert.equal(result.guarded,true);assert.equal(calls.length,2);assert.equal(calls[1].o.method,'POST');
 const form=new URLSearchParams(calls[1].o.body);assert.equal(form.get('pause_collection[behavior]'),'keep_as_draft');assert.equal(form.get('proration_behavior'),'none');assert.equal([...form.keys()].length,2);
 assert.equal(calls[1].url,'https://api.stripe.com/v1/subscriptions/'+subscriptionId);
});
test('already held is idempotent, and an audit can verify identical write permission',async()=>{
 const held={...sub,pause_collection:{behavior:'keep_as_draft',resumes_at:null}};let calls=0;
 const args={subscriptionId,customerId,env,fetchImpl:async()=>{calls++;return ok(held)}};
 assert.equal((await ensureAppRenewalHold(args)).reason,'ALREADY_HELD');assert.equal(calls,1);
 assert.equal((await ensureAppRenewalHold({...args,verifyWrite:true})).reason,'HELD');assert.equal(calls,3);
});
test('wrong customer, test object, Academy, unknown price and an unrelated existing pause never mutate',async()=>{
 for(const x of [{...sub,customer:'cus_other'},{...sub,livemode:false},{...sub,metadata:{academy:'k4k',plan_key:'starter'}},{...sub,items:{data:[{quantity:1,price:{id:'price_unknown'}}]}},{...sub,pause_collection:{behavior:'void'}}]){
  let calls=0;await assert.rejects(ensureAppRenewalHold({subscriptionId,customerId,env,fetchImpl:async()=>{calls++;return ok(x)}}));assert.equal(calls,1);
 }
});
test('disabled guard never contacts Stripe; Stripe permission errors fail closed',async()=>{
 let calls=0;
 const result=await ensureAppRenewalHold({subscriptionId,customerId,env:{...env,K4K_RENEWAL_FUNDING_GUARD_ENABLED:'false'},fetchImpl:async()=>{calls++}});assert.equal(result.guarded,false);assert.equal(calls,0);
 await assert.rejects(ensureAppRenewalHold({subscriptionId,customerId,env,fetchImpl:async()=>{calls++;return calls===1?ok(sub):{ok:false,status:403,json:async()=>({error:{code:'permission_denied'}})}}}),/RENEWAL_STRIPE_HTTP_403/);
});
