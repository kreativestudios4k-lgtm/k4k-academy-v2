'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '../../../lib/supabase/client';
const button={padding:'12px 18px',border:'1px solid #a1efa5',borderRadius:10,background:'#a1efa5',color:'#142015',fontWeight:800,cursor:'pointer'};
const messages={TOO_MANY_QUOTES:'Too many quotes. Please wait ten minutes before preparing another.',NOT_AVAILABLE:'K4K Motion is not available for this account yet.',INSUFFICIENT_CREDITS:'Your balance is too low for this video.',PROVIDER_BUDGET_BLOCKED:'This quality or duration exceeds the current per-video spending limit. Try a shorter video or lower resolution.',QUOTE_EXPIRED:'Your quote expired. Prepare a new quote.',PROVIDER_SUBMISSION_UNCERTAIN:'Submission needs review. Do not submit another video; use Refresh status.',DRAFT_ALREADY_EXISTS:'This draft already exists. Check your recent jobs before preparing another.',HIGGSFIELD_CUSTOMER_DISPATCH_DISABLED:'Generation is not enabled for this preview yet.',HIGGSFIELD_UNAVAILABLE:'The connection is temporarily unavailable. Your existing jobs are saved.'};
async function request(action,input={}){
 const {data:{session}}=await createClient().auth.getSession();
 if(!session?.access_token)throw Error('Please sign in first.');
 const response=await fetch('/api/higgsfield/customer-jobs',{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,...input})});
 const body=await response.json();if(!response.ok)throw Error(messages[body.error]||body.error||'Unable to complete this request.');return body;
}
export default function CustomerGeneration({media,resolution,prompt,customer=false,libraryOnly=false,onBusyChange}){
 const [quote,setQuote]=useState(null),[jobs,setJobs]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[output,setOutput]=useState(null),[active,setActive]=useState(null);
 useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
 const lock=useRef(false),requestKey=useRef(null),account=useRef(undefined);
 const mediaKey=JSON.stringify(media);
 const selection=JSON.stringify([media,resolution,prompt]);
 useEffect(()=>{setQuote(null);requestKey.current=null;},[mediaKey,resolution,prompt]);
 async function refresh(){const rows=await request('list');setJobs(rows);return rows;}
 useEffect(()=>{
  let alive=true;
  request('list').then(rows=>{if(alive){setJobs(rows);setActive(rows.find(j=>j.status==='processing')?.jobId||null);}}).catch(()=>{});
  const {data:{subscription}}=createClient().auth.onAuthStateChange((_event,session)=>{
   const next=session?.user?.id||null;
   if(account.current!==undefined&&account.current!==next){window.location.reload();return;}
   account.current=next;
  });
  return ()=>{alive=false;subscription.unsubscribe();};
 },[]);
 async function action(fn){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e.message);}finally{lock.current=false;setBusy(false);}}
 async function check(jobId){
  const state=await request('status',{jobId});
  await refresh();
  if(state.status==='completed'){
   setOutput(await request('download',{jobId,download:false}));setActive(null);setMessage('Video ready. Your credits were settled once.');
  }else if(state.status==='failed'){setActive(null);setMessage('Generation failed. Reserved credits were refunded.');}
  else if(state.needsReview){setActive(null);setMessage('Submission needs review. Do not create another attempt.');}
  return state;
 }
 useEffect(()=>{
  if(!active)return;
  let stopped=false,timer;
  const poll=async()=>{
   if(stopped)return;
   try{const state=await check(active);if(!stopped&&state.status==='processing')timer=setTimeout(poll,12000);}
   catch(e){if(!stopped)setMessage(e.message+' Use Refresh status to check again.');}
  };
  timer=setTimeout(poll,12000);
  return ()=>{stopped=true;clearTimeout(timer);};
 },[active]);
 return <>
  {!libraryOnly&&<>
  <h2 style={{fontSize:20}}>04 · Generate with K4K Motion</h2>
  <label htmlFor="motion-prompt">Automatic character prompt</label>
  <textarea id="motion-prompt" value={prompt} readOnly rows={4} style={{display:'block',width:'100%',boxSizing:'border-box',margin:'10px 0',padding:12,background:'#080f0b',color:'#fff',border:'1px solid #658768',borderRadius:10}}/>
  <p style={{fontSize:13,color:'#b5c6b7'}}>Upload and verify your files first. Preparing a quote sends the verified references to the generation provider. Credits are charged only when you press Generate.</p>
  <button type="button" style={button} disabled={busy||!media||!prompt.trim()} onClick={()=>action(async()=>{
   setQuote(null);const jobId=crypto.randomUUID();requestKey.current=crypto.randomUUID();
   const result=await request('prepare',{jobId,...media,resolution,prompt});setQuote({...result,selection});await refresh();
  })}>{busy?'Working…':'Prepare verified quote'}</button>
  {quote?.selection===selection&&<div style={{marginTop:18}}>
   <p><strong>{quote.credits} credits</strong> · {quote.duration} billed seconds · {quote.resolution}</p>
   <p style={{fontSize:13}}>{customer?'':`Provider estimate: $${quote.usd.toFixed(2)}. `}Quote expires in five minutes.</p>
   <button type="button" disabled={busy||!quote.dispatchEnabled} style={{...button,opacity:quote.dispatchEnabled?1:.5}} onClick={()=>action(async()=>{
    const current=quote;setQuote(null);
    try{const result=await request('submit',{jobId:current.jobId,quoteToken:current.quoteToken,requestKey:requestKey.current});setActive(result.jobId);setMessage('Generation submitted. You can return here to check its progress.');if(customer)window.location.assign('/k4k-app/videos');}
    finally{await refresh();}
   })}>{quote.dispatchEnabled?'Generate · '+quote.credits+' credits':'Generation locked · Preview'}</button>
  </div>}
  </>}
  {message&&<p role="status" style={{color:'#d8eecf'}}>{message}</p>}
  {output&&<video controls playsInline src={output.url} style={{maxWidth:'100%',maxHeight:500,marginTop:20}}/>}
  <h3 style={{marginTop:28}}>Your K4K Motion videos</h3>
  {!jobs.length&&<p style={{color:"#adbdaf"}}>Your generated Motion videos will appear here.</p>}
  <button type="button" style={button} disabled={busy} onClick={()=>action(refresh)}>Refresh library</button>
  {jobs.map(job=><div key={job.jobId} style={{padding:'16px 0',borderBottom:'1px solid #334b37',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
   <span>{new Date(job.createdAt).toLocaleString()} · {job.status} · {job.credits} credits</span>
   {['processing','queued'].includes(job.status)&&<button style={button} disabled={busy} onClick={()=>action(()=>check(job.jobId))}>Refresh status</button>}
   {job.status==='completed'&&<>
    <button style={button} disabled={busy} onClick={()=>action(async()=>setOutput(await request('download',{jobId:job.jobId,download:false})))}>Play</button>
    <button style={button} disabled={busy} onClick={()=>action(async()=>{const file=await request('download',{jobId:job.jobId,download:true});window.location.assign(file.url);})}>Download MP4</button>
   </>}
  </div>)}
 </>;
}
