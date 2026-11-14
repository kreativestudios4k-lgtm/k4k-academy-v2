// Payment-only QA fixture. Never invokes an AI provider. All writes use a
// dedicated synthetic account and a test Stripe key; idempotent across builds.
import {createClient} from '@supabase/supabase-js';
import {buildCheckoutForm,resolvePrice} from '../lib/server/stripe-billing.mjs';
const env=process.env;
if(env.VERCEL_ENV!=='preview'||env.K4K_BILLING_QA_ONLY!=='true'||env.K4K_QA_CORRECTED_CHECKOUT!=='true')process.exit(0);
if(env.K4K_LIVE_PAYMENTS_ENABLED==='true'||env.K4K_ENABLE_PRODUCTION_GENERATION==='true'||env.K4K_ENABLE_TEST_GENERATION==='true'||!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('QA_UNSAFE_OR_MISSING_CREDENTIALS');
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const marker='20261114',price=resolvePrice('starter','GBP'),base='https://kreativestudios4k-site-git-qa-k4k-sta-7be2d9-kreative-studios4k.vercel.app';
const stripe=async(path,form,key)=>{const res=await fetch('https://api.stripe.com/v1/'+path,{method:form?'POST':'GET',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,...(form?{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'k4k-qa-'+marker+'-'+key}:{})},body:form?.toString(),signal:AbortSignal.timeout(20000)});const j=await res.json();if(!res.ok)throw Error('QA_STRIPE_'+res.status+'_'+(j.error?.code||j.error?.type||'unknown'));if(j.livemode===true)throw Error('QA_LIVE_OBJECT');return j;};
const form=o=>new URLSearchParams(o);
async function user(kind){
 const email='k4k-'+kind+'-qa-'+marker+'@example.com';
 let existing=null;
 for(let page=1;page<=20;page++){const r=await db.auth.admin.listUsers({page,perPage:100});if(r.error)throw Error('QA_USER_LIST');existing=r.data.users.find(u=>u.email===email);if(existing||r.data.users.length<100)break;}
 if(!existing){const r=await db.auth.admin.createUser({email,email_confirm:true,app_metadata:{k4k_billing_qa:true,k4k_qa_run:marker,k4k_qa_kind:kind}});if(r.error)throw Error('QA_USER_CREATE');existing=r.data.user;}
 if(existing?.email!==email||existing.app_metadata?.k4k_billing_qa!==true||existing.app_metadata?.k4k_qa_run!==marker||existing.app_metadata?.k4k_qa_kind!==kind)throw Error('QA_USER_MISMATCH');
 return existing;
}
const p=await stripe('prices/'+price);
if(p.unit_amount!==1599||p.currency!=='gbp'||p.tax_behavior!=='inclusive'||p.recurring?.interval!=='month')throw Error('QA_PRICE_MISMATCH');
const checkout=await user('checkout');
const checkoutForm=buildCheckoutForm({priceId:price,userId:checkout.id,origin:base,plan:'starter',currency:'GBP'});
checkoutForm.set('automatic_tax[enabled]','true');checkoutForm.set('tax_id_collection[enabled]','true');checkoutForm.set('customer_email',checkout.email);
checkoutForm.set('metadata[k4k_billing_qa]',marker);checkoutForm.set('subscription_data[metadata][k4k_billing_qa]',marker);
const session=await stripe('checkout/sessions',checkoutForm,'checkout-session');
if(session.livemode!==false||session.amount_total!==1599||session.currency!=='gbp'||session.client_reference_id!==checkout.id)throw Error('QA_CHECKOUT_MISMATCH');
console.log('QA_CORRECTED_CHECKOUT '+JSON.stringify({id:session.id,status:session.status,amount:session.amount_total,currency:session.currency,userId:checkout.id,price}));
try{
 const lifecycle=await user('lifecycle');
 const frozen=Math.floor(Date.parse('2026-11-14T09:00:00Z')/1000);
 const clock=await stripe('test_helpers/test_clocks',form({frozen_time:String(frozen),name:'K4K Starter lifecycle 20261114'}),'clock');
 const customer=await stripe('customers',form({email:lifecycle.email,test_clock:clock.id,payment_method:'pm_card_visa','invoice_settings[default_payment_method]':'pm_card_visa','address[country]':'GB','address[postal_code]':'L1 1AA','address[city]':'Liverpool','address[line1]':'10 Test Street','metadata[k4k_billing_qa]':marker}),'clock-customer');
 const old=await db.from('memberships').select('stripe_customer_id').eq('user_id',lifecycle.id).maybeSingle();if(old.error||old.data&&old.data.stripe_customer_id!==customer.id)throw Error('QA_MEMBERSHIP_MISMATCH');
 if(!old.data){const r=await db.from('memberships').insert({user_id:lifecycle.id,status:'inactive',plan:'starter',stripe_customer_id:customer.id});if(r.error)throw Error('QA_LINK_CUSTOMER');}
 const sub=await stripe('subscriptions',form({customer:customer.id,'items[0][price]':price,'automatic_tax[enabled]':'true','metadata[plan_key]':'starter','metadata[k4k_billing_qa]':marker,payment_behavior:'error_if_incomplete'}),'clock-subscription');
 console.log('QA_LIFECYCLE_CREATED '+JSON.stringify({userId:lifecycle.id,clock:clock.id,customer:customer.id,subscription:sub.id,status:sub.status,periodEnd:sub.items?.data?.[0]?.current_period_end??sub.current_period_end}));
}catch(error){console.log('QA_LIFECYCLE_BLOCKED '+String(error.message).replace(/[^A-Za-z0-9_-]/g,'').slice(0,100));}
