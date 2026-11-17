'use client';
import {useState} from 'react';
import {createClient} from '../../../lib/supabase/client';
const LOGIN='/login?next='+encodeURIComponent('/k4k-app/higgsfield-connection');
export default function HiggsfieldConnectionPage(){
 const [working,setWorking]=useState(false),[result,setResult]=useState(null);
 async function testConnection(){
  if(working)return;
  setWorking(true);setResult(null);
  try{
   const {data:{session},error}=await createClient().auth.getSession();
   if(error||!session?.access_token){setResult({state:'sign_in_required'});return;}
   const response=await fetch('/api/higgsfield/connection',{method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token}});
   const payload=await response.json().catch(()=>({}));
   setResult({state:payload.state||payload.error||'unknown',authenticated:payload.credentialVerified===true,paidGenerationEnabled:false});
  }catch{setResult({state:'network_unavailable'});}
  finally{setWorking(false);}
 }
 return <main style={{maxWidth:660,margin:'64px auto',padding:24}}>
  <h1 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Higgsfield API connection — K4K QA</h1>
  <p style={{color:'#bac6ba',lineHeight:1.7}}>Owner-only, preview-only. This read-only test makes no paid generation request. An authenticated API credential does not verify funded balance, model access, credit settlement, or customer readiness.</p>
  <button disabled={working} type="button" onClick={testConnection} style={{marginTop:20,border:0,borderRadius:12,background:'#a3ff9b',color:'#142414',padding:'14px 22px',fontWeight:800,cursor:'pointer'}}>{working?'Checking…':'Test Higgsfield developer API'}</button>
  {result&&<section role="status" style={{marginTop:20,padding:18,border:'1px solid #597059',borderRadius:12}}>
   <p style={{fontWeight:800}}>Connection status: {result.state.replace(/_/g,' ')}</p>
   <p>Credential verified: {result.authenticated?'Yes (read-only endpoint)':'Not yet'}</p>
   <p>Paid production generation: Disabled pending integration verification</p>
   {result.state==='sign_in_required'&&<a href={LOGIN} style={{color:'#a3ff9b'}}>Sign in on this preview</a>}
  </section>}
 </main>;
}
