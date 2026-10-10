'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';

export default function MembershipRequired(){
 const [state,setState]=useState('checking');
 useEffect(()=>{
  let alive=true;
  (async()=>{
   try{
    const supabase=createClient();
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token){if(alive)setState('sign-in');return}
    const {data,error}=await supabase.functions.invoke('claim-academy-membership',{
      method:'POST',headers:{Authorization:'Bearer '+session.access_token}
    });
    if(!alive)return;
    if(error){setState('error');return}
    if(data?.active){window.location.replace('/academy');return}
    setState('not-active');
   }catch{if(alive)setState('error')}
  })();
  return()=>{alive=false};
 },[]);
 return <main style={{minHeight:'100vh',background:'radial-gradient(circle at 50% 0%,#1d2814,#080a08 55%)',color:'#f5f6f0',display:'grid',placeItems:'center',padding:'32px 20px',fontFamily:'Arial,sans-serif'}}>
 <section style={{maxWidth:580,width:'100%',border:'1px solid #ffffff22',borderRadius:20,padding:'clamp(30px,6vw,64px)',background:'#111610',boxShadow:'0 40px 90px #0009'}}>
 <Link href='/' style={{color:'#caff39',fontWeight:900,letterSpacing:2,textDecoration:'none'}}>K4K ACADEMY</Link>
 <p style={{color:'#caff39',fontSize:12,fontWeight:800,letterSpacing:3,marginTop:46}}>PRIVATE CREATOR MEMBERSHIP</p>
 <h1 style={{fontSize:'clamp(38px,7vw,64px)',lineHeight:1.05,letterSpacing:'-.06em',margin:'12px 0 20px'}}>UNLOCK YOUR<br/>VIRAL WORKFLOW.</h1>
 {state==='checking'?<p style={{lineHeight:1.8,color:'#b7c0b1'}} role='status'>Checking your verified subscription and activating member access…</p>:
 <><p style={{lineHeight:1.8,color:'#b7c0b1'}}>{state==='error'?'We could not verify your membership right now. Please try again or contact Academy support.':state==='sign-in'?'Sign in with the email you used at checkout to activate your existing subscription. You can use a secure email link or Google.':'No active subscription is linked to this signed-in email. If you already paid, sign in again using the exact email on your Stripe receipt. Do not pay again. Contact Academy support if the issue continues.'}</p>
 <Link href='/login' style={{display:'inline-block',marginTop:24,background:'#caff39',color:'#101510',padding:'17px 24px',fontWeight:900,borderRadius:6,textDecoration:'none'}}>SIGN IN WITH YOUR PAYMENT EMAIL →</Link>
 <p style={{color:'#9da99b',fontSize:13,marginTop:28}}>Already paid? Use the email on your payment receipt. No new purchase is needed.</p>
 <p style={{fontSize:13,lineHeight:1.7,color:'#b7c0b1'}}>Still blocked after payment? <a href="mailto:hello@kreativestudios4k.com?subject=Paid%20Academy%20membership%20not%20active" style={{color:'#caff39',textDecoration:'underline'}}>Email K4K support</a> with your receipt email. We can check the account without another payment.</p>
 <Link href='/login' style={{color:'#fff',fontSize:13}}>Use secure email login →</Link>
 <button type='button' onClick={()=>window.location.reload()} style={{marginLeft:20,background:'transparent',border:'1px solid #ffffff44',borderRadius:6,color:'#fff',padding:'10px 14px',cursor:'pointer'}}>Retry activation</button>
 </>}
 </section></main>
}