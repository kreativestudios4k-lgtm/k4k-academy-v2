// Isolated payment-only lifecycle verification. Never calls any AI provider.
import {createClient} from '@supabase/supabase-js';
const env=process.env;
if(env.VERCEL_ENV!=='preview'||env.K4K_BILLING_QA_ONLY!=='true'||env.K4K_QA_CORRECTED_CHECKOUT!=='true')process.exit(0);
if(env.K4K_LIVE_PAYMENTS_ENABLED==='true'||env.K4K_ENABLE_PRODUCTION_GENERATION==='true'||env.K4K_ENABLE_TEST_GENERATION==='true'||!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('QA_UNSAFE_OR_MISSING_CREDENTIALS');
const userId='59f0e952-cad3-4aa6-b5cc-d2a9a5f3fef1',clockId='clock_1Ubd0FL7fmdMaK0kxOcEiT2Y',subId='sub_1Ubd0IL7fmdMaK0kVqDPz68j',customerId='cus_VcsluaUkRoSLPH',price='price_1UbT9fL7fmdMaK0kzG16byXx';
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const owner=await db.auth.admin.getUserById(userId);
if(owner.error||owner.data.user?.email!=='k4k-lifecycle-qa-20261114@example.com'||owner.data.user?.app_metadata?.k4k_qa_run!=='20261114'||owner.data.user?.app_metadata?.k4k_qa_kind!=='lifecycle')throw Error('QA_OWNER_MISMATCH');
const stripe=async(path,form,key)=>{const res=await fetch('https://api.stripe.com/v1/'+path,{method:form?'POST':'GET',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,...(form?{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'k4k-qa-lifecycle-20261114-'+key}:{})},body:form?new URLSearchParams(form).toString():undefined,signal:AbortSignal.timeout(20000)});const j=await res.json();if(!res.ok)throw Error('QA_STRIPE_'+res.status+'_'+(j.error?.code||j.error?.type||'unknown'));if(j.livemode===true)throw Error('QA_LIVE_OBJECT');return j;};
const sub=()=>stripe('subscriptions/'+subId);
const clock=()=>stripe('test_helpers/test_clocks/'+clockId);
const checkSub=s=>{if(s.id!==subId||s.customer!==customerId||s.test_clock!==clockId||s.metadata?.k4k_billing_qa!=='20261114'||s.items?.data?.[0]?.price?.id!==price)throw Error('QA_SUB_MISMATCH');return s;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ledger(){const m=await db.from('memberships').select('status,plan,stripe_customer_id,stripe_subscription_id,current_period_end,cancel_at_period_end').eq('user_id',userId).single();const c=await db.from('studio_credit_accounts').select('balance,billing_hold').eq('user_id',userId).single();const g=await db.from('k4k_credit_grants').select('invoice_id,credits').eq('user_id',userId);if(m.error||c.error||g.error||m.data.stripe_customer_id!==customerId||m.data.stripe_subscription_id!==subId)throw Error('QA_LEDGER_READ');return {status:m.data.status,periodEnd:m.data.current_period_end,cancelAtPeriodEnd:m.data.cancel_at_period_end,balance:c.data.balance,billingHold:c.data.billing_hold,grants:g.data.length,totalGranted:g.data.reduce((n,x)=>n+x.credits,0),invoices:g.data.map(x=>x.invoice_id)};}
async function waitLedger(predicate,label){for(let i=0;i<30;i++){const x=await ledger();if(predicate(x)){console.log(label+' '+JSON.stringify(x));return x}await sleep(2000)}throw Error(label+'_TIMEOUT');}
async function ready(){for(let i=0;i<45;i++){const x=await clock();if(x.id!==clockId)throw Error('QA_CLOCK_MISMATCH');if(x.status==='ready')return x;if(x.status!=='advancing')throw Error('QA_CLOCK_FAILED');await sleep(2000)}throw Error('QA_CLOCK_TIMEOUT');}
async function advance(target,key){const x=await ready();if(x.frozen_time<target)await stripe('test_helpers/test_clocks/'+clockId+'/advance',{frozen_time:String(target)},key);return ready();}
const renewalAt=Math.floor(Date.parse('2026-12-14T11:00:00Z')/1000),cancelAt=Math.floor(Date.parse('2027-01-14T11:00:00Z')/1000);
let s=checkSub(await sub());let c=await ready();
if(c.frozen_time<renewalAt){await waitLedger(x=>x.balance===80&&x.grants===1&&x.totalGranted===80&&x.status==='active','QA_FIRST_INVOICE_PASS');await advance(renewalAt,'advance-renewal');}
s=checkSub(await sub());c=await ready();
if(c.frozen_time<cancelAt){
 await waitLedger(x=>x.balance===160&&x.grants===2&&x.totalGranted===160&&x.status==='active','QA_RENEWAL_PASS');
 const invoices=await stripe('invoices?subscription='+encodeURIComponent(subId)+'&limit=10');const paid=invoices.data.filter(i=>i.status==='paid');if(paid.length!==2||paid.some(i=>i.amount_paid!==1599||i.currency!=='gbp'))throw Error('QA_RENEWAL_PRICE_MISMATCH');console.log('QA_INVOICES_PASS '+JSON.stringify(paid.map(i=>({id:i.id,reason:i.billing_reason,amount:i.amount_paid,currency:i.currency}))));
 if(!s.cancel_at_period_end){s=checkSub(await stripe('subscriptions/'+subId,{cancel_at_period_end:'true'},'schedule-cancel'));}
 await waitLedger(x=>x.status==='active'&&x.cancelAtPeriodEnd===true&&x.balance===160,'QA_SCHEDULE_CANCEL_PASS');
 await advance(cancelAt,'advance-cancellation');
}
s=checkSub(await sub());if(s.status!=='canceled')throw Error('QA_STRIPE_CANCEL_MISMATCH');
await waitLedger(x=>x.status==='canceled'&&x.balance===160&&x.grants===2&&x.totalGranted===160,'QA_CANCEL_PASS');
