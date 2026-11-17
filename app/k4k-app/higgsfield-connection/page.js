'use client';
import {useState} from 'react';
import {createClient} from '../../../lib/supabase/client';
const LOGIN='/login?next='+encodeURIComponent('/k4k-app/higgsfield-connection');
export default function HiggsfieldConnectionPage(){
 const [working,setWorking]=useState(false),[result,setResult]=useState(null);
 const [testBusy,setTestBusy]=useState(false),[testResult,setTestResult]=useState(null);
 async function qaRequest(method){
  if(testBusy)return;
  if(method==='POST'&&!window.confirm('Submit ONE paid Higgsfield Genjutsu test? 4.13-second source billed as 5 seconds, 480p, estimated $1.59. No automatic retry.'))return;
  setTestBusy(true);
  try{
   const {data:{session}}=await createClient().auth.getSession();
   if(!session?.access_token)throw Error('SIGN_IN_REQUIRED');
   const response=await fetch('/api/higgsfield/first-paid-qa',{
    method,cache:'no-store',
    headers:{Authorization:'Bearer '+session.access_token,...(method==='POST'?{'Content-Type':'application/json'}:{})},
    ...(method==='POST'?{body:JSON.stringify({confirmation:'RUN_ONE_5_SECOND_480P_TEST'})}:{})
   });
   const payload=await response.json().catch(()=>({error:'INVALID_RESPONSE'}));
   setTestResult({...payload,httpStatus:response.status});
  }catch(error){setTestResult({error:error?.message||'NETWORK_UNAVAILABLE'})}
  finally{setTestBusy(false)}
 }
 async function testConnection(){
  if(working)return;
  setWorking(true);setResult(null);
  try{
   const {data:{session},error}=await createClient().auth.getSession();
   if(error||!session?.access_token){setResult({state:'sign_in_required'});return;}
   const response=await fetch('/api/higgsfield/connection',{method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token}});
   const payload=await response.json().catch(()=>({}));
   setResult({state:payload.state||payload.error||'unknown',authenticated:payload.credentialVerified===true,attempts:Array.isArray(payload.attempts)?payload.attempts:[],paidGenerationEnabled:false});
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
   {result.attempts?.length>0&&<ul style={{paddingLeft:20}}>{result.attempts.map(a=><li key={a.source}>{a.source==='pilot'?'K4K preview API credential':'Higgsfield SDK credential'}: {String(a.state).replace(/_/g,' ')}</li>)}</ul>}
   {!result.authenticated&&result.attempts?.length>0&&<p style={{color:'#ffb9b9'}}>No valid K4K developer API credential has been confirmed. An SDK credential returning 401 must be replaced. A preview credential showing invalid format or not configured needs a complete developer API key in the Vercel preview environment. Do not paste credentials into chat or place them in browser-visible settings.</p>}
   <p>Paid production generation: Disabled pending integration verification</p>
   {result.authenticated&&<div style={{marginTop:20,paddingTop:18,borderTop:'1px solid #597059'}}>
    <h2 style={{fontSize:20,fontWeight:800}}>Owner-only first paid Genjutsu QA</h2>
    <p style={{fontSize:14}}>Video: 4.13 seconds (billed as 5) · 480p · estimated $1.59. The uploaded footballer and presenter reference photos are included. This is one irreversible sandbox API submission attempt, not a customer generation.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:14}}>
     <button disabled={testBusy} type="button" onClick={()=>qaRequest('POST')} style={{background:'#a3ff9b',border:0,color:'#142414',padding:'12px 16px',fontWeight:800,borderRadius:10}}>Run one paid $1.59 test</button>
     <button disabled={testBusy} type="button" onClick={()=>qaRequest('GET')} style={{background:'transparent',border:'1px solid #a3ff9b',color:'#a3ff9b',padding:'12px 16px',fontWeight:800,borderRadius:10}}>Check generation status</button>
    </div>
    {testResult&&<div role="status" style={{marginTop:14,padding:12,border:'1px solid #466046',borderRadius:10}}>
     <p><strong>Generation:</strong> {testResult.state||testResult.error||'unknown'}</p>
     {testResult.requestId&&<p>Request ID: {testResult.requestId}</p>}
     {testResult.estimatedCostUsd&&<p>Estimated API cost: ${testResult.estimatedCostUsd}</p>}
     {testResult.noRetry&&<p>No automatic retry will occur. Please check the provider request before attempting anything else.</p>}
     {testResult.providerStatus&&<p>Provider status: {testResult.providerStatus}</p>}
     {testResult.providerErrorCode&&<p>Provider error: {testResult.providerErrorCode}</p>}
     {testResult.providerErrorMessage&&<p>Failure reason: {testResult.providerErrorMessage}</p>}
     {testResult.diagnostic==='NO_DETAIL_RETURNED'&&<p>Higgsfield did not return a detailed failure reason. No retry has been performed.</p>}
     {testResult.videoUrl&&<a href={testResult.videoUrl} target="_blank" rel="noreferrer" style={{color:'#a3ff9b'}}>View generated test video</a>}
    </div>}
   </div>}
   {result.state==='sign_in_required'&&<a href={LOGIN} style={{color:'#a3ff9b'}}>Sign in on this preview</a>}
  </section>}
 </main>;
}
