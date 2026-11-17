'use client';
import {useState} from 'react';
import {createClient} from '../../../lib/supabase/client';
import {K4K_V2_PLANS} from '../../../lib/k4k-plan-v2.mjs';
export default function OwnerPlanQATool(){
 const [plan,setPlan]=useState('starter'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function run(){
  if(busy)return;setBusy(true);setError('');
  try{
   const {data:{session},error:authError}=await createClient().auth.getSession();
   if(authError||!session?.access_token){window.location.assign('/login?next='+encodeURIComponent('/k4k-app/plans-preview/qa'));return;}
   const response=await fetch('/api/plans-v2/checkout',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({plan}),cache:'no-store'});
   const data=await response.json().catch(()=>({}));
   if(!response.ok){if(data.error==='UNAUTHENTICATED'){window.location.assign('/login?next='+encodeURIComponent('/k4k-app/plans-preview/qa'));return;}throw Error(data.error==='NOT_AVAILABLE'?'This account is not authorised for the owner-only test. Please use the owner account configured in K4K.':(data.error||'TEST_CHECKOUT_UNAVAILABLE'));}
   const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||data.testMode!==true)throw Error('INVALID_TEST_CHECKOUT');
   window.location.assign(url.href);
  }catch(e){setError(e.message||'TEST_CHECKOUT_UNAVAILABLE');setBusy(false)}
 }
 return <section style={{margin:'50px auto 0',maxWidth:600,border:'1px solid #617460',background:'#19241c',padding:24,borderRadius:18}}>
  <h2 style={{fontSize:21,margin:'0 0 12px'}}>Owner-only Stripe sandbox test</h2>
  <p style={{fontSize:13,lineHeight:1.7,color:'#bdc9bd'}}>If you are not signed in on this preview website, you will be redirected to login and returned here. This is an isolated QA action using Stripe TEST-mode cards only. It is blocked to everyone except the configured owner and never activates live subscriptions. Test payments can create test membership records; do not use real payment details.</p>
  <label style={{display:'grid',gap:7,fontSize:13,fontWeight:700}}>Plan to test<select value={plan} onChange={e=>setPlan(e.target.value)} style={{background:'#121a14',color:'#fff',padding:13,border:'1px solid #455845',borderRadius:10}}>
  {Object.values(K4K_V2_PLANS).map(p=><option key={p.key} value={p.key}>{p.name} — £{(p.gbpMinor/100).toFixed(2)}, {p.credits} credits</option>)}
  </select></label>
  <button type="button" disabled={busy} onClick={run} style={{cursor:busy?'wait':'pointer',width:'100%',background:'#a3ff9b',color:'#132014',padding:14,border:0,borderRadius:12,fontWeight:850,marginTop:16}}>{busy?'Opening test checkout…':'Open Stripe TEST checkout'}</button>
  {error&&<p role="alert" style={{color:'#ffb4b4'}}>{error}</p>}
 </section>;
}
