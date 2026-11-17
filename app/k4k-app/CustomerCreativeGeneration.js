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
export default function CustomerCreativeGeneration({model,mode,prompt,aspect,referenceCount=0,onModels}){
 const [access,setAccess]=useState({}),[quote,setQuote]=useState(null),[jobs,setJobs]=useState([]),[busy,setBusy]=useState(false),[info,setInfo]=useState(''),[result,setResult]=useState(null);
 const lock=useRef(false),key=useRef(null);
 const enabled=access[model.id]===true&&(mode==='Text to video'||mode==='Text to image');
 useEffect(()=>{let alive=true;call({action:'models'}).then(v=>{if(alive){const availability=Object.fromEntries(v.models.map(m=>[m.id,m.enabled]));setAccess(availability);onModels?.(availability)}}).catch(()=>{if(alive){setAccess({});onModels?.({})}});call({action:'list'}).then(v=>{if(alive)setJobs(v.jobs||[])}).catch(()=>{});return()=>{alive=false}},[]);
 useEffect(()=>{setQuote(null);setResult(null);key.current=null;setInfo('')},[model.id,mode,prompt,aspect]);
 if(!enabled)return <p style={{marginTop:12,fontSize:13,color:'#c9d0cb'}}>To generate with this model, <a href="/login" style={{textDecoration:'underline'}}>sign in</a> and select the text-only workflow. Models without public approval remain unavailable.</p>;
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
  <p style={{fontSize:13,lineHeight:1.6}}>{model.id==='seedance_2_5'?'Seedance 2.5 · Live text-to-video. 5-second 480p silent video. Fixed K4K price: 20 credits per video, maximum one submitted generation per account per UTC day. fal.ai bills K4K by generated tokens; the underlying provider cost may vary and this is not a provider cost guarantee.':'Production generation · one 5-second 720p video or one 1K image. Your credit reservation appears before confirmation. Provider costs may vary.'} Failed provider jobs receive refunds only after authenticated confirmation.</p>
  {referenceCount>0&&<p style={{fontSize:13}}>This live text-generation workflow does not use uploaded reference images. Remove the reference images before proceeding; image editing and reference-to-video remain locked.</p>}
  {!quote?<button disabled={busy||referenceCount>0||prompt.trim().length<10} onClick={()=>attempt(async()=>{
   const q=await call({action:'quote',modelId:model.id,prompt,aspect});setQuote(q);setInfo('Quote ready. Review the credits before submitting.');
  })} style={{background:'#d6ff69',border:0,borderRadius:8,padding:'11px 15px',fontWeight:800,cursor:'pointer'}}>{busy?'Checking…':'Check credit cost'}</button>:
   <div>{quote.tokenBillingUnverified&&<p role="alert" style={{fontSize:13,color:'#fbdc95'}}>Seedance 2.5: 20 K4K credits for one 5-second silent video. One generation per account per UTC day. Provider costs depend on tokens and can differ from our fixed customer credit price.</p>}<p style={{fontSize:14}}><strong>{quote.credits} credits</strong> · reservation for one generation. {quote.tokenBillingUnverified?'K4K budget allocation (not measured provider cost)':'Estimated provider budget'}: ${quote.quotedProviderUsd.toFixed(2)} · quote expires in five minutes.</p>
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
