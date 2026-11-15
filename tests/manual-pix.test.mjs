import test from 'node:test';
import assert from 'node:assert/strict';
import {manualPixEnabled,manualPixPlan,buildManualPixCheckout,assertManualPixSource,verifiedManualPix,fulfillManualPix,MANUAL_PIX_KIND} from '../lib/server/manual-pix.mjs';
import {handleStripeEvent} from '../lib/server/stripe-webhook-handler.mjs';
import {reconcileCheckout} from '../lib/server/checkout-reconcile.mjs';
import {isK4KLiveEvent} from '../lib/server/live-webhook-scope.mjs';
const user='11111111-1111-4111-8111-111111111111',orderId='22222222-2222-4222-8222-222222222222';
const env={K4K_LIVE_PLAN_PRICES_JSON:JSON.stringify(Object.fromEntries(['starter','creator','pro','studio'].map(p=>[p,Object.fromEntries(['GBP','EUR','USD','BRL'].map(c=>[c,'price_'+p+c]))])))};
function fixture(liveMode=false){
 const now=Math.floor(Date.now()/1000),plan=manualPixPlan('starter',{liveMode,env});
 const order={id:orderId,user_id:user,plan_key:'starter',credit_mode:liveMode?'live':'test',state:'reserved',amount:10999,credits:80,source_price_id:plan.sourcePrice,product_id:'prod_manual',stripe_session_id:'cs_'+(liveMode?'live':'test')+'_manual123456',expires_at:new Date((now+3600)*1000).toISOString()};
 const intent={id:'pi_manual',status:'succeeded',livemode:liveMode,currency:'brl',amount:10999,amount_received:10999,setup_future_usage:null,latest_charge:{id:'py_manual',created:now-2,paid:true,livemode:liveMode,payment_intent:'pi_manual',payment_method_details:{type:'pix'}}};
 const session={id:order.stripe_session_id,created:now-3,mode:'payment',livemode:liveMode,status:'complete',payment_status:'paid',client_reference_id:user,currency:'brl',amount_subtotal:10999,amount_total:10999,total_details:{amount_discount:0},metadata:{kind:MANUAL_PIX_KIND,order_id:orderId,user_id:user,plan_key:'starter'},automatic_tax:{enabled:true,status:'complete'},payment_intent:intent,line_items:{has_more:false,data:[{quantity:1,price:{product:'prod_manual',type:'one_time',currency:'brl',unit_amount:10999,tax_behavior:'inclusive',recurring:null}}]}};
 return {order,session,plan};
}
test('manual Pix is opt-in and builds a single BRL payment without a mandate or subscription',()=>{
 assert.equal(manualPixEnabled({}),false);assert.equal(manualPixEnabled({K4K_MANUAL_PIX_ENABLED:'true'}),false);
 assert.equal(manualPixEnabled({K4K_MANUAL_PIX_ENABLED:'true',K4K_MANUAL_PIX_SCHEMA_READY:'true'}),true);
 const {order,plan}=fixture();const form=buildManualPixCheckout({order,plan,userId:user,origin:'https://preview.test'});
 assert.equal(form.get('mode'),'payment');assert.equal(form.get('allowed_payment_method_types[0]'),'pix');
 assert.equal(form.get('line_items[0][price_data][unit_amount]'),'10999');assert.equal(form.get('payment_intent_data[metadata][order_id]'),orderId);
 assert.doesNotMatch(form.toString(),/setup_future_usage|mandate_options|subscription_data|recurring|customer_creation/);
 assert.throws(()=>buildManualPixCheckout({order,plan,userId:'other',origin:'https://preview.test'}),/ORDER_INVALID/);
});
test('all plan values derive from the catalogue and source prices must match',()=>{
 for(const [key,amount,credits] of [['starter',10999,80],['creator',20999,160],['pro',44999,340],['studio',89999,700]]){
  const p=manualPixPlan(key);assert.equal(p.amount,amount);assert.equal(p.credits,credits);
  const price={id:p.sourcePrice,livemode:false,active:true,currency:'brl',unit_amount:amount,tax_behavior:'inclusive',recurring:{interval:'month',interval_count:1},product:'prod_manual'};
  assert.equal(assertManualPixSource(price,p,false),'prod_manual');
  assert.throws(()=>assertManualPixSource({...price,unit_amount:1},p,false),/PRICE_INVALID/);
 }
 assert.throws(()=>manualPixPlan('__proto__'),/INVALID_PLAN/);
});
test('verified Pix requires actual succeeded funds and rejects cross-user, price, mode and saved mandate changes',()=>{
 const {order,session}=fixture();assert.equal(verifiedManualPix(session,order).credits,80);
 const bad=[s=>s.client_reference_id='other',s=>s.livemode=true,s=>s.metadata.order_id='other',s=>s.amount_total=1,s=>s.payment_intent.status='processing',s=>s.payment_intent.amount_received=0,s=>s.payment_intent.setup_future_usage='off_session',s=>s.payment_intent.latest_charge.payment_method_details.type='card',s=>s.line_items.data[0].price.recurring={interval:'month'},s=>s.subscription='sub_unwanted'];
 for(const mutate of bad){const s=structuredClone(session);mutate(s);assert.throws(()=>verifiedManualPix(s,order));}
 assert.equal(verifiedManualPix({...session,payment_status:'unpaid'},order).pending,true);
 session.payment_intent.latest_charge.amount_refunded=1;assert.equal(verifiedManualPix(session,order).reversed,true);
});
test('webhook re-reads payment and reconciliation uses the same order transaction without touching subscriptions',async()=>{
 for(const liveMode of [false,true]){
  const {order,session}=fixture(liveMode);let grants=0,seen=false;
  const store={hasProcessedEvent:async()=>false,checkoutSession:async()=>session,manualPixOrder:async()=>order,applyManualPix:async()=>{if(!seen){seen=true;grants++}return {handled:grants===1,balance:80}}};
  const event={id:'evt_manual',type:'checkout.session.completed',livemode:liveMode,data:{object:session}};
  await handleStripeEvent(event,store,{liveMode,env});
  await fulfillManualPix({sessionId:session.id,eventId:'reconcile_manual',eventType:'manual_pix.reconcile',store,liveMode,env,userId:user});
  assert.equal(grants,1);
  await assert.rejects(fulfillManualPix({sessionId:session.id,eventId:'wrong',eventType:'manual_pix.reconcile',store,liveMode,env,userId:'other'}),/OWNER_INVALID/);
  assert.equal(isK4KLiveEvent(event,env),true);
 }
 const {order,session}=fixture();let calls=0;
 const store={checkoutSession:async()=>session,manualPixOrder:async()=>order,applyManualPix:async()=>{calls++;return {handled:true,balance:80}}};
 const result=await reconcileCheckout({userId:user,sessionId:session.id,secret:'sk_test_fixture',store,fetchImpl:async()=>({ok:true,json:async()=>session})});
 assert.equal(result.renewalMode,'manual');assert.equal(calls,1);
 session.payment_status='unpaid';await fulfillManualPix({sessionId:session.id,eventId:'unpaid',eventType:'manual_pix.reconcile',store,userId:user});assert.equal(calls,1);
});

test('manual Pix disputes resolve the actual charge and reject cross-mode reviews',async()=>{
 const {order}=fixture();let reviews=0;
 const charge={id:'py_manual',livemode:false,payment_intent:'pi_manual',metadata:{kind:MANUAL_PIX_KIND,order_id:orderId}};
 const event={id:'evt_dispute',livemode:false,type:'charge.dispute.created',data:{object:{object:'dispute',charge:'py_manual',payment_intent:'pi_manual'}}};
 const store={hasProcessedEvent:async()=>false,stripeCharge:async()=>charge,manualPixOrder:async()=>order,reviewManualPix:async()=>{reviews++;return {handled:true}}};
 await handleStripeEvent(event,store,{liveMode:false});assert.equal(reviews,1);
 order.credit_mode='live';await assert.rejects(handleStripeEvent(event,store,{liveMode:false}),/BILLING_MODE_MISMATCH/);assert.equal(reviews,1);
});
test('confirmed Pix failure releases the pending checkout; a late failure never undoes a paid session',async()=>{
 const {session}=fixture();let expired=0;
 const event={id:'evt_failed',livemode:false,type:'checkout.session.async_payment_failed',data:{object:session}};
 const store={hasProcessedEvent:async()=>false,checkoutSession:async()=>session,expireManualPix:async()=>{expired++},markProcessed:async()=>{}};
 await handleStripeEvent(event,store,{liveMode:false});assert.equal(expired,0);
 session.payment_status='unpaid';session.payment_intent.status='processing';
 await assert.rejects(handleStripeEvent(event,store,{liveMode:false}),/FAILURE_NOT_FINAL/);assert.equal(expired,0);
 session.payment_intent.status='canceled';await handleStripeEvent(event,store,{liveMode:false});assert.equal(expired,1);
});

test('Live owner-only activation fails closed without an approved user and leaves other customers on the existing Pix/card flow',async()=>{
 const {manualPixUserAllowed}=await import('../lib/server/manual-pix-policy.mjs');
 const {configureBrazilPixCheckout}=await import('../lib/server/brazil-pix.mjs');
 const flags={VERCEL_ENV:'production',K4K_MANUAL_PIX_ENABLED:'true',K4K_MANUAL_PIX_SCHEMA_READY:'true',K4K_MANUAL_PIX_LIVE_TEST_ONLY:'true',K4K_BRAZIL_PIX_ENABLED:'true'};
 assert.equal(manualPixUserAllowed(user,flags),false);
 const approved={...flags,K4K_MANUAL_PIX_LIVE_TEST_USER_ID:user};
 assert.equal(manualPixUserAllowed(user,approved),true);
 assert.equal(manualPixUserAllowed('33333333-3333-4333-8333-333333333333',approved),false);
 assert.equal(manualPixUserAllowed(undefined,approved),false);
 const form=who=>new URLSearchParams({mode:'subscription',client_reference_id:who,'metadata[plan_key]':'starter'});
 const owner=form(user),other=form('33333333-3333-4333-8333-333333333333');
 configureBrazilPixCheckout(owner,'BRL',approved);configureBrazilPixCheckout(other,'BRL',approved);
 assert.equal(owner.get('allowed_payment_method_types[0]'),'card');
 assert.equal(other.get('allowed_payment_method_types[0]'),'pix');
});

test('approved Live custom Stripe product IDs pass source and checkout validation per plan',()=>{
 for(const key of ['starter','creator','pro','studio']){
  const p=manualPixPlan(key,{liveMode:true,env});
  const price={id:p.sourcePrice,livemode:true,active:true,currency:'brl',unit_amount:p.amount,tax_behavior:'inclusive',recurring:{interval:'month',interval_count:1},product:`k4k_app_${key}_2026`};
  assert.equal(assertManualPixSource(price,p,true),price.product);
  assert.throws(()=>assertManualPixSource({...price,product:'k4k_app_unapproved_2026'},p,true),/PRICE_INVALID/);
  const {order}=fixture(true);
  Object.assign(order,{plan_key:key,amount:p.amount,source_price_id:p.sourcePrice,product_id:price.product});
  assert.equal(buildManualPixCheckout({order,plan:p,userId:user,origin:'https://preview.test'}).get('line_items[0][price_data][product]'),price.product);
 }
});
