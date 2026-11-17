'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '../../lib/supabase/client';
async function call(body){
 const {data:{session}}=await createClient().auth.getSession();
 if(!session?.access_token)throw Error('Sign in to generate.');
 const r=await fetch('/api/creative/customer',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify(body),cache:'no-store'});
 const json=await r.json();
 if(!r.ok||json.error)throw Error(json.error||'Generation unavailable');
 return json;
}
export default function CustomerCreativeGeneration({model,mode,prompt,aspect}){
 const [access,setAccess]=useState({}),[quote,setQuote]=useState(null),[jobs,setJobs]=useState([]),[busy,setBusy]=useState(false),[info,setInfo]=useState(''),[result,setResult]=useState(null);
 const lock=useRef(false),key=useRef(null);
 const enabled=access[model.id]===true&&(mode==='Text to video'||mode==='Text to image');
 useEffect(()=>{let alive=true;call({action:'models'}).then(v=>{if(alive)setAccess(Object.fromEntries(v.models.map(m=>[m.id,m.enabled]))) }).catch(()=>{if(alive)setAccess({})});call({action:'list'}).then(v=>{if(alive)setJobs(v.jobs||[])}).catch(()=>{});return()=>{alive=false}},[]);
 useEffect(()=>{setQuote(null);setResult(null);key.current=null;setInfo('')},[model.id,mode,prompt,aspect]);
 if(!enabled)return null;
 async function attempt(fn){
  if(lock.current)return;lock.current=true;setBusy(true);
  try{await fn()}catch(e){setInfo(e.message)}finally{lock.current=false;setBusy(false)}
 }
 async function refresh(jobId){
  const value=await call({action:'status',jobId});
  setJobs(old=>old.map(j=>j.id===jobId?{...j,status:value.status}:j));
  if(value.status==='completed'){
   const link=await call({action:'download',jobId,download:true});
   setResult({url:link.url,kind:model.kind});setInfo('Generation complete. Saved privately. Download link expires in two minutes.');
  }else if(value.status==='failed'){setInfo('Provider confirmed a failure. Reserved credits were refunded.')}
  else setInfo('Generation: '+value.status+' — refresh later to check completion.');
 }
 return <section className="kcs-note" style={{display:'block',marginTop:18,padding:19,border:'1px solid #c9e88a',borderRadius:14}}>
  <strong style={{fontSize:17}}>Generate with {model.name}</strong>
  <p style={{fontSize:13,lineHeight:1.6}}>Production customer generation · one 5-second 720p video or one 1K image. Your exact credit reservation is displayed before confirmation. Provider costs can vary; fixed model quote is priced conservatively. Failed provider jobs are refunded when confirmed.</p>
  {!quote?<button disabled={busy||prompt.trim().length<10} onClick={()=>attempt(async()=>{
   const q=await call({action:'quote',modelId:model.id,prompt,aspect});setQuote(q);setInfo('Quote ready. Review the credits before submitting.');
  })} style={{background:'#d6ff69',border:0,borderRadius:8,padding:'11px 15px',fontWeight:800,cursor:'pointer'}}>{busy?'Checking…':'Check credit cost'}</button>:
   <div><p style={{fontSize:14}}><strong>{quote.credits} credits</strong> · reservation for one generation. Price estimate: ${quote.quotedProviderUsd.toFixed(2)} provider budget · quote expires in five minutes.</p>
    <button disabled={busy} onClick={()=>attempt(async()=>{
     const requestKey=key.current||crypto.randomUUID();key.current=requestKey;
     const v=await call({action:'submit',jobId:quote.jobId,quoteToken:quote.quoteToken,requestKey});
     setJobs(j=>[{id:quote.jobId,model:model.id,status:v.status,media_kind:model.kind,credits_quoted:quote.credits},...j.filter(x=>x.id!==quote.jobId)]);
     setQuote(null);setInfo('Generation submitted. Use refresh to check its result.');
    })} style={{background:'#d6ff69',border:0,borderRadius:8,padding:'11px 15px',fontWeight:800,cursor:'pointer'}}>{busy?'Submitting…':'Confirm and generate · '+quote.credits+' credits'}</button>
    <button onClick={()=>{setQuote(null);key.current=null}} style={{marginLeft:10,padding:'11px 15px',borderRadius:8}}>Cancel</button>
   </div>}
  {jobs.slice(0,10).map(j=><div key={j.id} style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap',marginTop:8,fontSize:12}}><span>{j.model} · {j.status}</span><button disabled={busy} onClick={()=>attempt(()=>refresh(j.id))} style={{border:'1px solid #777',borderRadius:8,padding:'7px 10px'}}>Refresh / download</button></div>)}
  {info&&<p role="status" style={{fontSize:13}}>{info}</p>}
  {result&&<a href={result.url} target="_blank" rel="noopener noreferrer" style={{color:'#d6ff69',textDecoration:'underline'}}>Download private {result.kind}</a>}
 </section>;
}
