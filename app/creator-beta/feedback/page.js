'use client';
import {useState} from 'react';
import Link from 'next/link';
import {createClient} from '@supabase/supabase-js';

export default function CreatorFeedbackPage(){
 const [category,setCategory]=useState('bug');
 const [message,setMessage]=useState('');
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState(false);
 async function submit(event){
  event.preventDefault();setBusy(true);setStatus('');
  try{
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
   const key=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
   if(!url||!key) throw new Error('Creator feedback is not configured yet.');
   const client=createClient(url,key);
   const {data:{session}}=await client.auth.getSession();
   if(!session?.access_token) throw new Error('Please sign in to your Academy account first.');
   const res=await fetch('/api/creator-beta/feedback',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({category,message})});
   if(!res.ok){
    const body=await res.json().catch(()=>({}));
    if(res.status===403) throw new Error('Your account is not on the private creator invitation list.');
    if(res.status===503) throw new Error('Feedback is not enabled yet. Please try again after the beta opens.');
    throw new Error(body.error||'Unable to submit feedback.');
   }
   setMessage('');setStatus('Thank you. Your feedback has been submitted.');
  }catch(err){setStatus(err.message||'Feedback could not be submitted.');}
  finally{setBusy(false);}
 }
 return <main style={{minHeight:'100vh',background:'#0b0b10',color:'#f8f8fa',padding:'48px 20px',fontFamily:'system-ui,sans-serif'}}>
 <div style={{maxWidth:640,margin:'0 auto'}}>
 <Link href="/k4k-app" style={{color:'#bdbdfc'}}>← K4K APP</Link>
 <p style={{marginTop:48,color:'#a6a6ba',letterSpacing:2}}>PRIVATE CREATOR BETA</p>
 <h1 style={{fontSize:40,marginBottom:12}}>Help us build a better studio.</h1>
 <p style={{color:'#b7b7c6',lineHeight:1.6}}>For invited AI creators only. Tell us what works, what breaks and what you want to create next. Do not include passwords or private API keys.</p>
 <form onSubmit={submit} style={{display:'grid',gap:20,marginTop:32}}>
 <label style={{display:'grid',gap:8}}>Feedback type
 <select value={category} onChange={e=>setCategory(e.target.value)} style={{padding:14,background:'#1d1d28',color:'white',border:'1px solid #454557',borderRadius:8}}>
 <option value="bug">Bug or technical issue</option><option value="quality">Video quality</option><option value="workflow">Creator workflow</option><option value="suggestion">Feature suggestion</option>
 </select></label>
 <label style={{display:'grid',gap:8}}>Your feedback
 <textarea required minLength={10} maxLength={2000} rows={7} value={message} onChange={e=>setMessage(e.target.value)} placeholder="What happened? What did you expect?" style={{padding:14,background:'#1d1d28',color:'white',border:'1px solid #454557',borderRadius:8}}/>
 </label>
 <button disabled={busy||message.trim().length<10} type="submit" style={{padding:16,background:'#a6a1ff',color:'#111',fontWeight:700,border:0,borderRadius:9,cursor:'pointer'}}>{busy?'Sending…':'Submit feedback'}</button>
 <p aria-live="polite" role="status" style={{color:'#ddd'}}>{status}</p>
 </form>
 <p style={{color:'#999',marginTop:32}}>Generation credits, paid video rendering and affiliate payouts are not enabled as part of this feedback preview.</p>
 </div></main>;
}
