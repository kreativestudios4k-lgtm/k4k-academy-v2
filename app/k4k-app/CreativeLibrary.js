'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '../../lib/supabase/client';
import {creativeLibraryJobs,creativeDownloadDestination} from '../../lib/creative-library.mjs';
import './creative-library.css';

const names={'seedance-25-t2v':'Seedance 2.5','kling-4-t2v':'Kling 4','nano-banana-21-t2i':'Nano Banana 2','flux3-t2i':'Flux 3'};
export default function CreativeLibrary(){
 const [jobs,setJobs]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[signedIn,setSignedIn]=useState(false);
 const epoch=useRef(0),lock=useRef(false),cursor=useRef(0);
 useEffect(()=>{
  let disposed=false,owner=null,timer;
  const client=createClient();
  async function refresh(){
   if(lock.current||disposed)return;
   lock.current=true;const version=epoch.current;
   try{
    const {data:{session}}=await client.auth.getSession();
    if(disposed||version!==epoch.current)return;
    if(!session){setSignedIn(false);setJobs([]);return;}
    owner=session.user.id;setSignedIn(true);
    const request=async body=>{const response=await fetch('/api/creative/customer',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body),cache:'no-store'});const value=await response.json();if(!response.ok||value.error)throw Error('Unable to update your image and video generations. Try Refresh.');return value;};
    const value=await request({action:'list'});
    if(disposed||version!==epoch.current)return;
    const visible=creativeLibraryJobs(value.jobs);setJobs(visible);setError('');
    const pending=visible.filter(job=>job.status==='processing');
    // Reconcile one job per cycle, rotating so older jobs are not starved.
    if(pending.length){const job=pending[cursor.current++%pending.length];const status=await request({action:'status',jobId:job.id});if(!disposed&&version===epoch.current)setJobs(old=>old.map(item=>item.id===job.id?{...item,status:status.status}:item));}
   }catch(e){if(!disposed&&version===epoch.current)setError(e.message)}
   finally{lock.current=false;if(!disposed){if(version===epoch.current)setLoading(false);else{clearTimeout(timer);timer=setTimeout(refresh,0);}}}
  }
  const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
   if(session?.user?.id!==owner){epoch.current++;owner=session?.user?.id||null;setJobs([]);setError('');setSignedIn(!!owner);setLoading(!!owner);clearTimeout(timer);timer=setTimeout(refresh,0);}
  });
  refresh();const poll=setInterval(()=>{if(document.visibilityState==='visible')refresh()},15000);
  const manual=()=>refresh();window.addEventListener('k4k-refresh-creative-library',manual);
  return()=>{disposed=true;epoch.current++;clearTimeout(timer);clearInterval(poll);subscription.unsubscribe();window.removeEventListener('k4k-refresh-creative-library',manual)};
 },[]);
 async function download(job){
  if(busy)return;setBusy(true);setError('');const version=epoch.current;
  try{
   const {data:{session}}=await createClient().auth.getSession();
   if(!session||version!==epoch.current)return;
   const response=await fetch('/api/creative/customer',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({action:'download',jobId:job.id,download:true}),cache:'no-store'});
   const value=await response.json();if(!response.ok||value.error)throw Error('Download unavailable. Please try again.');
   if(version===epoch.current)window.location.assign(creativeDownloadDestination(value.url,process.env.NEXT_PUBLIC_SUPABASE_URL));
  }catch(e){if(version===epoch.current)setError(e.message)}finally{setBusy(false)}
 }
 return <section id="creative-generations" className="k4k-creative-library" aria-label="Image and video generations">
  <header><div><h2>Image & Video generations</h2><p>Your latest 20 image and video generations, saved privately.</p></div><button type="button" onClick={()=>window.dispatchEvent(new Event('k4k-refresh-creative-library'))}>Refresh</button></header>
  {loading?<p role="status">Loading your generations…</p>:!signedIn?<p><a href="/login">Sign in</a> to see your generations.</p>:jobs.length===0?<p>No image or video generations yet. <a href="/k4k-app/create">Create your first one</a>.</p>:<div className="k4k-creative-library-grid">{jobs.map(job=><article key={job.id} aria-label={names[job.model]||'Generation'}><span>{job.media_kind==='image'?'IMAGE':'VIDEO'}</span><h3>{names[job.model]||'K4K creation'}</h3><p>{new Date(job.created_at).toLocaleString()}</p><p role="status">{job.status==='processing'||job.status==='queued'?<><span className="k4k-creative-spinner"/> Generating…</>:job.status==='completed'?'Ready to download':job.status==='failed'?'Generation failed':job.status}</p><p>{job.credits_quoted} credits</p>{job.status==='completed'&&<button type="button" disabled={busy} onClick={()=>download(job)}>Download {job.media_kind==='image'?'image':'video'}</button>}</article>)}</div>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
