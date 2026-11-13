// One-off TEST-only webhook delivery verification; never creates payments.
import {createHmac} from 'node:crypto';
const env=process.env;if(env.VERCEL_ENV!=='preview'||env.K4K_BILLING_QA_ONLY!=='true'||env.K4K_QA_VERIFY_WEBHOOK!=='true')process.exit(0);
const safe={testKey:env.STRIPE_SECRET_KEY?.startsWith('sk_test_')===true,liveDisabled:env.K4K_LIVE_PAYMENTS_ENABLED!=='true',qaUser:env.K4K_QA_USER_ID==='a1e90744-a600-4823-88ae-e81c25609fd3',webhookConfigured:typeof env.STRIPE_WEBHOOK_SECRET==='string'&&env.STRIPE_WEBHOOK_SECRET.length>10,webhookPrefix:env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')===true};console.log('QA_SAFETY '+JSON.stringify(safe));if(!safe.testKey||!safe.liveDisabled||!safe.qaUser||!safe.webhookConfigured)throw Error('QA_UNSAFE');
const base='https://api.stripe.com/v1/',headers={Authorization:'Bearer '+env.STRIPE_SECRET_KEY};const get=async path=>{const r=await fetch(base+path,{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('QA_READ_'+r.status);return r.json()};
const id='we_1UZJX3L7fmdMaK0kpnrZzeGo',ep=await get('webhook_endpoints/'+id);
const old=new URL(ep.url),target='https://kreativestudios4k-site-2q6r4vsyk-kreative-studios4k.vercel.app';
if(ep.id!==id||ep.livemode!==false||ep.status!=='enabled'||old.pathname!=='/api/billing/webhook'||![target,'https://kreativestudios4k-site-hpyws0noc-kreative-studios4k.vercel.app'].includes(old.origin)||!old.searchParams.has('x-vercel-protection-bypass'))throw Error('QA_ENDPOINT_MISMATCH');
const url=new URL(target+old.pathname);url.search=old.search;
if(old.origin!==target){const r=await fetch(base+'webhook_endpoints/'+id,{method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({url:url.href}).toString(),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('QA_UPDATE_'+r.status);const x=await r.json();if(x.livemode!==false||x.id!==id||x.url!==url.href)throw Error('QA_UPDATE_MISMATCH')}
console.log('QA_CORRECTED_ENDPOINT '+url.origin+url.pathname);
for(const [eid,type,object] of [['evt_1UbRWqL7fmdMaK0k1NVNNJMK','checkout.session.completed','cs_test_a09TIXr2Sfr4FeUoAg96eISfUpatI98Mpx7hrIaPdiLfnHGxfmYaBSc2D5'],['evt_1UbRWqL7fmdMaK0kAR2oxzJd','customer.subscription.created','sub_1UbRWoL7fmdMaK0krKs5VPei'],['evt_1UbRWqL7fmdMaK0k7nRfcxPw','invoice.paid','in_1UbRWmL7fmdMaK0kBRqKOClV']]){
 const e=await get('events/'+eid);if(e.livemode!==false||e.type!==type||e.data?.object?.id!==object)throw Error('QA_EVENT_MISMATCH');
 const body=JSON.stringify(e),ts=Math.floor(Date.now()/1000),sig=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(ts+'.'+body).digest('hex');
 const res=await fetch(url.href,{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':'t='+ts+',v1='+sig},body,redirect:'manual',signal:AbortSignal.timeout(15000)});let j=null;try{j=await res.json()}catch{}
 console.log('QA_CORRECTED_WEBHOOK '+JSON.stringify({type,status:res.status,received:j?.received,handled:j?.handled,reason:j?.reason,pending_webhooks:e.pending_webhooks}));
 if(!res.ok||j?.received!==true)throw Error('QA_CORRECTED_ENDPOINT_FAILED');
}
console.log('QA_CORRECTED_WEBHOOK_PASS signed replays acknowledged; no duplicate credits.');
