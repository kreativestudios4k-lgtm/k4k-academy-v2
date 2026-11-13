// Isolated test-only replay of genuine Stripe events and exact paid QA session.
// Never create a new payment, print a secret, or affect another customer.
import {createHmac} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createMembershipStore} from '../lib/server/stripe-membership-store.mjs';
import {reconcileCheckout} from '../lib/server/checkout-reconcile.mjs';
import {handleStripeEvent} from '../lib/server/stripe-webhook-handler.mjs';
const env=process.env;
if(env.VERCEL_ENV!=='preview'||env.K4K_BILLING_QA_ONLY!=='true'||env.K4K_QA_PAID_REPLAY!=='true')process.exit(0);
const user='a1e90744-a600-4823-88ae-e81c25609fd3',sessionId='cs_test_a09TIXr2Sfr4FeUoAg96eISfUpatI98Mpx7hrIaPdiLfnHGxfmYaBSc2D5',customer='cus_Vcgu3seGLf1Erd',subscription='sub_1UbRWoL7fmdMaK0krKs5VPei',invoice='in_1UbRWmL7fmdMaK0kBRqKOClV';
if(!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||env.K4K_QA_USER_ID!==user||env.K4K_LIVE_PAYMENTS_ENABLED==='true')throw Error('QA_UNSAFE');
const get=async path=>{const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('QA_STRIPE_READ_'+r.status);return r.json()};
const session=await get('checkout/sessions/'+sessionId);
if(session.livemode!==false||session.status!=='complete'||session.payment_status!=='paid'||session.client_reference_id!==user||session.customer!==customer||session.subscription!==subscription||session.metadata?.k4k_billing_qa!=='20261113')throw Error('QA_SESSION_MISMATCH');
const ep=await get('webhook_endpoints/we_1UZJX3L7fmdMaK0kpnrZzeGo');const url=new URL(ep.url);
if(ep.livemode!==false||url.origin!=='https://kreativestudios4k-site-hpyws0noc-kreative-studios4k.vercel.app'||url.pathname!=='/api/billing/webhook')throw Error('QA_ENDPOINT_MISMATCH');
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const u=await db.auth.admin.getUserById(user);if(u.error||u.data.user?.email!=='k4k-launch-qa-20261113@example.com'||u.data.user?.app_metadata?.k4k_billing_qa!==true)throw Error('QA_USER_MISMATCH');
const events=[];for(const [id,type,objectId] of [['evt_1UbRWqL7fmdMaK0k1NVNNJMK','checkout.session.completed',sessionId],['evt_1UbRWqL7fmdMaK0kAR2oxzJd','customer.subscription.created',subscription],['evt_1UbRWqL7fmdMaK0k7nRfcxPw','invoice.paid',invoice]]){const e=await get('events/'+id);if(e.livemode!==false||e.type!==type||e.data?.object?.id!==objectId)throw Error('QA_EVENT_MISMATCH');events.push(e)}
// Probe actual endpoint with the real test event, signing with its configured test secret.
// This is a controlled replay, not evidence of automatic delivery.
const payload=JSON.stringify(events[0]),ts=Math.floor(Date.now()/1000);
const sig=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(ts+'.'+payload).digest('hex');
const response=await fetch(url.href,{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':'t='+ts+',v1='+sig},body:payload,redirect:'manual',signal:AbortSignal.timeout(15000)});
let result=null;try{result=await response.json()}catch{}
console.log('QA_WEBHOOK_PROBE '+JSON.stringify({status:response.status,body:result?{error:result.error,reason:result.reason,handled:result.handled,received:result.received}:null,redirected:response.status>=300&&response.status<400}));
const store=createMembershipStore({url:env.NEXT_PUBLIC_SUPABASE_URL,serviceKey:env.SUPABASE_SERVICE_ROLE_KEY});
// Recover via the same server reconciliation service used by the authenticated return route.
const outcome=await reconcileCheckout({userId:user,sessionId,secret:env.STRIPE_SECRET_KEY,store,liveMode:false});
console.log('QA_RECONCILE '+JSON.stringify(outcome));
for(const event of events){const result=await handleStripeEvent(event,store);console.log('QA_EVENT_REPLAY '+JSON.stringify({id:event.id,type:event.type,result}));}
const m=await db.from('memberships').select('status,plan,stripe_customer_id,stripe_subscription_id').eq('user_id',user).single();
const c=await db.from('studio_credit_accounts').select('balance').eq('user_id',user).single();
const g=await db.from('k4k_credit_grants').select('invoice_id,credits').eq('user_id',user);
if(m.error||c.error||g.error||m.data.status!=='active'||m.data.plan!=='starter'||m.data.stripe_subscription_id!==subscription||c.data.balance!==80||g.data.length!==1||g.data[0].invoice_id!==invoice||g.data[0].credits!==80)throw Error('QA_FINAL_STATE_MISMATCH');
console.log('QA_VERIFIED active Starter; 80 credits; exactly one invoice grant; no duplicate credits.');
