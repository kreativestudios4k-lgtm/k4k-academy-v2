'use client';
import {useState} from 'react';
import {createClient} from '../../lib/supabase/client';
const messages={
 CREDENTIAL_MISSING:'No Higgsfield API key is configured for this preview.',
 CREDENTIAL_INVALID:'The saved API key has an invalid format. Replace it with the complete copied key in the project settings.',
 CREDENTIALS_REJECTED:'Higgsfield rejected the saved credential.',
 REQUEST_NOT_FOUND_AUTH_NOT_PROVEN:'Higgsfield responded, but this check cannot confirm authentication. A verified request is still needed.',
 AUTH_NOT_PROVEN:'Higgsfield responded, but authentication remains unverified.',
 PROVIDER_UNREACHABLE:'Higgsfield could not be reached. Try again later.',
 UNAUTHENTICATED:'Please sign in again before checking the connection.',
 FORBIDDEN:'Only the K4K owner can check this connection.',
 PREVIEW_ONLY:'This check is available in the preview environment only.'
};
export default function HiggsfieldConnection(){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('Check the saved server credential without generating media.');
 async function check(){
  if(busy)return;
  setBusy(true);setMessage('Checking Higgsfield…');
  try{
   const {data:{session},error}=await createClient().auth.getSession();
   if(error||!session){setMessage(messages.UNAUTHENTICATED);return;}
   const response=await fetch('/api/generation/provider-auth-check',{cache:'no-store'});
   const result=await response.json();
   setMessage(result.authenticated?'Higgsfield authentication and a non-generating estimate are verified.':messages[result.error||result.interpretation]||'The connection could not be verified. Try again later.');
  }catch{setMessage('The connection could not be checked. Try again later.');}
  finally{setBusy(false);}
 }
 return <section aria-labelledby="higgsfield-heading" style={{marginTop:32,padding:24,border:'1px solid #34402b',borderRadius:16,background:'#1a2017'}}>
  <h2 id="higgsfield-heading" style={{marginTop:0}}>Higgsfield connection</h2>
  <p role="status" aria-live="polite" style={{color:'#cbd5c4'}}>{message}</p>
  <button type="button" disabled={busy} onClick={check} style={{padding:'12px 18px',borderRadius:8,border:0,background:'#caff39',color:'#0d100d',fontWeight:800,cursor:busy?'wait':'pointer'}}>{busy?'Checking…':'Check Higgsfield connection'}</button>
 </section>;
}
