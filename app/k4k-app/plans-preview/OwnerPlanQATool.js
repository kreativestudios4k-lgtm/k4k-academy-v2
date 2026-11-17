'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../../lib/supabase/client';
import {K4K_V2_PLANS} from '../../../lib/k4k-plan-v2.mjs';

const LOGIN='/login?next=%2Fk4k-app%2Fplans-preview%2Fqa';
export default function OwnerPlanQATool(){
 const [plan,setPlan]=useState('starter');
 const [auth,setAuth]=useState({state:'checking',user:null});
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  const supabase=createClient();
  async function check(){
   try{
    // A verified user (not merely a cached JWT) is required for owner QA.
    const {data,error}=await supabase.auth.getUser();
    if(!active)return;
    setAuth(error||!data?.user?{state:'signed-out',user:null}:{state:'signed-in',user:data.user});
   }catch{if(active)setAuth({state:'unavailable',user:null})}
  }
  const subscription=supabase.auth.onAuthStateChange(()=>{void check()});
  void check();
  const visible=()=>{if(document.visibilityState==='visible')void check()};
  window.addEventListener('pageshow',check);
  document.addEventListener('visibilitychange',visible);
  return()=>{active=false;subscription.data.subscription.unsubscribe();window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',visible)};
 },[]);
 async function run(){
  if(busy||auth.state!=='signed-in')return;
  setBusy(true);setError('');
  try{
   const supabase=createClient();
   const {data:{session},error:authError}=await supabase.auth.getSession();
   if(authError||!session?.access_token){setAuth({state:'signed-out',user:null});return}
   const response=await fetch('/api/plans-v2/checkout',{
    method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({plan}),cache:'no-store',
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok){
    if(data.error==='UNAUTHENTICATED'){setAuth({state:'signed-out',user:null});return;}
    throw Error(data.error==='NOT_AVAILABLE'?'This account is not authorised for owner QA. Use the configured owner account.':(data.error||'TEST_CHECKOUT_UNAVAILABLE'));
   }
   const url=new URL(data.url);
   if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||data.testMode!==true)throw Error('INVALID_TEST_CHECKOUT');
   window.location.assign(url.href);
  }catch(e){setError(e.message||'TEST_CHECKOUT_UNAVAILABLE')}
  finally{setBusy(false)}
 }
 return <section style={{margin:'50px auto 0',maxWidth:620,border:'1px solid #617460',background:'#19241c',padding:24,borderRadius:18}}>
  <h2 style={{fontSize:21,margin:'0 0 12px'}}>Owner-only Stripe sandbox test</h2>
  <p style={{fontSize:13,lineHeight:1.7,color:'#bdc9bd'}}>Stripe TEST mode only. No real charges and no changes to live subscriptions. Sign in on this same preview domain before testing. Build: QA-AUTH-V2.</p>
  {auth.state==='checking'&&<p role="status">Checking your sign-in securely…</p>}
  {auth.state==='signed-out'&&<div role="status" style={{border:'1px solid #768c73',borderRadius:12,padding:18,background:'#243529'}}>
   <p style={{margin:'0 0 12px'}}>You're not signed in on this preview website.</p>
   <Link href={LOGIN} style={{display:'block',textAlign:'center',background:'#a3ff9b',color:'#132014',padding:14,borderRadius:10,fontWeight:850,textDecoration:'none'}}>Sign in to K4K to continue</Link>
  </div>}
  {auth.state==='unavailable'&&<p role="alert">We couldn't verify a session. Reload this preview page, then sign in if required.</p>}
  {auth.state==='signed-in'&&<>
   <p role="status" style={{fontSize:13,color:'#a3ff9b'}}>Signed in as {auth.user.email||'K4K member'}. Server-side owner verification is still required.</p>
   <label style={{display:'grid',gap:7,fontSize:13,fontWeight:700}}>Plan to test<select value={plan} onChange={e=>setPlan(e.target.value)} style={{background:'#121a14',color:'#fff',padding:13,border:'1px solid #455845',borderRadius:10}}>
    {Object.values(K4K_V2_PLANS).map(p=><option key={p.key} value={p.key}>{p.name} — £{(p.gbpMinor/100).toFixed(2)}, {p.credits} credits</option>)}
   </select></label>
   <button type="button" disabled={busy} onClick={run} style={{cursor:busy?'wait':'pointer',width:'100%',background:'#a3ff9b',color:'#132014',padding:14,border:0,borderRadius:12,fontWeight:850,marginTop:16}}>{busy?'Opening test checkout…':'Open Stripe TEST checkout'}</button>
  </>}
  {error&&<p role="alert" style={{color:'#ffb4b4'}}>{error}</p>}
 </section>;
}
