import 'server-only';

// Call only from a trusted server-side event with a durable delivery record.
// Resend idempotency is an additional safeguard, not a permanent delivery ledger.
export async function sendK4kEmail({to,subject,html,idempotencyKey}, {env=process.env,fetcher=fetch}={}){
 const key=env.RESEND_API_KEY;
 const from=env.K4K_EMAIL_FROM;
 if(!key||!from)throw new Error('K4K_EMAIL_NOT_CONFIGURED');
 if(typeof to!=='string'||!to.includes('@')||typeof subject!=='string'||!subject||typeof html!=='string'||!html||typeof idempotencyKey!=='string'||!idempotencyKey||idempotencyKey.length>256)throw new Error('K4K_EMAIL_INVALID');
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from,to:[to],subject,html}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('K4K_EMAIL_DELIVERY_FAILED_'+response.status);
 const result=await response.json();
 if(typeof result.id!=='string'||!result.id)throw new Error('K4K_EMAIL_DELIVERY_UNCONFIRMED');
 return {id:result.id};
}
