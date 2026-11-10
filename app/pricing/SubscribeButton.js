'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {stripeCheckoutDestination} from '../../lib/stripe-checkout-destination.mjs';
import {createClient} from '../../lib/supabase/client';

const MESSAGES={
 CURRENCY_REGION_MISMATCH:'Your region changed. Prices have been refreshed. Review the updated price and try again.',
 MEMBERSHIP_CHECK_UNAVAILABLE:'Your subscription status could not be checked. Please try again.',
 STRIPE_UNREACHABLE:'Stripe test checkout is temporarily unavailable. Please try again.',
 UNAUTHENTICATED:'Your session expired. Please sign in again.',
 ALREADY_SUBSCRIBED:'You already have an active membership.',
 UNAVAILABLE:'Checkout is not available right now. Please try again later.',
 LIVE_CHECKOUT_DISABLED:'Checkout is not available right now. Please try again later.',
};

export default function SubscribeButton({plan,currency='GBP',style}){
 const router=useRouter();
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');

 async function subscribe(){
  if(busy)return;
  setMessage('');
  setBusy(true);
  try{
   const supabase=createClient();
   const {data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token){
    window.location.href=`/login?next=${encodeURIComponent(`/k4k-app/credits`)}`;
    return;
   }
   const res=await fetch('/api/billing/checkout',{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
    body:JSON.stringify({plan,currency}),
   });
   const body=await res.json().catch(()=>({}));
   if(res.ok && body.url){
    window.location.assign(stripeCheckoutDestination(body.url));
    return;
   }
   if(body.error==='CURRENCY_REGION_MISMATCH')router.refresh();
   setMessage(MESSAGES[body.error]||'Something went wrong. Please try again.');
  }catch{
   setMessage('Something went wrong. Please try again.');
  }finally{
   setBusy(false);
  }
 }

 return <div>
  <button type="button" onClick={subscribe} disabled={busy} style={style}>{busy?'Opening checkout…':'Continue to TEST checkout'}</button>
  {message && <p role="alert" style={{color:'#ffb4b4',fontSize:13,marginTop:8}}>{message}</p>}
 </div>;
}
