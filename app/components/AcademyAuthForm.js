'use client';

import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CheckCircle2,Eye,EyeOff,Lock,Mail,RefreshCw,ShieldCheck} from 'lucide-react';
import {createClient} from '../../lib/supabase/client';

const isEmail=(value)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
function GoogleIcon(){
 return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
  <path fill="#4285F4" d="M21.35 12.18c0-.64-.06-1.25-.17-1.84H12v3.48h5.25a4.49 4.49 0 0 1-1.95 2.94v2.26h3.16c1.85-1.7 2.89-4.21 2.89-6.84Z"/>
  <path fill="#34A853" d="M12 21.7c2.64 0 4.86-.88 6.48-2.38l-3.16-2.45c-.88.59-2 .94-3.32.94-2.55 0-4.71-1.72-5.48-4.03H3.26v2.53A9.79 9.79 0 0 0 12 21.7Z"/>
  <path fill="#FBBC05" d="M6.52 13.78A5.9 5.9 0 0 1 6.21 12c0-.62.11-1.22.31-1.78V7.69H3.26A9.7 9.7 0 0 0 2.2 12c0 1.56.37 3.03 1.06 4.31l3.26-2.53Z"/>
  <path fill="#EA4335" d="M12 6.18c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.86 3.27 14.64 2.3 12 2.3a9.78 9.78 0 0 0-8.74 5.39l3.26 2.53Z"/>
 </svg>;
}

export default function AcademyAuthForm({mode='login',sessionId=''}) {
 const registering=mode==='register';
 const [email,setEmail]=useState('');
 const [name,setName]=useState('');
 const [password,setPassword]=useState('');
 const [confirmation,setConfirmation]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [lookup,setLookup]=useState(registering?'loading':'not-needed');
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');

 const verifyCheckout=useCallback(async()=>{
  if(!registering||!sessionId)return;
  setLookup('loading');setError('');
  try{
   const supabase=createClient();
   const {data,error:verifyError}=await supabase.functions.invoke('academy-checkout-email',{
    body:{session_id:sessionId}
   });
   if(verifyError||!data){setLookup('unavailable');return}
   if(data.verified===true&&typeof data.email==='string'&&isEmail(data.email)){
    setEmail(data.email.trim().toLowerCase());setLookup('verified');return;
   }
   setLookup(data.expired?'expired':data.need_support?'unavailable':'pending');
  }catch{setLookup('unavailable')}
 },[registering,sessionId]);

 useEffect(()=>{if(registering)verifyCheckout()},[registering,verifyCheckout]);

 async function submit(event){
  event.preventDefault();if(busy)return;
  setError('');setMessage('');
  const address=email.trim().toLowerCase();
  if(!isEmail(address)){setError('Enter a valid email address.');return}
  if(registering){
   if(lookup!=='verified'){setError('Your payment has not been verified yet. Please retry verification.');return}
   const cleanName=name.trim().replace(/\s+/g,' ');
   if(cleanName.length<2||cleanName.length>90){setError('Please enter your full name.');return}
   if(password.length<8){setError('Your password must contain at least 8 characters.');return}
   if(password!==confirmation){setError('Passwords do not match.');return}
  }else if(!password){setError('Enter your password.');return}
  setBusy(true);
  try{
   const supabase=createClient();
   if(registering){
    // Check again immediately before creating the account. User-supplied
    // checkout URLs never activate a subscription or give course access.
    const {data:check,error:checkError}=await supabase.functions.invoke('academy-checkout-email',{
     body:{session_id:sessionId}
    });
    if(checkError||check?.verified!==true||check.email?.toLowerCase()!==address){
     setLookup('pending');throw new Error('Payment verification is not ready. Please retry in a moment.');
    }
    const {data,error:signUpError}=await supabase.auth.signUp({
     email:address,password,
     options:{
      emailRedirectTo:window.location.origin+'/auth/callback',
      data:{full_name:name.trim().replace(/\s+/g,' ')}
     }
    });
    if(signUpError)throw signUpError;
    setPassword('');setConfirmation('');
    if(data?.session){
     window.location.assign('/membership-required');return;
    }
    setMessage('Your account request has been submitted. Check your email for a confirmation link, then sign in. Your paid subscription will be connected automatically when the verified email matches.');
    return;
   }
   const {data,error:loginError}=await supabase.auth.signInWithPassword({email:address,password});
   if(loginError)throw loginError;
   const next=data?.user?.user_metadata?.k4k_temp_password?'/update-password':address==='hello@kreativestudios4k.com'?'/admin':'/membership-required';
   window.location.assign(next);
  }catch(err){
   const reason=String(err?.message||'');
   if(/already.registered|already.exists|user.already/i.test(reason)){
    setError('This email already has an account. Sign in or reset your password—do not pay again.');
   }else if(/invalid.login.credentials|invalid_credentials|invalid login credentials/i.test(reason)){
    setError('Incorrect email or password. Try again or reset your password.');
   }else if(/email.not.confirmed/i.test(reason)){
    setError('Please confirm your email using the link in your inbox, then sign in.');
   }else if(/rate.limit|too many|429/i.test(reason)){
    setError('Too many attempts. Please try again a little later.');
   }else{
    setError(reason.startsWith('Payment verification')?reason:'We could not complete this request. Please try again or contact support.');
   }
  }finally{setBusy(false)}
 }

 async function google(){
  if(busy)return;
  setError('');setBusy(true);
  try{
   const supabase=createClient();
   const {error:oauthError}=await supabase.auth.signInWithOAuth({
    provider:'google',options:{redirectTo:window.location.origin+'/auth/callback',queryParams:{prompt:'select_account'}}
   });
   if(oauthError)throw oauthError;
  }catch{setError('Google login could not be started. Please use your email and password.');setBusy(false)}
 }

 return <main className="k4k-auth-page">
  <header className="k4k-auth-header">
   <Link className="k4k-auth-brand" href="/" aria-label="K4K Academy home">K4K<span>✳</span> <small>ACADEMY</small></Link>
   <Link href="/" className="k4k-auth-back">Home <ArrowRight size={15}/></Link>
  </header>
  <div className="k4k-auth-centre">
   <section className="k4k-auth-card" aria-label={registering?'Create paid Academy account':'Member sign in'}>
    <div className="k4k-auth-icon">{registering?<Mail size={25}/>:<Lock size={25}/>}</div>
    <div className="k4k-auth-step">{registering?(lookup==='verified'?'STEP 2 OF 2 · PAYMENT VERIFIED':'STEP 2 OF 2 · VERIFYING PAYMENT'):'K4K ACADEMY · MEMBERS AREA'}</div>
    <h1>{registering?'Create your account':'Welcome back'}</h1>
    <p className="k4k-auth-subtitle">{registering?'Your email comes from your secure checkout. Choose a name and password to finish.':'Log in with the email you used to buy the course.'}</p>

    {registering&&lookup!=='verified'&&<div className="k4k-auth-verify" role="status">
     {lookup==='loading'?<><RefreshCw size={19} className="k4k-auth-spin"/>Checking your Stripe payment…</>:
      <><span>{lookup==='pending'?'Your payment is still being confirmed.':'We could not retrieve your checkout email automatically.'} No second payment is needed.</span>
       <button type="button" onClick={verifyCheckout}>Check again <RefreshCw size={15}/></button>
       <a href="mailto:hello@kreativestudios4k.com?subject=Paid%20Academy%20registration%20help">Already paid? Get help</a>
      </>}
    </div>}
    {registering&&lookup==='verified'&&<p className="k4k-auth-success"><CheckCircle2 size={17}/> Payment confirmed. Your email is filled in.</p>}
    {message&&<p className="k4k-auth-success" role="status"><CheckCircle2 size={17}/>{message}</p>}
    {error&&<p className="k4k-auth-error" role="alert">{error}</p>}

    {(!registering||lookup==='verified')&&<form className="k4k-auth-form" onSubmit={submit}>
     {registering&&<>
      <label htmlFor="academy-full-name">Full name</label>
      <input id="academy-full-name" name="name" type="text" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={90} placeholder="Your full name" disabled={busy}/>
     </>}
     <label htmlFor="academy-email">{registering?'Email from your payment':'Email address'}</label>
     <input id="academy-email" name="email" type="email" autoComplete="email" value={email} onChange={registering?undefined:e=>setEmail(e.target.value)} readOnly={registering} required placeholder="name@example.com" disabled={busy}/>
     {registering&&<p className="k4k-auth-inline-note">Automatically matched to your Stripe purchase. You won't be charged again.</p>}
     <div className="k4k-auth-label-row"><label htmlFor="academy-password">Password</label>{!registering&&<Link href="/reset-password">Forgot password?</Link>}</div>
     <div className="k4k-auth-password">
      <input id="academy-password" type={showPassword?'text':'password'} autoComplete={registering?'new-password':'current-password'} minLength={registering?8:undefined} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={registering?'Minimum 8 characters':'Enter your password'} disabled={busy}/>
      <button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(s=>!s)}><>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</></button>
     </div>
     {registering&&<>
      <label htmlFor="academy-password-confirm">Confirm password</label>
      <input id="academy-password-confirm" type={showPassword?'text':'password'} autoComplete="new-password" required minLength={8} value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder="Repeat your password" disabled={busy}/>
     </>}
     <button className="k4k-auth-submit" type="submit" disabled={busy}>{busy?'Please wait…':registering?'Create account':'Log in'}<ArrowRight size={18}/></button>
    </form>}

    {!registering&&<div className="k4k-auth-google-wrap">
     <div className="k4k-auth-divider"><span>or</span></div>
     <button className="k4k-auth-google" type="button" disabled={busy} onClick={google}><GoogleIcon/> Continue with Google</button>
    </div>}
    <p className="k4k-auth-footer">
     {registering?<>Already have an Academy account? <Link href="/login">Log in</Link></>:<>New to K4K Academy? <Link href="/">Buy the course first</Link></>}
    </p>
    {registering&&<p className="k4k-auth-policy">By registering you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>. Membership access requires a verified email and active subscription.</p>}
   </section>
   <p className="k4k-auth-support"><ShieldCheck size={16}/> Already paid but need help? <a href="mailto:hello@kreativestudios4k.com">Contact Academy support</a>. Don't pay twice.</p>
  </div>
 </main>;
}
