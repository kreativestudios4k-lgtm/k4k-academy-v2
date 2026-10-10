'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';

export default function GooglePasswordReminder(){
 const [eligible,setEligible]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 useEffect(()=>{
  let active=true;
  const supabase=createClient();
  supabase.auth.getUser().then(({data,error})=>{
   if(!active||error||!data?.user)return;
   const user=data.user;
   const providers=user.app_metadata?.providers||[];
   const googleLinked=providers.includes('google')||user.identities?.some(identity=>identity.provider==='google');
   if(googleLinked&&!user.user_metadata?.k4k_password_set)setEligible(true);
  }).catch(()=>{});
  return()=>{active=false};
 },[]);
 if(!eligible||dismissed)return null;
 return <section aria-label="Optional password setup" style={{border:'1px solid #caff3966',background:'#caff3910',borderRadius:14,padding:'18px 20px',margin:'0 0 25px',display:'flex',gap:16,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
  <div style={{flex:'1 1 250px'}}>
   <strong style={{color:'#caff39',fontSize:15}}>Signed in with Google? Create a backup password.</strong>
   <p style={{color:'#d1dbca',lineHeight:1.6,fontSize:13,margin:'8px 0 0'}}>Set a password once so you can also sign in with your email and password. Google login will continue to work. No new purchase or email link is required.</p>
  </div>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
   <Link href="/update-password" style={{display:'inline-block',background:'#caff39',color:'#101510',borderRadius:8,padding:'12px 15px',fontSize:12,fontWeight:900,textDecoration:'none'}}>CREATE PASSWORD →</Link>
   <button type="button" onClick={()=>setDismissed(true)} style={{background:'transparent',border:'1px solid #ffffff44',borderRadius:8,color:'#d1dbca',padding:'11px 13px',fontSize:12,cursor:'pointer'}}>Not now</button>
  </div>
 </section>;
}
