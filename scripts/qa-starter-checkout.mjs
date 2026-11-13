import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {PLAN_PRICES} from '../lib/k4k-plan-prices.mjs';
const env=process.env;
if(env.VERCEL_ENV!=='preview'||env.K4K_BILLING_QA_ONLY!=='true'||env.K4K_QA_CREATE_STARTER!=='true')process.exit(0);
const key=env.STRIPE_SECRET_KEY;
if(!key?.startsWith('sk_test_')||env.K4K_LIVE_PAYMENTS_ENABLED==='true'||!env.VERCEL_URL)throw Error('QA_MODE_NOT_SAFE');
const email='k4k-launch-qa-20261113@example.com';
const stripe=async path=>{const response=await fetch('https://api.stripe.com/v1/'+path,{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('QA_STRIPE_HTTP_'+response.status);return response.json()};
const p=await stripe('prices/'+PLAN_PRICES.starter.stripePriceIds.GBP);
if(p.livemode!==false||p.currency!=='gbp'||p.unit_amount!==1599||p.recurring?.interval!=='month'||!p.active)throw Error('QA_PRICE_MISMATCH');
console.log('K4K QA test price verified: GBP 15.99, tax behavior '+p.tax_behavior);
try{const endpoints=await stripe('webhook_endpoints?limit=100');console.log('K4K QA test webhook destinations: '+JSON.stringify(endpoints.data?.map(x=>({id:x.id,url:new URL(x.url).origin+new URL(x.url).pathname,status:x.status,events:x.enabled_events}))||[]))}catch(error){console.log('K4K QA webhook inventory unavailable: '+error.message)}
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const password=randomBytes(32).toString('hex');
const create=await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{k4k_billing_qa:true},user_metadata:{display_name:'K4K Launch QA'}});
let user=create.data?.user;
if(create.error){
 // Reuse only the exact synthetic user, and only if it already carries the server-owned QA marker.
 let page=1;let found=null;
 while(page<=20){const a=await db.auth.admin.listUsers({page,perPage:100});if(a.error)throw Error('QA_USER_LOOKUP_FAILED');found=a.data.users.find(u=>u.email===email);if(found||a.data.users.length<100)break;page++;}
 if(!found||found.app_metadata?.k4k_billing_qa!==true)throw Error('QA_USER_CREATE_FAILED');
 const changed=await db.auth.admin.updateUserById(found.id,{password});if(changed.error)throw Error('QA_USER_RESET_FAILED');user=changed.data.user;
}
if(!user?.id||user.app_metadata?.k4k_billing_qa!==true)throw Error('QA_USER_INVALID');
const auth=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const login=await auth.auth.signInWithPassword({email,password});if(login.error||!login.data.session?.access_token)throw Error('QA_LOGIN_FAILED');
console.log('K4K QA isolated account authenticated: '+user.id);
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3017'],{stdio:['ignore','ignore','inherit'],env:{...env,K4K_QA_USER_ID:user.id}});
try{
 let ready=false;for(let i=0;i<40;i++){try{const res=await fetch('http://127.0.0.1:3017/api/billing/readiness',{signal:AbortSignal.timeout(1500)});if(res.ok){const state=await res.json();if(state.mode!=='test'||!state.checkoutReady)throw Error('QA_BILLING_NOT_READY');ready=true;break;}}catch(e){if(e.message==='QA_BILLING_NOT_READY')throw e;}await new Promise(r=>setTimeout(r,500))}
 if(!ready)throw Error('QA_NEXT_SERVER_NOT_READY');
 const response=await fetch('http://127.0.0.1:3017/api/billing/checkout',{method:'POST',headers:{Authorization:'Bearer '+login.data.session.access_token,'Content-Type':'application/json','x-vercel-ip-country':'GB'},body:JSON.stringify({plan:'starter',currency:'GBP'}),signal:AbortSignal.timeout(20000)});
 const result=await response.json();if(!response.ok||!result.url)throw Error('QA_CHECKOUT_'+response.status+'_'+(result.error||'UNKNOWN')+'_'+(result.stripeCode||''));
 const url=new URL(result.url);if(url.hostname!=='checkout.stripe.com'||!url.pathname.includes('cs_test_'))throw Error('QA_CHECKOUT_NOT_TEST');
 console.log('K4K QA CHECKOUT URL: '+url.href);
 console.log('K4K QA TEST SESSION: '+url.pathname.match(/cs_test_[A-Za-z0-9_]+/)?.[0]);
 console.log('K4K QA: no live payment created; await completion with Stripe test card.');
}finally{server.kill('SIGTERM');await auth.auth.signOut();}
