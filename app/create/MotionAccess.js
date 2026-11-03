'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '@supabase/supabase-js';
export default function MotionAccess({children}){
 const [state,setState]=useState('checking');
 useEffect(()=>{
  let active=true;
  async function check(){
   try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!url||!key){if(active)setState('closed');return}
    const supabase=createClient(url,key);
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token){if(active)setState('closed');return}
    const res=await fetch('/api/creator-beta/access',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
    if(active)setState(res.ok?'invited':'closed');
   }catch{if(active)setState('closed')}
  }
  check();return()=>{active=false};
 },[]);
 if(state==='invited')return children;
 return <main style={{minHeight:'100vh',background:'#111216',color:'#f6f6f6',fontFamily:'Arial,sans-serif',padding:'40px 6%'}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'center'}}><Link href="/k4k-app" style={{color:'white',textDecoration:'none',fontSize:23,fontWeight:900}}>K4K APP</Link><Link href="/academy" style={{color:'#dfff00'}}>Student access →</Link></header>
  <section style={{maxWidth:740,margin:'15vh auto 0',textAlign:'center'}}>
   <p style={{color:'#dfff00',letterSpacing:3,fontSize:12}}>K4K MOTION</p>
   <h1 style={{fontSize:'clamp(42px,7vw,76px)',lineHeight:1.05,margin:'20px 0'}}>{state==='checking'?'Checking access…':'Coming soon.'}</h1>
   <p style={{fontSize:19,lineHeight:1.7,color:'#b7b7bf'}}>{state==='checking'?'Verifying your creator invitation.':'K4K Motion is being prepared for a small, invitation-only creator beta. Existing Academy students keep their current access and subscriptions.'}</p>
   {state==='closed'&&<div style={{display:'flex',justifyContent:'center',gap:14,flexWrap:'wrap',marginTop:30}}><Link href="/academy" style={{padding:'14px 22px',background:'#dfff00',color:'#111',borderRadius:9,textDecoration:'none',fontWeight:800}}>Go to my Academy</Link><Link href="/k4k-app" style={{padding:'14px 22px',border:'1px solid #666',color:'white',borderRadius:9,textDecoration:'none'}}>Explore K4K APP</Link></div>}
  </section>
 </main>;
}
