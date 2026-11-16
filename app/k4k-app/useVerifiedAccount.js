'use client';
import {useEffect,useState} from 'react';
import {createClient} from '../../lib/supabase/client';
import {studioDestination} from '../../lib/customer-routes.mjs';
export function useVerifiedAccount(){
 const [state,setState]=useState({user:null,ready:false,error:false});
 useEffect(()=>{
  let alive=true,revision=0,timer;
  const client=createClient();
  async function refresh(){const version=++revision;
   try{const {data,error}=await client.auth.getUser();if(!alive||version!==revision)return;
    if(error&&error.name!=='AuthSessionMissingError'&&error.status!==401){setState(s=>({...s,ready:true,error:true}));return}
    setState({user:data?.user||null,ready:true,error:false});
   }catch{if(alive&&version===revision)setState(s=>({...s,ready:true,error:true}))}
  }
  const schedule=()=>{++revision;clearTimeout(timer);timer=setTimeout(refresh,0)};
  const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'){++revision;clearTimeout(timer);if(alive)setState({user:null,ready:true,error:false});return}
   if(alive)setState(s=>s.user&&s.user.id!==session?.user?.id?{user:null,ready:false,error:false}:s);
   schedule();
  });
  const onVisible=()=>{if(document.visibilityState==='visible')schedule()};
  refresh();window.addEventListener('pageshow',schedule);document.addEventListener('visibilitychange',onVisible);
  return()=>{alive=false;++revision;clearTimeout(timer);subscription.unsubscribe();window.removeEventListener('pageshow',schedule);document.removeEventListener('visibilitychange',onVisible)}
 },[]);
 return state;
}
export async function signOutK4K({switchAccount=false,next}={}){
 const {error}=await createClient().auth.signOut({scope:'local'});
 if(error)throw error;
 try{localStorage.removeItem('k4k-affiliate-draft-v1')}catch{}
 if(switchAccount)window.location.replace('/login?next='+encodeURIComponent(studioDestination(next)));
 else window.location.replace('/');
}
