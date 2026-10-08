'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {ArrowRight,ShieldCheck,LockKeyhole} from 'lucide-react';

function GoogleMark(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 12.18c0-.64-.06-1.25-.17-1.84H12v3.48h5.25a4.49 4.49 0 0 1-1.95 2.94v2.26h3.16c1.85-1.7 2.89-4.21 2.89-6.84Z"/><path fill="currentColor" opacity=".82" d="M12 21.7c2.64 0 4.86-.88 6.48-2.38l-3.16-2.45c-.88.59-2 .94-3.32.94-2.55 0-4.71-1.72-5.48-4.03H3.26v2.53A9.79 9.79 0 0 0 12 21.7Z"/><path fill="currentColor" opacity=".64" d="M6.52 13.78A5.9 5.9 0 0 1 6.21 12c0-.62.11-1.22.31-1.78V7.69H3.26A9.7 9.7 0 0 0 2.2 12c0 1.56.37 3.03 1.06 4.31l3.26-2.53Z"/></svg>}

export default function Login(){
 const [loading,setLoading]=useState(false);
 const [msg,setMsg]=useState('');
 const [checkoutReturn,setCheckoutReturn]=useState(false);
 useEffect(()=>{setCheckoutReturn(new URLSearchParams(window.location.search).get('checkout')==='success')},[]);
 async function google(){
  setLoading(true);setMsg('');
  const supabase=createClient();
  const {error}=await supabase.auth.signInWithOAuth({
   provider:'google',
   options:{redirectTo:window.location.origin+'/membership-required',queryParams:{prompt:'select_account'}}
  });
  if(error){setMsg(error.message);setLoading(false)}
 }
 return <main className="authpage"><Link href="/" className="brand"><span>K4K</span> ACADEMY</Link>
 <section style={{maxWidth:440,width:'100%',margin:'auto',padding:'35px 25px',border:'1px solid #ffffff25',borderRadius:18,background:'#111610',color:'#fff'}}>
 <small style={{color:'#caff39',letterSpacing:2,fontWeight:800}}>PRIVATE VIRAL VIDEO WORKFLOW</small>
 <h1 style={{fontSize:'clamp(38px,7vw,58px)',lineHeight:1.05,letterSpacing:'-.05em',margin:'22px 0'}}>YOUR VIDEO.<br/><i>YOUR ACCESS.</i></h1>
 {checkoutReturn?<p role="status" style={{lineHeight:1.7,color:'#e5f6c9',background:'#caff3914',border:'1px solid #caff3955',padding:14,borderRadius:9}}>Thanks for joining! Continue with Google using the <b>same email you used to pay</b>. Your subscription will be checked before access is granted.</p>:<p style={{lineHeight:1.7,color:'#b9c5b3'}}>Already purchased? Continue with Google using the same email address as your Stripe payment to unlock your workflow.</p>}
 <button type="button" className="googleAuth" onClick={google} disabled={loading} style={{width:'100%',margin:'28px 0 12px',display:'flex',justifyContent:'center',alignItems:'center',gap:12}}><GoogleMark/>{loading?'Connecting to Google…':'Continue with Google'}</button>
 {msg&&<p role="alert" style={{color:'#ffb6a6',lineHeight:1.6}}>{msg}</p>}
 <p style={{display:'flex',alignItems:'center',gap:8,color:'#b9c5b3',fontSize:12,marginTop:16}}><ShieldCheck size={17} color="#caff39"/> Google sign-in does not grant access without an active paid membership.</p>
 <div style={{borderTop:'1px solid #ffffff25',marginTop:28,paddingTop:25}}>
  <p style={{fontSize:14,color:'#e8eee3',fontWeight:700}}>Not purchased yet?</p>
  <Link href="/#checkout" style={{display:'flex',justifyContent:'center',alignItems:'center',gap:10,background:'#caff39',color:'#101510',fontWeight:900,padding:'17px 15px',borderRadius:7,textDecoration:'none'}}>GET ACCESS · £7.99 / MONTH <ArrowRight size={17}/></Link>
 </div>
 <p style={{fontSize:12,color:'#98a694',marginTop:23,lineHeight:1.6}}><LockKeyhole size={14} style={{verticalAlign:'middle'}}/> Your workflow is protected. If you paid with a different email, contact Academy support to resolve the mismatch.</p>
 </section></main>
}