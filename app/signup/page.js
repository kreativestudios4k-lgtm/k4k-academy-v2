'use client';
import {useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import '../kx-redesign.css';

export default function SignUp(){
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 async function submit(event){
  event.preventDefault();
  if(busy)return;
  setError('');setMessage('');
  const cleanName=name.trim().replace(/\s+/g,' ');
  const address=email.trim().toLowerCase();
  if(cleanName.length<2||cleanName.length>90){setError('Enter your full name.');return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){setError('Enter a valid email.');return;}
  if(password.length<8){setError('Use at least 8 characters for your password.');return;}
  setBusy(true);
  try{
   const supabase=createClient();
   const {data,error:signUpError}=await supabase.auth.signUp({
    email:address,password,
    options:{emailRedirectTo:window.location.origin+'/auth/callback',data:{full_name:cleanName}}
   });
   if(signUpError)throw signUpError;
   setPassword('');
   if(data?.session){window.location.assign('/pricing');return;}
   setMessage('Check your inbox to confirm your email. Then sign in and choose a plan. Registration does not activate a paid subscription or grant credits.');
  }catch(err){
   const reason=String(err?.message||'');
   setError(/rate.limit|too many|429/i.test(reason)?'Too many attempts. Try again later.':'Account creation was not completed. Please try again or sign in.');
  }finally{setBusy(false);}
 }
 return <main className="k4k-auth-page kx-auth">
  <header className="k4k-auth-header"><Link className="k4k-auth-brand" href="/">K4K APP</Link><Link className="k4k-auth-back" href="/pricing">View plans</Link></header>
  <div className="k4k-auth-centre"><section className="k4k-auth-card" aria-label="Create a K4K APP account">
   <div className="k4k-auth-step">K4K APP · SELF-SERVICE REGISTRATION</div>
   <h1>Create your account</h1>
   <p className="k4k-auth-subtitle">Sign up first, then choose a monthly plan. Academy is included as an optional learning feature.</p>
   {error&&<p role="alert" className="k4k-auth-error">{error}</p>}
   {message&&<p role="status" className="k4k-auth-success">{message}</p>}
   <form className="k4k-auth-form" onSubmit={submit}>
    <label htmlFor="signup-name">Full name</label><input id="signup-name" autoComplete="name" required minLength={2} maxLength={90} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/>
    <label htmlFor="signup-email">Email</label><input id="signup-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/>
    <label htmlFor="signup-password">Password</label><input id="signup-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/>
    <button className="k4k-auth-submit" type="submit" disabled={busy}>{busy?'Creating account…':'Create account'}</button>
   </form>
   <p className="k4k-auth-footer">Already registered? <Link href="/login">Sign in</Link></p>
   <p className="k4k-auth-policy">Credits and generation are only available after a verified paid subscription. No charge is made during registration.</p>
  </section></div>
 </main>;
}
