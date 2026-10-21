'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {ArrowRight,CheckCircle2,Eye,EyeOff,LockKeyhole,Mail,ShieldCheck,UserRound} from 'lucide-react';

function GoogleIcon(){return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.18c0-.64-.06-1.25-.17-1.84H12v3.48h5.25a4.49 4.49 0 0 1-1.95 2.94v2.26h3.16c1.85-1.7 2.89-4.21 2.89-6.84Z"/><path fill="#34A853" d="M12 21.7c2.64 0 4.86-.88 6.48-2.38l-3.16-2.45c-.88.59-2 .94-3.32.94-2.55 0-4.71-1.72-5.48-4.03H3.26v2.53A9.79 9.79 0 0 0 12 21.7Z"/><path fill="#FBBC05" d="M6.52 13.78A5.9 5.9 0 0 1 6.21 12c0-.62.11-1.22.31-1.78V7.69H3.26A9.7 9.7 0 0 0 2.2 12c0 1.56.37 3.03 1.06 4.31l3.26-2.53Z"/><path fill="#EA4335" d="M12 6.18c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.86 3.27 14.64 2.3 12 2.3a9.78 9.78 0 0 0-8.74 5.39l3.26 2.53C7.29 7.9 9.45 6.18 12 6.18Z"/></svg>}

const emailOk=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const phoneOk=value=>{const clean=value.replace(/[\s()\-]/g,'');return /^\+?[0-9]{7,15}$/.test(clean)};

export default function Login({initialMode='login'}){
 const[mode,setMode]=useState(initialMode==='register'?'register':'login');
 const[name,setName]=useState('');
 const[email,setEmail]=useState('');
 const[phone,setPhone]=useState('');
 const[password,setPassword]=useState('');
 const[showPassword,setShowPassword]=useState(false);
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');
 const[error,setError]=useState('');
 const[checkoutReturn,setCheckoutReturn]=useState(false);
 const[magicOpen,setMagicOpen]=useState(false);
 const[magicSent,setMagicSent]=useState(false);

 useEffect(()=>{
  const query=new URLSearchParams(window.location.search);
  if(query.get('mode')==='register'||query.get('tab')==='register')setMode('register');
  setCheckoutReturn(query.get('checkout')==='success');
  if(query.has('error'))setError('We could not finish the last sign-in. Please try again.');
 },[]);
 function switchMode(next){setMode(next);setError('');setMessage('');setPassword('');setShowPassword(false);setMagicSent(false)}
 async function submit(event){
  event.preventDefault();
  if(busy)return;
  setError('');setMessage('');
  const address=email.trim().toLowerCase();
  if(!emailOk(address)){setError('Please enter a valid email address.');return}
  if(mode==='register'){
   const displayName=name.trim().replace(/\s+/g,' ');
   if(displayName.length<2||displayName.length>90){setError('Please enter your full name (2–90 characters).');return}
   if(!phoneOk(phone.trim())){setError('Enter a phone number with its country code, for example +44 7417 511745.');return}
   if(password.length<8){setError('Choose a password with at least 8 characters.');return}
  }
  if(!password){setError('Please enter your password.');return}
  setBusy(true);
  try{
   const supabase=createClient();
   if(mode==='register'){
    const displayName=name.trim().replace(/\s+/g,' ');
    const contactPhone=phone.trim();
    const {data,error:authError}=await supabase.auth.signUp({
     email:address,password,
     options:{
      emailRedirectTo:window.location.origin+'/auth/callback',
      data:{full_name:displayName,contact_phone:contactPhone}
     }
    });
    if(authError)throw authError;
    if(data?.session){
     window.location.replace('/membership-required');
     return;
    }
    setMessage('Check your inbox to confirm your email address, then sign in using the password you created. If you already had an account, choose Sign in or Forgot password instead. Your account registration does not make a new payment.');
    setPassword('');
   }else{
    const {data,error:authError}=await supabase.auth.signInWithPassword({email:address,password});
    if(authError)throw authError;
    window.location.replace(data?.user?.user_metadata?.k4k_temp_password?'/update-password':'/membership-required');
    return;
   }
  }catch(err){
   const reason=String(err?.message||'');
   if(/already.registered|already.exists|user.already/i.test(reason)){
    setError('An account already exists for that email. Select Sign in or reset your password; do not create another purchase.');
   }else if(/invalid.login.credentials|invalid_credentials|invalid login credentials/i.test(reason)){
    setError('Email or password not recognised. Check your details, use Forgot password or try Google sign-in.');
   }else if(/email.not.confirmed/i.test(reason)){
    setError('Please confirm the email address using the newest email in your inbox, then sign in.');
   }else if(/rate.limit|too many|429/i.test(reason)){
    setError('Too many attempts. Please wait a little before trying again.');
   }else{
    setError('We could not complete that request. Please try again or contact Academy support.');
   }
  }finally{setBusy(false)}
 }
 async function google(){
  setError('');setMessage('');setBusy(true);
  try{
   const supabase=createClient();
   const {error:authError}=await supabase.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:window.location.origin+'/auth/callback',queryParams:{prompt:'select_account'}}
   });
   if(authError)throw authError;
  }catch{setError('Google sign-in could not be started. Please try your email and password.');setBusy(false)}
 }
 async function magic(event){
  event.preventDefault();
  setError('');setMessage('');
  const address=email.trim().toLowerCase();
  if(!emailOk(address)){setError('Enter your account email above first.');return}
  setBusy(true);setMagicSent(false);
  try{
   const supabase=createClient();
   const {error:authError}=await supabase.auth.signInWithOtp({
    email:address,options:{emailRedirectTo:window.location.origin+'/auth/callback',shouldCreateUser:false}
   });
   if(authError)throw authError;
   setMagicSent(true);
  }catch(err){setError(/rate.limit|429|too many/i.test(String(err?.message||''))?'Please wait before requesting another email.':'Unable to send a secure link right now. Try your password or Google sign-in.');}
  finally{setBusy(false)}
 }

 return <main className="k4kAccount">
  <header className="k4kAccountHeader"><Link href="/" className="k4kAccountBrand">K4K<span>✳</span> <small>ACADEMY</small></Link><Link href="/" className="k4kAccountHome">BACK TO WEBSITE <ArrowRight size={15}/></Link></header>
  <div className="k4kAccountLayout">
   <section className="k4kAccountIntro"><div className="k4kAccountEyebrow"><span/> YOUR CREATOR ACCOUNT</div><h1>GOOD IDEAS<br/>START <em>HERE.</em></h1><p>A simple account for your K4K lessons, production methods, saved progress and billing access.</p>
    <div className="k4kAccountFeatures"><div><span>01</span> One account, your own password</div><div><span>02</span> Your existing subscription stays connected</div><div><span>03</span> Learn, practise and review your work</div></div>
    <div className="k4kAccountSafe"><ShieldCheck size={18}/><span>Already purchased? Use the email from your Stripe receipt. You do not need to pay again.</span></div>
   </section>
   <section className="k4kAccountPanel" aria-label="K4K Academy account">
    <div className="k4kAccountTabs" role="group" aria-label="Choose how to access your account">
      <button type="button" aria-pressed={mode==='login'} className={mode==='login'?'selected':''} onClick={()=>switchMode('login')}>SIGN IN</button>
      <button type="button" aria-pressed={mode==='register'} className={mode==='register'?'selected':''} onClick={()=>switchMode('register')}>CREATE ACCOUNT</button>
    </div>
    <div className="k4kAccountPanelHead"><span>YOUR MEMBER SPACE / K4K</span><h2>{mode==='login'?'Welcome back.':'Join the studio.'}</h2><p>{mode==='login'?'Enter your email and password to continue.':'Create your account with just a few details. You can join before or after subscribing.'}</p></div>
    {checkoutReturn&&<div className="k4kAccountNotice" role="status"><CheckCircle2 size={19}/> Thanks for your purchase. {mode==='login'?'Sign in':'Register'} using the same email you used at checkout. No second payment is needed.</div>}
    {message&&<div className="k4kAccountNotice" role="status"><Mail size={19}/>{message}</div>}
    {error&&<div className="k4kAccountError" role="alert">{error}</div>}
    <form className="k4kAccountForm" onSubmit={submit}>
     {mode==='register'&&<>
      <label htmlFor="account-name">FULL NAME</label>
      <input id="account-name" name="name" type="text" autoComplete="name" minLength={2} maxLength={90} required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" disabled={busy}/>
     </>}
     <label htmlFor="account-email">EMAIL ADDRESS</label>
     <input id="account-email" name="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" disabled={busy}/>
     {mode==='register'&&<>
      <label htmlFor="account-phone">PHONE NUMBER</label>
      <input id="account-phone" name="phone" type="tel" autoComplete="tel" maxLength={25} required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+44 7417 511745" disabled={busy}/>
      <p className="k4kAccountHint">Include the country code. Used only for account contact and support; not SMS verification or marketing.</p>
     </>}
     <div className="k4kAccountLabelRow"><label htmlFor="account-password">PASSWORD</label>{mode==='login'&&<Link href="/reset-password">Forgot password?</Link>}</div>
     <div className="k4kAccountPassword"><input id="account-password" name="password" type={showPassword?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?8:undefined} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='register'?'At least 8 characters':'Enter your password'} disabled={busy}/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>
     {mode==='register'&&<p className="k4kAccountHint">Use at least 8 characters. Your password is handled securely by our authentication provider.</p>}
     <button className="k4kAccountSubmit" type="submit" disabled={busy}>{busy?'PLEASE WAIT…':mode==='register'?'CREATE MY ACCOUNT':'SIGN IN'} <ArrowRight size={18}/></button>
    </form>
    {mode==='register'?<p className="k4kAccountPolicy">By creating an account, you agree to our <Link href="/terms">Terms</Link> and acknowledge our <Link href="/privacy">Privacy Policy</Link>. Registration is free; Academy lessons require an active membership.</p>:<p className="k4kAccountHint" style={{marginTop:17}}>New to K4K? <button type="button" className="k4kAccountTextButton" onClick={()=>switchMode('register')}>Create your account</button>.</p>}
    <div className="k4kAccountDivider"><span>OR</span></div>
    <button type="button" className="k4kAccountGoogle" onClick={google} disabled={busy}><GoogleIcon/> CONTINUE WITH GOOGLE</button>
    {mode==='login'&&<div className="k4kAccountFallback"><button type="button" onClick={()=>setMagicOpen(x=>!x)} aria-expanded={magicOpen}>{magicOpen?'HIDE EMAIL LINK OPTION':'NO PASSWORD YET? USE A SECURE EMAIL LINK'} <ArrowRight size={14}/></button>{magicOpen&&<form onSubmit={magic}><p>For existing accounts without a password. Enter your account email above, then request one sign-in link.</p><button type="submit" disabled={busy}>{busy?'SENDING…':'EMAIL ME A LOGIN LINK'}</button>{magicSent&&<p role="status" className="k4kAccountNotice">Check your inbox for the newest login email.</p>}</form>}</div>}
    <p className="k4kAccountHelp">Having trouble with an existing payment? <a href="mailto:hello@kreativestudios4k.com?subject=K4K%20Academy%20account%20support">Contact Academy support</a>. Don't pay again.</p>
   </section>
  </div>
  <footer className="k4kAccountBottom"><span>K4K ACADEMY / CREATE WITH INTENTION</span><span><LockKeyhole size={13}/> SECURE MEMBER ACCESS</span></footer>
 </main>;
}
