'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../../../lib/supabase/client';
const endpoint='/api/admin/generation/reconcile';
export default function GenerationSupport(){
 const [jobs,setJobs]=useState([]),[notice,setNotice]=useState(''),[busy,setBusy]=useState(''),[access,setAccess]=useState('loading');
 const call=useCallback(async(method='GET',body)=>{
  const {data:{session}}=await createClient().auth.getSession();
  if(!session?.access_token)throw Error('Sign in with an administrator account.');
  const response=await fetch(endpoint,{method,headers:{Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(response.status===401||response.status===403)throw Error('Administrator access required.');
  if(!response.ok&&!data.reconciliationRequired)throw Error('Unable to check generation. No manual refund or retry was performed.');
  return data;
 },[]);
 const refresh=useCallback(async()=>{try{setNotice('');const data=await call();setJobs(data.jobs||[]);setAccess('ready')}catch(error){setJobs([]);setAccess('blocked');setNotice(error.message)}},[call]);
 useEffect(()=>{refresh()},[refresh]);
 async function reconcile(job){
  if(busy)return;setBusy(job.id);setNotice('');
  try{
   const result=await call('POST',{jobId:job.id});
   if(result.reconciliationRequired){setNotice('Provider request ID unavailable. Contact the provider using the K4K job ID and original submission timestamp. Do not retry or refund without confirmation.');return;}
   await refresh();setNotice('Provider-confirmed status: '+result.status+(result.creditsRefunded?' — reserved credits refunded.':''));
  }catch(error){setNotice(error.message)}finally{setBusy('')}
 }
 return <main style={{maxWidth:1050,margin:'48px auto',padding:24,color:'#f6f6f6',fontFamily:'system-ui'}}>
  <p style={{color:'#c7ff36',fontSize:12,letterSpacing:2}}>K4K APP · ADMIN SUPPORT</p><h1>Generation recovery</h1>
  <p style={{color:'#aaa',lineHeight:1.6}}>Review active jobs, check provider-confirmed outcomes, and reconcile reserved credits. No new generation requests are submitted here. Jobs without a provider request ID require manual provider investigation.</p>
  <div style={{display:'flex',gap:16,margin:'24px 0'}}><button onClick={refresh} disabled={!!busy} style={{padding:'10px 16px',background:'#c7ff36',color:'#111',border:0,borderRadius:8,cursor:'pointer'}}>Refresh jobs</button><Link href="/k4k-app/creator">Back to studio</Link></div>
  {notice&&<p role="status" style={{padding:16,background:'#242424',borderRadius:8}}>{notice}</p>}
  {access==='loading'?<p>Checking administrator access…</p>:access==='ready'?jobs.length===0?<p>No active jobs found.</p>:<div style={{display:'grid',gap:12}}>{jobs.map(job=><article key={job.id} style={{padding:20,border:'1px solid #333',borderRadius:12}}>
   <strong>{job.status.toUpperCase()} {job.stale?' · NEEDS REVIEW':''}</strong><p style={{fontSize:13,overflowWrap:'anywhere'}}>Job: {job.id}<br/>Owner: {job.user_id}<br/>Provider: {job.provider||'Unknown'}<br/>Provider request: {job.provider_job_id||'Missing'}<br/>Reserved credits: {job.credits_reserved}<br/>Updated: {new Date(job.updated_at||job.created_at).toLocaleString()}</p>
   {job.provider_job_id?<button disabled={!!busy} onClick={()=>reconcile(job)} style={{padding:'8px 12px',background:'#c7ff36',color:'#111',border:0,borderRadius:6}}>{busy===job.id?'Checking provider…':'Check provider and reconcile'}</button>:<p style={{color:'#fbbf24'}}>Manual investigation required. Do not submit again or refund without provider confirmation.</p>}
  </article>)}</div>:<Link href="/login?next=%2Fk4k-app%2Fcreator">Sign in</Link>}
 </main>
}
