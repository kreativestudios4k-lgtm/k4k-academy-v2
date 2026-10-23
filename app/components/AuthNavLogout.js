'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,LogOut} from 'lucide-react';
import {createClient} from '../../lib/supabase/client';

// One source of truth for both login and logout links.
// There is never a state where "LOG OUT" and "STUDENT LOGIN" appear together.
export default function AuthNavLogout({mobile=false,hero=false,footer=false,privateArea=false,heroLoginText='Already a member? Sign in',heroStudioText='Go to your studio'}){
 const [state,setState]=useState('loading');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  const supabase=createClient();
  supabase.auth.getUser().then(({data,error:authError})=>{
   if(active)setState(!authError&&Boolean(data?.user)?'signed-in':'signed-out');
  }).catch(()=>{if(active)setState('signed-out')});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(active)setState(session?.user?'signed-in':'signed-out');
  });
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 async function logout(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const supabase=createClient();
   const {error:authError}=await supabase.auth.signOut();
   if(authError)throw authError;
   window.location.replace('/login');
  }catch{
   setError('Could not log out. Try again.');
   setBusy(false);
  }
 }
 if(state==='loading')return null;
 if(hero)return <Link className="k4k3d-signin" href={state==='signed-in'?'/academy':'/login'}>
  {state==='signed-in'?heroStudioText:heroLoginText} <ArrowUpRight size={14}/>
 </Link>;
 if(footer)return <Link href={state==='signed-in'?'/academy':'/login'}>{state==='signed-in'?'YOUR STUDIO':'STUDENT LOGIN'} <ArrowUpRight size={16}/></Link>;
 if(state==='signed-out')return mobile
  ?<Link href="/login">STUDENT LOGIN</Link>
  :<Link className="idea-nav-cta" href="/login">STUDENT LOGIN <ArrowUpRight size={15}/></Link>;
 const logOutButton=<button type="button" className="idea-logout-button" onClick={logout} disabled={busy} aria-label={busy?'Signing out':'Log out of K4K Academy'}>
  <LogOut size={15}/>{busy?'SIGNING OUT…':'LOG OUT'}
 </button>;
 return mobile
  ?<span className="idea-logout-mobile">
    {!privateArea&&<Link href="/academy">YOUR STUDIO</Link>}
    {logOutButton}
    {error&&<small role="alert" className="idea-logout-error">{error}</small>}
   </span>
  :<span className="idea-session-actions">
    <Link className="idea-nav-cta" href="/academy">YOUR STUDIO <ArrowUpRight size={15}/></Link>
    <span className="idea-logout-wrap">{logOutButton}{error&&<small role="alert" className="idea-logout-error">{error}</small>}</span>
   </span>;
}
