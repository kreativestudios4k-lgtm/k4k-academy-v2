'use client';
import {useEffect,useState} from 'react';
import {LogOut} from 'lucide-react';
import {createClient} from '../../lib/supabase/client';

export default function AuthNavLogout({mobile=false}){
 const [signedIn,setSignedIn]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  const supabase=createClient();
  supabase.auth.getUser().then(({data})=>{if(active)setSignedIn(Boolean(data?.user))}).catch(()=>{});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(active)setSignedIn(Boolean(session?.user));
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
 if(!signedIn)return null;
 return <span className={mobile?'idea-logout-mobile':'idea-logout-wrap'}>
  <button type="button" className="idea-logout-button" onClick={logout} disabled={busy} aria-label={busy?'Signing out':'Log out of K4K Academy'}>
   <LogOut size={15}/>{busy?'SIGNING OUT…':'LOG OUT'}
  </button>
  {error&&<small role="alert" className="idea-logout-error">{error}</small>}
 </span>;
}
