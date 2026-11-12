'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '../../lib/supabase/client';
import {getHiggsfieldKeyStatus,removeHiggsfieldApiKey,saveHiggsfieldApiKey} from './higgsfield-key-actions';

export default function HiggsfieldKeyManager(){
 const [signedIn,setSignedIn]=useState(false);
 const [ready,setReady]=useState(false);
 const [saved,setSaved]=useState(false);
 const [open,setOpen]=useState(false);
 const [apiKey,setApiKey]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const trigger=useRef(null),input=useRef(null),dialog=useRef(null);
 async function refresh(){
  try{
   const client=createClient();
   const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user){setSignedIn(false);setSaved(false);setReady(true);return;}
   setSignedIn(true);
   const status=await getHiggsfieldKeyStatus();
   setSaved(Boolean(status?.saved));
  }catch{setSignedIn(false);setSaved(false);}
  finally{setReady(true);}
 }
 useEffect(()=>{
  refresh();
  const client=createClient();
  const {data:{subscription}}=client.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});
  return()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{
  if(open){requestAnimationFrame(()=>input.current?.focus());}
  else{setApiKey('');setError('');setNotice('');trigger.current?.focus();}
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const onKeyDown=(event)=>{
   if(event.key==='Escape'){event.preventDefault();setOpen(false);}
   if(event.key==='Tab'&&dialog.current){
    const nodes=dialog.current.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]');
    const first=nodes[0],last=nodes[nodes.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  };
  window.addEventListener('keydown',onKeyDown);
  return()=>window.removeEventListener('keydown',onKeyDown);
 },[open]);
 if(!ready||!signedIn)return null;
 async function save(event){
  event.preventDefault();
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await saveHiggsfieldApiKey(apiKey);
   if(!result?.ok)throw new Error(result?.error==='SIGN_IN_REQUIRED'?'Sign in again before connecting your key.':'Paste the complete API key copied from Higgsfield, without adding an authorization prefix or spaces.');
   setSaved(true);setApiKey('');setNotice('API key saved in this browser. Saving does not verify that Higgsfield accepts the key.');
  }catch(e){setError(e?.message||'Could not save the API key.');}
  finally{setBusy(false);}
 }
 async function remove(){
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await removeHiggsfieldApiKey();
   if(!result?.ok)throw new Error('Sign in again before removing your key.');
   setSaved(false);setApiKey('');setNotice('API key removed from this browser.');
  }catch(e){setError(e?.message||'Could not remove the API key.');}
  finally{setBusy(false);}
 }
 return <>
  <button ref={trigger} type="button" className="k4k-hf-key-trigger" onClick={()=>setOpen(true)}>{saved?'Manage API key':'Connect API key'}</button>
  {open&&<div className="k4k-hf-key-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
   <section ref={dialog} className="k4k-hf-key-dialog" role="dialog" aria-modal="true" aria-labelledby="k4k-hf-key-title" aria-describedby="k4k-hf-key-description">
    <div className="k4k-hf-key-dialog-head"><div><span>K4K APP / PROVIDER</span><h2 id="k4k-hf-key-title">{saved?'Manage API key':'Connect API key'}</h2></div><button type="button" className="k4k-hf-key-close" onClick={()=>setOpen(false)} aria-label="Close API key dialog">×</button></div>
    <p id="k4k-hf-key-description">Paste the API key copied from open.higgsfield.ai. Paste it as-is.</p>
    {saved&&<p className="k4k-hf-key-saved" role="status">API key saved. Its validity has not been checked.</p>}
    <form onSubmit={save}>
     <label htmlFor="k4k-hf-api-key">{saved?'Replace API key':'API key'}</label>
     <input ref={input} id="k4k-hf-api-key" name="apiKey" type="password" autoComplete="off" spellCheck="false" maxLength={2048} value={apiKey} onChange={event=>setApiKey(event.target.value)} placeholder={saved?'Paste a replacement key':'Paste your complete API key'} required/>
     {error&&<p className="k4k-hf-key-error" role="alert">{error}</p>}
     {notice&&<p className="k4k-hf-key-notice" role="status">{notice}</p>}
     <div className="k4k-hf-key-actions"><button type="submit" disabled={busy||!apiKey.length}>{busy?'Saving…':saved?'Replace API key':'Connect API key'}</button>{saved&&<button type="button" className="k4k-hf-key-remove" disabled={busy} onClick={remove}>Remove API key</button>}</div>
    </form>
    <p className="k4k-hf-key-footnote">Your key is stored in an HTTP-only, browser-scoped cookie and is never written to local storage or returned to the page. Use your own Higgsfield account and keep your key private.</p>
   </section>
  </div>}
 </>;
}
