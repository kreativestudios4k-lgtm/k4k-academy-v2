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
 <h1 style={{fontSize:'clamp(38px,7vw,64px)',lineHeight:1.05,letterSpacing:'-.06em',margin:'12px 0 20px'}}>UNLOCK THE<br/>FULL METHOD.</h1>
 {state==='checking'?<p style={{lineHeight:1.8,color:'#b7c0b1'}} role='status'>Checking your verified subscription and activating member access…</p>:
 <><p style={{lineHeight:1.8,color:'#b7c0b1'}}>{state==='error'?'We could not verify your membership right now. Please try again or contact Academy support.':state==='sign-in'?'Sign in with the same verified email used at checkout to activate your subscription.':'We could not find an active K4K Creator Membership for this account. If you paid using another email, sign in with that email or contact support.'}</p>
 <Link href='/#join' style={{display:'inline-block',marginTop:24,background:'#caff39',color:'#101510',padding:'17px 24px',fontWeight:900,borderRadius:6,textDecoration:'none'}}>VIEW MEMBERSHIP →</Link>
 <p style={{color:'#9da99b',fontSize:13,marginTop:28}}>Already paid? Sign in with the same email used for your membership.</p>
 <Link href='/login' style={{color:'#fff',fontSize:13}}>Sign in again →</Link>
 <button type='button' onClick={()=>window.location.reload()} style={{marginLeft:20,background:'transparent',border:'1px solid #ffffff44',borderRadius:6,color:'#fff',padding:'10px 14px',cursor:'pointer'}}>Retry activation</button>
 </>}
 </section></main>
}