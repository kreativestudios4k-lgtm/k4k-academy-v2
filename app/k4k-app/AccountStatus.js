'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';

export default function AccountStatus(){
 const [state,setState]=useState({signedIn:false,balance:null,ready:false});
 useEffect(()=>{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)){
   setState({signedIn:false,balance:null,ready:true});return;
  }
  let alive=true;
  const client=createClient();
  async function refresh(){
   try{
    const {data:{user},error}=await client.auth.getUser();
    if(!alive)return;
    if(error||!user){setState({signedIn:false,balance:null,ready:true});return;}
    const {data:{session}}=await client.auth.getSession();
    if(!session||session.user.id!==user.id){if(alive)setState({signedIn:false,balance:null,ready:true});return;}
    const response=await fetch('/api/billing/account',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
    const wallet=response.ok?await response.json():null;
    if(alive)setState({signedIn:true,balance:wallet?.creditBalance??null,ready:true});
   }catch{if(alive)setState({signedIn:false,balance:null,ready:true})}
  }
  refresh();
  const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},15000);
  const {data:{subscription}}=client.auth.onAuthStateChange(()=>{
   // Read after the auth callback to avoid re-entering Supabase's auth lock.
   setTimeout(refresh,0);
  });
  return()=>{alive=false;clearInterval(timer);subscription.unsubscribe()};
 },[]);
 return <Link href={state.signedIn?'/k4k-app/credits':'/login?next=%2Fk4k-app%2Fcreator'} className="k4k-account-status" aria-label={state.signedIn?'View your credits':'Sign in to K4K APP'}>
  {state.signedIn?state.balance===null?'My credits':state.balance+' credits':state.ready?'Sign in':'Account'}
 </Link>;
}
