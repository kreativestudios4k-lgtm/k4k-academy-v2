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
 return <main style={{minHeight:'100vh',background:'#0c0c0b',color:'#f5f6f0',display:'grid',placeItems:'center',padding:'32px 20px',fontFamily:'Arial,sans-serif'}}>
 <section style={{maxWidth:580,width:'100%',border:'1px solid #ffffff22',borderRadius:14,padding:'clamp(30px,6vw,64px)',background:'#191a16',boxShadow:'0 40px 90px #0009'}}>
 <Link href='/' style={{color:'#d0ff6b',fontWeight:900,letterSpacing:2,textDecoration:'none'}}>K4K ACADEMY</Link>
 <p style={{color:'#d0ff6b',fontSize:12,fontWeight:800,letterSpacing:3,marginTop:46}}>MEMBER ACCOUNT / SUBSCRIPTION ACCESS</p>
 <h1 style={{fontSize:'clamp(38px,7vw,64px)',lineHeight:1.05,letterSpacing:'-.06em',margin:'12px 0 20px'}}>YOUR ACCOUNT.<br/>YOUR NEXT STEP.</h1>
 {state==='checking'?<p style={{lineHeight:1.8,color:'#b7c0b1'}} role='status'>Checking your subscription and connecting your Academy account…</p>:
 <><p style={{lineHeight:1.8,color:'#b7c0b1'}}>{state==='error'?'We could not verify your membership right now. Please try again or contact Academy support.':state==='sign-in'?'Sign in using the same email you used at checkout. Your registration password or your existing Google account will work.':'Your account exists, but an active Academy membership is not linked to this email. If you already paid, do not pay again: check the email on your payment receipt or contact Academy support. If you have not subscribed yet, you can view the membership options.'}</p>
 <Link href='/login' style={{display:'inline-block',marginTop:24,background:'#d0ff6b',color:'#101510',padding:'17px 24px',fontWeight:900,borderRadius:6,textDecoration:'none'}}>GO TO STUDENT LOGIN →</Link>
 <p style={{color:'#9da99b',fontSize:13,marginTop:28}}>Already paid? Use the email on your payment receipt. No new purchase is needed.</p>
 <p style={{fontSize:13,lineHeight:1.7,color:'#b7c0b1'}}>Still blocked after payment? <a href="mailto:hello@kreativestudios4k.com?subject=Paid%20Academy%20membership%20not%20active" style={{color:'#d0ff6b',textDecoration:'underline'}}>Email K4K support</a> with your receipt email. We can check the account without another payment.</p>
 <div style={{marginTop:23}}><Link href='/' style={{color:'#d0ff6b',fontSize:13,textDecoration:'underline'}}>View membership options on the homepage ↗</Link></div>
 <button type='button' onClick={()=>window.location.reload()} style={{marginLeft:20,background:'transparent',border:'1px solid #ffffff44',borderRadius:6,color:'#fff',padding:'10px 14px',cursor:'pointer'}}>Retry activation</button>
 </>}
 </section></main>
}