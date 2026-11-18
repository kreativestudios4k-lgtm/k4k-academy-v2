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
export default function CustomerCreativeGeneration({model,mode,prompt,aspect,duration,resolution,referenceCount=0,onModels,stayInWorkspace=false}){
 const [access,setAccess]=useState({}),[quote,setQuote]=useState(null),[jobs,setJobs]=useState([]),[busy,setBusy]=useState(false),[info,setInfo]=useState(''),[result,setResult]=useState(null);
 const lock=useRef(false),key=useRef(null);
 const enabled=access[model.id]===true&&(mode==='Text to video'||mode==='Text to image');
 useEffect(()=>{let alive=true;call({action:'models'}).then(v=>{if(alive){const availability=Object.fromEntries(v.models.map(m=>[m.id,m.enabled]));setAccess(availability);onModels?.(availability)}}).catch(()=>{if(alive){setAccess({});onModels?.({})}});call({action:'list'}).then(v=>{if(alive)setJobs(v.jobs||[])}).catch(()=>{});return()=>{alive=false}},[]);
 useEffect(()=>{setQuote(null);setResult(null);key.current=null;setInfo('')},[model.id,mode,prompt,aspect,duration,resolution]);
 if(!enabled)return <section className="kcs-generation-panel" aria-label="Generation availability">
  <button type="button" className="kcs-generate-primary" disabled aria-disabled="true">Generate · unavailable</button>
  <p style={{marginTop:8,fontSize:12,color:'#bcbec6'}}>Sign in and select a supported text-only workflow. Models without approved API access remain unavailable; no credits are charged.</p>
 </section>;
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
 return <section className="kcs-generation-panel" aria-label="Create and generate">
  <header className="kcs-generation-heading"><div><span>03 · CREATE</span><strong>Generate with {model.name}</strong></div><span className="kcs-generation-dot"/></header>
  <p style={{fontSize:13,lineHeight:1.6}}>{model.id==='seedance_2_5'?'Seedance 2.5 · Live text-to-video. 5-second 480p silent video. Fixed K4K price: 20 credits per video, maximum one submitted generation per account per UTC day. fal.ai bills K4K by generated tokens; the underlying provider cost may vary and this is not a provider cost guarantee.':model.id==='kling4_hf'?'Kling 4.0 through Higgsfield · 3–30 seconds · 720p or 1080p. The credit quote is based on output seconds and selected resolution. 1080p requests above the existing $5 provider cap are unavailable.':'Production generation · one 5-second 720p video or one 1K image. Your credit reservation appears before confirmation. Provider costs may vary.'} Failed provider jobs receive refunds only after authenticated confirmation.</p>
  {referenceCount>0&&<p style={{fontSize:13}}>This live text-generation workflow does not use uploaded reference images. Remove the reference images before proceeding; image editing and reference-to-video remain locked.</p>}
  {!quote?<button disabled={busy||referenceCount>0||prompt.trim().length<10} onClick={()=>attempt(async()=>{
   const q=await call({action:'quote',modelId:model.id,prompt,aspect,duration,resolution});setQuote(q);setInfo('Review the exact credit charge before confirming generation.');
  })} className="kcs-generate-primary">{busy?'Preparing…':'Generate'}</button>:
   <div>{quote.tokenBillingUnverified&&<p role="alert" style={{fontSize:13,color:'#fbdc95'}}>Seedance 2.5: 20 K4K credits for one 5-second silent video. One generation per account per UTC day. Provider costs depend on tokens and can differ from our fixed customer credit price.</p>}<p style={{fontSize:14}}><strong>{quote.credits} credits</strong> · reservation for one generation. {quote.tokenBillingUnverified?'K4K budget allocation (not measured provider cost)':'Estimated provider budget'}: ${quote.quotedProviderUsd.toFixed(2)} · quote expires in five minutes.</p>
    <button disabled={busy} onClick={()=>attempt(async()=>{
     const requestKey=key.current||crypto.randomUUID();key.current=requestKey;
     const v=await call({action:'submit',jobId:quote.jobId,quoteToken:quote.quoteToken,requestKey});
     setJobs(j=>[{id:quote.jobId,model:model.id,status:v.status,media_kind:model.kind,credits_quoted:quote.credits},...j.filter(x=>x.id!==quote.jobId)]);
     setQuote(null);setInfo(stayInWorkspace?'Generation submitted. You can check its progress here or open your private Library.':'Generation submitted. Opening your generations…');
     if(!stayInWorkspace)window.location.assign('/k4k-app/videos#creative-generations');
    })} className="kcs-generate-primary">{busy?'Submitting…':'Confirm & Generate · '+quote.credits+' credits'}</button>
    <button onClick={()=>{setQuote(null);key.current=null}} style={{marginLeft:10,padding:'11px 15px',borderRadius:8}}>Cancel</button>
   </div>}
  {jobs.some(j=>j.status==='processing'||j.status==='queued')&&<div className="kcs-job-status"><span>Generation in progress</span><button disabled={busy} onClick={()=>attempt(async()=>{const active=jobs.find(j=>j.status==='processing'||j.status==='queued');if(active)await refresh(active.id);})}>Check progress</button></div>}<a className="kcs-library-action" href="/k4k-app/videos">Open my generations</a>
  {info&&<p role="status" style={{fontSize:13}}>{info}</p>}
  {result&&<a href={result.url} target="_blank" rel="noopener noreferrer" style={{color:'#ececef',textDecoration:'underline'}}>Download private {result.kind}</a>}
 </section>;
}
