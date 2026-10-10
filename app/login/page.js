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
 const [oauthError,setOauthError]=useState(false);
 const [email,setEmail]=useState('');
 const [emailLoading,setEmailLoading]=useState(false);
 const [emailSent,setEmailSent]=useState(false);
 const [passwordEmail,setPasswordEmail]=useState('');
 const [password,setPassword]=useState('');
 const [passwordLoading,setPasswordLoading]=useState(false);
 useEffect(()=>{const q=new URLSearchParams(window.location.search);setCheckoutReturn(q.get('checkout')==='success');setOauthError(q.has('error'))},[]);
 async function google(){
  setLoading(true);setMsg('');
  const supabase=createClient();
  const {error}=await supabase.auth.signInWithOAuth({
   provider:'google',
   options:{redirectTo:window.location.origin+'/auth/callback',queryParams:{prompt:'select_account'}}
  });
  if(error){setMsg(error.message);setLoading(false)}
 }
 async function emailSignIn(event){
  event.preventDefault();
  setMsg('');setEmailSent(false);
  const normalized=email.trim().toLowerCase();
  if(!normalized.includes('@')||!normalized.split('@')[1]?.includes('.')){setMsg('Enter a valid email address.');return}
  setEmailLoading(true);
  try{
   const supabase=createClient();
   const {error}=await supabase.auth.signInWithOtp({
    email:normalized,
    options:{emailRedirectTo:window.location.origin+'/auth/callback',shouldCreateUser:true}
   });
   if(error)throw error;
   setEmailSent(true);
  }catch(err){const message=String(err?.message||'');setMsg(/rate.limit|too many|429/i.test(message)?'Email sign-in is temporarily rate-limited. Please avoid repeated requests. Use Google or your password below, or contact support if you already paid.':message||'Unable to send sign-in email. Please try again.')}
  finally{setEmailLoading(false)}
 }
 async function passwordSignIn(event){
  event.preventDefault();
  setMsg('');
  setPasswordLoading(true);
  try{
   const supabase=createClient();
   const {data,error}=await supabase.auth.signInWithPassword({
    email:passwordEmail.trim().toLowerCase(),
    password
   });
   if(error)throw error;
   window.location.replace(data?.user?.user_metadata?.k4k_temp_password?'/update-password':'/academy');
  }catch(err){
   setMsg(/invalid login credentials/i.test(String(err?.message||''))?'Email or password not recognised. Try Google or request a secure login link. If you already paid, contact support instead of buying again.':err?.message||'Unable to sign in. Check your email and password.');
   setPasswordLoading(false);
  }
 }
 return <main className="authpage"><Link href="/" className="brand"><span>K4K</span> ACADEMY</Link>
 <section style={{maxWidth:440,width:'100%',margin:'auto',padding:'35px 25px',border:'1px solid #ffffff25',borderRadius:18,background:'#111610',color:'#fff'}}>
 <small style={{color:'#caff39',letterSpacing:2,fontWeight:800}}>PRIVATE VIRAL VIDEO WORKFLOW</small>
 <h1 style={{fontSize:'clamp(38px,7vw,58px)',lineHeight:1.05,letterSpacing:'-.05em',margin:'22px 0'}}>YOUR VIDEO.<br/><i>YOUR ACCESS.</i></h1>
 {checkoutReturn?<p role="status" style={{lineHeight:1.7,color:'#e5f6c9',background:'#caff3914',border:'1px solid #caff3955',padding:14,borderRadius:9}}>Thanks for joining! Sign in using the <b>same email you used to pay</b>. Your subscription will be checked before access is granted.</p>:<p style={{lineHeight:1.7,color:'#b9c5b3'}}>Already purchased? Sign in using the same email address as your Stripe payment to unlock your workflow.</p>}
 <form onSubmit={emailSignIn} style={{margin:"22px 0 18px",display:"grid",gap:11}}>
  <label htmlFor="member-email" style={{fontSize:13,fontWeight:800,color:"#e7f2dd"}}>MEMBER EMAIL ACCESS</label>
  <input id="member-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email used when you paid" style={{width:"100%",border:"1px solid #ffffff55",background:"#090e09",color:"#fff",padding:"15px 14px",borderRadius:8,fontSize:15}}/>
  <button type="submit" disabled={emailLoading} style={{width:"100%",background:"#caff39",color:"#0e160c",fontWeight:900,padding:"15px 14px",border:0,borderRadius:8,cursor:"pointer",fontSize:13}}>{emailLoading?'SENDING ACCESS LINK…':'EMAIL ME A SECURE LOGIN LINK →'}</button>
  {emailSent&&<p role="status" style={{lineHeight:1.6,color:"#caff39",border:"1px solid #caff3955",background:"#caff3912",padding:13,borderRadius:8,margin:0}}>Check your inbox (and spam folder) for your secure sign-in email. Open the link on this device to activate your existing paid membership. Do not purchase again.</p>}
 </form>
 <form onSubmit={passwordSignIn} style={{margin:"20px 0",display:"grid",gap:11,padding:"18px 0",borderTop:"1px solid #ffffff25"}}>
  <label htmlFor="password-email" style={{fontSize:13,fontWeight:800,color:"#e7f2dd"}}>SIGN IN WITH PASSWORD</label>
  <input id="password-email" type="email" autoComplete="username" required value={passwordEmail} onChange={e=>setPasswordEmail(e.target.value)} placeholder="Email used when you paid" style={{width:"100%",border:"1px solid #ffffff55",background:"#090e09",color:"#fff",padding:"15px 14px",borderRadius:8,fontSize:15}}/>
  <input id="member-password" aria-label="Password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password or temporary password" style={{width:"100%",border:"1px solid #ffffff55",background:"#090e09",color:"#fff",padding:"15px 14px",borderRadius:8,fontSize:15}}/>
  <button type="submit" disabled={passwordLoading} style={{width:"100%",background:"#caff39",color:"#0e160c",fontWeight:900,padding:"15px 14px",border:0,borderRadius:8,cursor:"pointer",fontSize:13}}>{passwordLoading?'SIGNING IN…':'SIGN IN WITH PASSWORD →'}</button>
  <p style={{color:"#9da99b",fontSize:12,lineHeight:1.6,margin:0}}>Using a temporary password? Sign in, then open Change Password in your member dashboard to choose your own.</p>
 </form>
 <div style={{display:"flex",alignItems:"center",gap:12,color:"#a7b2a4",fontSize:12,margin:"16px 0"}}><span style={{flex:1,borderTop:"1px solid #ffffff30"}}/>OR USE GOOGLE<span style={{flex:1,borderTop:"1px solid #ffffff30"}}/></div>
 <button type="button" className="googleAuth" onClick={google} disabled={loading} style={{width:'100%',margin:'28px 0 12px',display:'flex',justifyContent:'center',alignItems:'center',gap:12}}><GoogleMark/>{loading?'Connecting to Google…':'Continue with Google'}</button>
 {oauthError&&<p role="alert" style={{color:'#ffb6a6'}}>Google sign-in could not be completed. Please try again.</p>}
 {msg&&<p role="alert" style={{color:'#ffb6a6',lineHeight:1.6}}>{msg}</p>}
 <p style={{fontSize:12,color:'#b9c5b3',lineHeight:1.7,marginTop:17}}>Need help with an existing purchase, login or subscription? <a href="mailto:hello@kreativestudios4k.com?subject=K4K%20Academy%20login%20help" style={{color:'#caff39',textDecoration:'underline'}}>Contact Academy support</a>. Please include the email on your payment receipt.</p>
 <p style={{display:'flex',alignItems:'center',gap:8,color:'#b9c5b3',fontSize:12,marginTop:16}}><ShieldCheck size={17} color="#caff39"/> Email or Google sign-in does not grant access without an active paid membership.</p>
 <div style={{borderTop:'1px solid #ffffff25',marginTop:28,paddingTop:25}}>
  <p style={{fontSize:14,color:'#e8eee3',fontWeight:700}}>Not purchased yet?</p>
  <Link href="/#checkout" style={{display:'flex',justifyContent:'center',alignItems:'center',gap:10,background:'#caff39',color:'#101510',fontWeight:900,padding:'17px 15px',borderRadius:7,textDecoration:'none'}}>GET ACCESS · £7.99 / MONTH <ArrowRight size={17}/></Link>
 </div>
 <p style={{fontSize:12,color:'#98a694',marginTop:23,lineHeight:1.6}}><LockKeyhole size={14} style={{verticalAlign:'middle'}}/> Your workflow is protected. Use the email address on your payment receipt; no second purchase is required.</p>
 </section></main>
}