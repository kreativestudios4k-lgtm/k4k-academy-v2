'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {ArrowRight,Mail,KeyRound} from 'lucide-react';

function GoogleMark(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 12.18c0-.64-.06-1.25-.17-1.84H12v3.48h5.25a4.49 4.49 0 0 1-1.95 2.94v2.26h3.16c1.85-1.7 2.89-4.21 2.89-6.84Z"/><path fill="currentColor" opacity=".82" d="M12 21.7c2.64 0 4.86-.88 6.48-2.38l-3.16-2.45c-.88.59-2 .94-3.32.94-2.55 0-4.71-1.72-5.48-4.03H3.26v2.53A9.79 9.79 0 0 0 12 21.7Z"/><path fill="currentColor" opacity=".64" d="M6.52 13.78A5.9 5.9 0 0 1 6.21 12c0-.62.11-1.22.31-1.78V7.69H3.26A9.7 9.7 0 0 0 2.2 12c0 1.56.37 3.03 1.06 4.31l3.26-2.53Z"/><path fill="currentColor" opacity=".46" d="M12 6.19c1.44 0 2.72.49 3.73 1.45l2.81-2.81A9.42 9.42 0 0 0 12 2.3a9.79 9.79 0 0 0-8.74 5.39l3.26 2.53C7.29 7.91 9.45 6.19 12 6.19Z"/></svg>}

export default function Login(){
 const[email,setEmail]=useState('');
 const[password,setPassword]=useState('');
 const[msg,setMsg]=useState('');
 const[loading,setLoading]=useState(false);
 const[mode,setMode]=useState('login');
 const supabase=createClient();
 const[checkoutReturn,setCheckoutReturn]=useState(false);
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('checkout')==='success'){setCheckoutReturn(true);setMode('signup')}},[]);

 async function submit(e){
  e.preventDefault();setLoading(true);setMsg('');
  if(mode==='recovery'){
   const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/update-password'});
   setLoading(false);setMsg(error?error.message:'Recovery link sent. Check your email inbox and spam folder.');return;
  }
  if(mode==='signup'){
   if(password.length<8){setMsg('Use at least 8 characters for your password.');setLoading(false);return}
   const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/login'}});
   setLoading(false);
   if(error){setMsg(error.message);return}
   if(data?.session){window.location.href='/membership-required';return}
   setMsg('Check your email to verify your account, then sign in with the same email you used to pay.');return;
  }
  const{error}=await supabase.auth.signInWithPassword({email,password});
  if(error){setMsg(error.message);setLoading(false);return}
  window.location.href='/academy';
 }
 async function google(){
  setLoading(true);setMsg('');
  const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/academy'}});
  if(error){setMsg(error.message);setLoading(false)}
 }
 return <main className="authpage"><Link href="/" className="brand"><span>K4K</span> ACADEMY</Link><form onSubmit={submit}>
  <small>MEMBER ACCESS · K4K CORE</small>
  {checkoutReturn&&<div role='status' style={{background:'#caff3914',border:'1px solid #caff3966',borderRadius:10,padding:'14px 16px',margin:'18px 0',color:'#e8f6ce',lineHeight:1.55,fontSize:13}}><b>Thanks for joining K4K Academy.</b> Create your account using the same email you used at Stripe checkout, then verify your email to unlock the Viral Video Workflow. Already have an account? Switch to sign in below.</div>}
  <h1>{mode==='recovery'?<>RECOVER<br/><i>ACCESS.</i></>:mode==='signup'?<>CREATE<br/><i>ACCOUNT.</i></>:<>WELCOME<br/><i>BACK.</i></>}</h1>
  {mode!=='recovery'&&<><button type="button" className="googleAuth" onClick={google} disabled={loading}><GoogleMark/> Continue with Google</button><div className="authDivider"><span/>OR USE EMAIL<span/></div></>}
  <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"/></label>
  {mode!=='recovery'&&<label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>}
  {msg&&<p className="authmsg">{msg}</p>}
  <button disabled={loading}>{loading?'Please wait…':mode==='recovery'?'Send recovery email':mode==='signup'?'Create account':'Enter Academy'} {mode==='recovery'?<Mail/>:<ArrowRight/>}</button>
  {mode==='login'?<button type="button" className="forgotAuth" onClick={()=>{setMode('recovery');setMsg('')}}><KeyRound/> Forgot password?</button>:<button type="button" className="forgotAuth" onClick={()=>{setMode('login');setMsg('')}}>← Back to login</button>}
  {mode==='login'?<p>Already subscribed? <button type='button' className='forgotAuth' onClick={()=>{setMode('signup');setMsg('')}}>Create your account →</button></p>:mode==='signup'?<p>Already have an account? <button type='button' className='forgotAuth' onClick={()=>{setMode('login');setMsg('')}}>Sign in →</button></p>:null}
  <p>New to K4K? <Link href="/#join">Join the Academy</Link></p>
 </form></main>
}