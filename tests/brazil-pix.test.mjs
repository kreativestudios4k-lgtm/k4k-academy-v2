import test from 'node:test';
import assert from 'node:assert/strict';
import {configureBrazilPixCheckout,brazilPixHeaders,checkoutSupportsPix,replaceableCardOnlyCheckout,BRAZIL_PIX_STRIPE_VERSION} from '../lib/server/brazil-pix.mjs';
import {openLaunchCheckout} from '../lib/server/soft-launch.mjs';
const env={VERCEL_ENV:'production',K4K_BRAZIL_PIX_ENABLED:'true'};
test('PIX uses new explicit compatible methods only for production BRL subscriptions',()=>{
 const form=new URLSearchParams({mode:'subscription'});
 assert.equal(configureBrazilPixCheckout(form,'BRL',env),true);
 assert.equal(form.get('allowed_payment_method_types[0]'),'pix');
 assert.equal(form.get('allowed_payment_method_types[1]'),'card');
 assert.equal(form.get('allowed_payment_method_types[2]'),'link');
 assert.equal(form.get('locale'),'pt-BR');
 assert.equal(form.has('payment_method_types[0]'),false);
 assert.equal(form.has('payment_method_configuration'),false);
 assert.equal(brazilPixHeaders(form)['Stripe-Version'],BRAZIL_PIX_STRIPE_VERSION);
 for(const currency of ['GBP','USD','EUR']){
  const other=new URLSearchParams();assert.equal(configureBrazilPixCheckout(other,currency,env),false);assert.deepEqual(brazilPixHeaders(other),{});
 }
 assert.equal(configureBrazilPixCheckout(new URLSearchParams(),'BRL',{...env,VERCEL_ENV:'preview'}),false);
 assert.equal(configureBrazilPixCheckout(new URLSearchParams(),'BRL',{...env,K4K_BRAZIL_PIX_ENABLED:'false'}),false);
});
const claim={id:'11111111-1111-4111-8111-111111111111',user_id:'22222222-2222-4222-8222-222222222222',state:'reserved',currency:'BRL',expires_epoch:10000,stripe_session_id:'cs_live_abc123456789'};
const session={id:claim.stripe_session_id,mode:'subscription',livemode:true,currency:'brl',status:'open',payment_status:'unpaid',client_reference_id:claim.user_id,metadata:{k4k_launch_claim:claim.id},payment_method_types:['card','link'],url:'https://checkout.stripe.com/c/pay/cs_live_abc123456789'};
test('old unpaid card checkout is refreshed only before any customer/payment/subscription exists',()=>{
 assert.equal(replaceableCardOnlyCheckout(session),true);
 for(const s of [{...session,customer:'cus_abc'},{...session,subscription:'sub_abc'},{...session,payment_intent:'pi_abc'},{...session,status:'complete'},{...session,payment_status:'paid'},{...session,currency:'gbp'},{...session,payment_method_types:['pix','card']}]){
  assert.equal(replaceableCardOnlyCheckout(s),false);
 }
 assert.equal(checkoutSupportsPix({...session,payment_method_types:['pix','card']}),true);
});
test('returning BRL customer gets a safe expired checkout refresh rather than obsolete card-only session',async()=>{
 const form=new URLSearchParams();configureBrazilPixCheckout(form,'BRL',env);
 const calls=[];const database={rpc:async(name,args)=>{calls.push({name,args});return {data:{id:claim.id}}}};
 const fetchImpl=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.endsWith('/expire')?{...session,status:'expired'}:session}};
 await assert.rejects(openLaunchCheckout({database,claim,secret:'rk_live_fixture',form,fetchImpl,now:6500}),/CHECKOUT_EXPIRED_RETRY/);
 assert.equal(calls.length,3);assert.equal(calls[1].options.method,'POST');assert.match(calls[1].url,/\/expire$/);assert.equal(calls[2].args.p_outcome,'expired');
 assert.equal(calls[0].options.headers['Stripe-Version'],BRAZIL_PIX_STRIPE_VERSION);
});
test('new Brazilian checkout sends PIX filter and pinned API version with existing claim binding',async()=>{
 const form=new URLSearchParams();configureBrazilPixCheckout(form,'BRL',env);
 const calls=[];const database={rpc:async(name,args)=>{calls.push({name,args});return {data:{id:claim.id}}}};
 const fetchImpl=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({...session,payment_method_types:['pix','card']})}};
 assert.equal(await openLaunchCheckout({database,claim:{...claim,stripe_session_id:null},secret:'rk_live_fixture',form,fetchImpl,now:6500}),session.url);
 assert.equal(calls[0].options.headers['Stripe-Version'],BRAZIL_PIX_STRIPE_VERSION);
 assert.equal(new URLSearchParams(calls[0].options.body).get('allowed_payment_method_types[0]'),'pix');
 assert.equal(calls[1].args.p_outcome,'bind');
});
test('an existing payment in progress is never expired by PIX rollout',async()=>{
 const form=new URLSearchParams();configureBrazilPixCheckout(form,'BRL',env);
 let calls=0;const database={rpc:async()=>{throw Error('must not mutate')}};
 const fetchImpl=async()=>{calls++;return {ok:true,json:async()=>({...session,customer:'cus_abc'})}};
 assert.equal(await openLaunchCheckout({database,claim,secret:'rk_live_fixture',form,fetchImpl,now:6500}),session.url);assert.equal(calls,1);
});
