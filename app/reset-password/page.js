'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {ArrowRight,KeyRound,ShieldCheck,Mail} from 'lucide-react';

export default function ResetPassword(){
 const[email,setEmail]=useState('');
 const[loading,setLoading]=useState(false);
 const[sent,setSent]=useState(false);
 const[error,setError]=useState('');
 const[linkExpired,setLinkExpired]=useState(false);
 useEffect(()=>{const q=new URLSearchParams(window.location.search);setLinkExpired(q.get('error')==='expired');},[]);
 async function requestReset(event){
  event.preventDefault();setError('');setSent(false);
  const e=email.trim().toLowerCase();
  if(!e.includes('@')||!e.split('@')[1]?.includes('.')){setError('Please enter a valid email address.');return}
  setLoading(true);
  try{
   const supabase=createClient();
   const {error:err}=await supabase.auth.resetPasswordForEmail(e,{
    redirectTo:window.location.origin+'/auth/callback?flow=password-recovery'
   });
   if(err)throw err;
   setSent(true);
  }catch(err){
   const message=String(err?.message||'');
   setError(/rate.limit|too many|429|email rate/i.test(message)
    ?'Too many email requests. Please wait before trying again, or contact Academy support.'
    :'We could not send the reset email. Please try again or contact Academy support.');
  }finally{setLoading(false)}
 }
 return <main className="authpage authPremium">
  <Link href="/" className="brand"><span>K4K</span> ACADEMY</Link>
  <div className="authPremiumLayout">
   <div className="authPremiumPitch">
    <span>K4K ACADEMY / ACCOUNT SECURITY</span>
    <h2>YOUR<br/>ACCOUNT.<br/><em>YOUR CONTROL.</em></h2>
    <p>Create a password safely without losing your existing subscription, membership or saved lessons.</p>
    <div><span className="authPremiumDot"/> SECURE PASSWORD RECOVERY</div>
   </div>
   <section className="authPremiumCard">
    <small style={{color:'#caff39',letterSpacing:2,fontWeight:800}}>PRIVATE CREATOR ACCESS</small>
    <h1 style={{fontSize:'clamp(36px,6vw,56px)',lineHeight:1.05,letterSpacing:'-.05em',margin:'20px 0'}}>RESET YOUR<br/><i>PASSWORD.</i></h1>
    <p style={{color:'#b9c5b3',lineHeight:1.7}}>Enter the email address you used for K4K Academy. We'll send you a secure, single-use link to create a new password. <b>No new payment is needed.</b></p>
    {linkExpired&&<p role="alert" style={{color:'#ffe3b3',background:'#ffb65014',padding:13,borderRadius:8}}>That link may have expired or been used already. Request a new one below.</p>}
    {sent?
     <div role="status" style={{border:'1px solid #caff3955',background:'#caff3914',borderRadius:12,padding:22,marginTop:20,display:'grid',gap:14}}>
      <Mail size={30} color="#caff39"/>
      <b style={{color:'#e6ffd0'}}>Check your inbox</b>
      <p style={{color:'#d6dfd2',lineHeight:1.7,margin:0}}>If this email belongs to an Academy account, a password reset link has been sent. Check spam if needed. Open the <b>newest link on the same device and browser</b> where you requested it.</p>
      <button type="button" onClick={()=>setSent(false)} style={{background:'transparent',color:'#caff39',border:'1px solid #caff3950',borderRadius:8,padding:12,cursor:'pointer'}}>Request another link</button>
     </div>:
     <form onSubmit={requestReset} style={{display:'grid',gap:14,margin:'28px 0'}}>
      <label htmlFor="reset-email" style={{fontSize:13,fontWeight:800}}>YOUR PAYMENT EMAIL</label>
      <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{width:'100%',background:'#090e09',color:'#fff',border:'1px solid #ffffff50',padding:'16px',borderRadius:9,fontSize:16}}/>
      {error&&<p role="alert" style={{color:'#ffb6a6',lineHeight:1.6,margin:0}}>{error}</p>}
      <button disabled={loading} type="submit" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,background:'#caff39',color:'#101510',border:0,padding:'17px',borderRadius:9,fontWeight:900,cursor:'pointer'}}>{loading?'SENDING SECURE LINK…':'EMAIL ME A PASSWORD RESET LINK'} <ArrowRight size={18}/></button>
     </form>}
    <p style={{fontSize:13,color:'#abb8ad',lineHeight:1.6}}><ShieldCheck size={16} style={{verticalAlign:'middle',marginRight:6}}/>Only the owner of the mailbox can use the reset link. Academy access still requires an active subscription.</p>
    <Link href="/login" style={{display:'inline-flex',alignItems:'center',gap:8,color:'#caff39',fontSize:13,fontWeight:800,marginTop:15}}>BACK TO SIGN IN <ArrowRight size={16}/></Link>
    <p style={{color:'#9ba8a1',fontSize:12,marginTop:25}}>Need help? <a href="mailto:hello@kreativestudios4k.com?subject=K4K%20Academy%20password%20help" style={{textDecoration:'underline'}}>Contact Academy support</a>.</p>
   </section>
  </div>
 </main>
}