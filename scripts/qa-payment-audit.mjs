// Read-only Stripe test audit, restricted to synthetic QA session.
const env=process.env;
if(env.VERCEL_ENV!=='preview'||env.K4K_BILLING_QA_ONLY!=='true')process.exit(0);
if(!env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw Error('NOT_TEST_KEY');
const id='cs_test_a09TIXr2Sfr4FeUoAg96eISfUpatI98Mpx7hrIaPdiLfnHGxfmYaBSc2D5';
const get=async path=>{const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('STRIPE_READ_'+r.status);return r.json()};
const s=await get('checkout/sessions/'+id);
console.log('QA_SESSION '+JSON.stringify({id:s.id,status:s.status,payment_status:s.payment_status,livemode:s.livemode,customer:s.customer,subscription:s.subscription,client_reference_id:s.client_reference_id,metadata:s.metadata,amount_total:s.amount_total,currency:s.currency}));
if(s.subscription){const sub=await get('subscriptions/'+s.subscription);console.log('QA_SUB '+JSON.stringify({id:sub.id,status:sub.status,customer:sub.customer,latest_invoice:sub.latest_invoice,metadata:sub.metadata,created:sub.created,items:sub.items?.data?.map(x=>({price:x.price?.id,current_period_end:x.current_period_end}))}));if(sub.latest_invoice){const i=await get('invoices/'+sub.latest_invoice);console.log('QA_INVOICE '+JSON.stringify({id:i.id,status:i.status,customer:i.customer,billing_reason:i.billing_reason,amount_paid:i.amount_paid,created:i.created,subscription:i.subscription,parent:i.parent,lines:i.lines?.data?.map(x=>({price:x.price?.id,pricing:x.pricing,period:x.period}))}));}}
const events=await get('events?limit=100');console.log('QA_EVENTS '+JSON.stringify(events.data?.filter(e=>[s.id,s.subscription,s.customer].filter(Boolean).some(id=>JSON.stringify(e.data?.object).includes(id))).map(e=>({id:e.id,type:e.type,created:e.created,pending_webhooks:e.pending_webhooks,object:e.data?.object?.id}))));
const ep=await get('webhook_endpoints/we_1UZJX3L7fmdMaK0kpnrZzeGo');console.log('QA_ENDPOINT '+JSON.stringify({status:ep.status,livemode:ep.livemode,origin:new URL(ep.url).origin,path:new URL(ep.url).pathname,events:ep.enabled_events}));
