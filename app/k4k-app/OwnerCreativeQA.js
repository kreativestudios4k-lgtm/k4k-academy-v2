'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '../../../lib/supabase/client';
const tests={
 seedance_2_5:{mode:'Text to video',name:'Seedance 2.5',reserve:4.50},
 kling4_0:{mode:'Text to video',name:'Kling 4.0',reserve:1.20},
 nano_banana_2:{mode:'Text to image',name:'Nano Banana 2.1',reserve:1.50},
 flux_3_image:{mode:'Text to image',name:'FLUX 3',reserve:0.50}
};
async function qaRequest(body=null){
 const {data:{session}}=await createClient().auth.getSession();
 if(!session?.access_token)throw Error('Sign in to your owner account.');
 const res=await fetch('/api/creative/owner-qa',{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const json=await res.json();
 if(!res.ok||json.error)throw Error(json.error||'QA request failed');
 return json;
}
export default function OwnerCreativeQA({model,mode,prompt,aspect}){
 const config=tests[model?.id];
 const supported=!!config&&config.mode===mode;
 const [enabled,setEnabled]=useState(false),[consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false),[jobs,setJobs]=useState([]),[message,setMessage]=useState(''),[output,setOutput]=useState(null);
 const busyRef=useRef(false),requestKey=useRef(null);
 useEffect(()=>{let active=true;qaRequest().then(v=>{if(active){setEnabled(v.enabled);setJobs(v.ownerTests||[])}}).catch(()=>{if(active)setEnabled(false)});return()=>{active=false}},[]);
 useEffect(()=>{setMessage('');setOutput(null);setConsent(false);requestKey.current=null},[model?.id,mode,prompt,aspect]);
 if(!enabled||!supported)return null;
 async function check(jobId){
  const v=await qaRequest({action:'status',jobId});
  setJobs(prev=>prev.map(j=>j.id===jobId?{...j,status:v.status==='completed'?'completed':['failed','review'].includes(v.status)?v.status:'submitted'}:j));
  if(v.status==='completed'){setOutput(v.url);setMessage('Completed. Output saved in your private K4K storage.')}
  else if(v.status==='failed'||v.status==='review')setMessage(v.status==='review'?'Provider submission needs manual review. Do not submit again.':'Provider generation failed. No customer credits were used.');
  else setMessage('Provider status: '+v.status);
  return v;
 }
 async function run(fn){
  if(busyRef.current)return;busyRef.current=true;setBusy(true);
  try{await fn()}catch(e){setMessage(e.message)}finally{busyRef.current=false;setBusy(false)}
 }
 const current=jobs.find(j=>['dispatching','submitted','review'].includes(j.status));
 return <section style={{marginTop:20,padding:20,border:'1px solid #78946e',borderRadius:15,background:'#152018',color:'#f4fff0'}}>
  <strong style={{fontSize:17}}>Owner QA · Real provider generation</strong>
  <p style={{fontSize:13,lineHeight:1.6}}>Private founder test for {config.name}. This sends one real request to fal.ai and may spend money from your provider balance. Your normal K4K credits are not charged. Only a 5-second 720p video (480p for Seedance), or one 1K image, is submitted. The budget reservation below is conservative and is <strong>not a guaranteed provider charge limit</strong>.</p>
  <p style={{fontSize:13}}>Test budget reservation: <strong>${config.reserve.toFixed(2)}</strong> · Maximum 3 tests per UTC day and 10 lifetime · One active test at a time</p>
  <label style={{display:'block',fontSize:13,margin:'12px 0'}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I authorize one billable provider test using my fal.ai account.</label>
  <button type="button" disabled={busy||!consent||prompt.trim().length<10||!!current} onClick={()=>run(async()=>{
   setOutput(null);setMessage('Submitting one real test…');
   const key=requestKey.current||crypto.randomUUID();requestKey.current=key;
   const value=await qaRequest({action:'start',modelKey:model.id,prompt,aspect,requestKey:key});
   if(value.jobId){setJobs(prev=>[{id:value.jobId,status:value.status,model_key:model.id},...prev.filter(x=>x.id!==value.jobId)]);setMessage(value.error||'Submitted: '+value.jobId)}
  })} style={{padding:'12px 18px',border:0,borderRadius:10,background:'#d6ff69',color:'#14191b',fontWeight:900,cursor:'pointer'}}>{busy?'Working…':'Run one real test · '+config.name}</button>
  {jobs.slice(0,4).map(job=><div key={job.id} style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:10,marginTop:12,fontSize:12}}><span>{job.model_key} · {job.status} · {job.id.slice(0,8)}</span><button type="button" disabled={busy} onClick={()=>run(()=>check(job.id))} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #9ab292',background:'#202b22',color:'white'}}>Refresh / get result</button></div>)}
  {message&&<p role="status" style={{fontSize:13}}>{message}</p>}
  {output&&<div style={{marginTop:12}}>{config.mode==='Text to image'?<img src={output} alt="Private K4K test result" style={{width:'100%',maxWidth:500,borderRadius:10}}/>:<video controls playsInline src={output} style={{width:'100%',maxWidth:520,borderRadius:10}}/>}<p><a href={output} target="_blank" rel="noopener noreferrer" style={{textDecoration:'underline',color:'#d6ff69'}}>Open private result (link expires in 10 minutes)</a></p></div>}
 </section>;
}
