'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Film,ImagePlus,Plus,RefreshCw,ShieldCheck,Sparkles,Upload,X} from 'lucide-react';
import {createClient} from '../../lib/supabase/client';
import CustomerCreativeGeneration from './CustomerCreativeGeneration';
import './video-generation-popup.css';

async function privateCreative(body,token){
 const response=await fetch('/api/creative/customer',{
  method:'POST',
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
  body:JSON.stringify(body),cache:'no-store'
 });
 const value=await response.json();
 if(!response.ok||value.error)throw Error(value.error||'Preview unavailable');
 return value;
}

export default function VideoGenerationPopup({
 open,setOpen,model,mode,setMode,prompt,setPrompt,aspect,setAspect,
 duration,setDuration,resolution,setResolution,files,setFiles,thumbnails,addFiles,onModels
}){
 const modalRef=useRef(null),closeRef=useRef(null),fileRef=useRef(null);
 const [preview,setPreview]=useState({status:'loading'}),[refreshKey,setRefreshKey]=useState(0),[showTips,setShowTips]=useState(false);
 const close=()=>setOpen(false);

 useEffect(()=>{
  if(!open)return;
  const previousFocus=document.activeElement;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeRef.current?.focus();
  function onKeyDown(event){
   if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
   if(event.key!=='Tab'||!modalRef.current)return;
   const focusable=Array.from(modalRef.current.querySelectorAll('button:not([disabled]),a[href],textarea:not([disabled]),select:not([disabled]),input:not([disabled])')).filter(el=>el.getClientRects().length);
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  document.addEventListener('keydown',onKeyDown);
  return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKeyDown);previousFocus?.focus?.();};
 },[open,setOpen]);

 useEffect(()=>{
  if(!open)return;
  let active=true;
  setPreview({status:'loading'});
  async function loadExisting(){
   try{
    const {data:{session}}=await createClient().auth.getSession();
    if(!active)return;
    if(!session){setPreview({status:'signed-out'});return;}
    const {jobs=[]}=await privateCreative({action:'list'},session.access_token);
    const latest=jobs.find(job=>job.media_kind==='video'&&job.status==='completed');
    if(!latest){if(active)setPreview({status:'empty'});return;}
    // Signed URL is owner-scoped, expires after two minutes and is only used for playback.
    const signed=await privateCreative({action:'download',jobId:latest.id,download:false},session.access_token);
    if(active)setPreview({status:'ready',url:signed.url,id:latest.id,model:latest.model});
   }catch{
    if(active)setPreview({status:'error'});
   }
  }
  loadExisting();
  return()=>{active=false;};
 },[open,refreshKey]);

 if(!open||model.kind!=='video')return null;
 return <div className="k4k-video-popup-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
  <section ref={modalRef} className="k4k-video-popup" role="dialog" aria-modal="true" aria-labelledby="k4k-video-popup-title">
   <header className="k4k-video-popup-header">
    <div><span>K4K APP / VIDEO STUDIO</span><h2 id="k4k-video-popup-title">{model.name} <small>Creation workspace</small></h2></div>
    <button ref={closeRef} type="button" className="k4k-video-popup-close" onClick={close} aria-label="Close video workspace"><X size={20}/></button>
   </header>
   <div className="k4k-video-popup-grid">
    <div className="k4k-video-popup-input">
     <h3>Input</h3>
     <label className="k4k-video-popup-prompt"><span>Prompt <b>*</b></span><textarea rows={5} maxLength={1200} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the action, camera movement, lighting and atmosphere…" /><small>{prompt.length}/1200 characters</small></label>
     <div className="k4k-video-popup-reference">
      <div className="k4k-video-popup-reference-icons"><span><Sparkles size={15}/></span><span><ImagePlus size={16}/></span><span><Film size={16}/></span></div>
      {model.refs>0?<><button type="button" onClick={()=>fileRef.current?.click()}><Plus size={15}/> Add elements or references</button><small>{files.length} of {model.refs} images · JPG, PNG, WebP, up to 10 MB</small><input ref={fileRef} className="k4k-video-popup-file-input" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e=>{addFiles(e.target.files);e.target.value='';}} />{thumbnails.length>0&&<div className="k4k-video-popup-thumbnails">{thumbnails.map((url,i)=><span key={url}><img src={url} alt={'Reference '+(i+1)}/><button type="button" onClick={()=>setFiles(old=>old.filter((_,j)=>i!==j))} aria-label={'Remove reference '+(i+1)}><X size={12}/></button></span>)}</div>}</>:<><strong>Add elements or references</strong><small>Text-only for this model. Reference media needs a supported API workflow.</small></>}
     </div>
     <button type="button" className="k4k-video-popup-row" aria-expanded={showTips} onClick={()=>setShowTips(x=>!x)}><span>Prompt guidance</span><span className={'k4k-video-popup-switch'+(showTips?' on':'')} aria-hidden="true"><i/></span></button>
     {showTips&&<p className="k4k-video-popup-hint">For a stronger result, include the subject, action, camera motion, environment, lighting and final shot. Your text is not automatically rewritten.</p>}
     <div className="k4k-video-popup-controls">
      <label>Workflow<select value={mode} onChange={e=>setMode(e.target.value)}>{model.modes.map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Quality<select value={resolution} onChange={e=>setResolution(e.target.value)}>{model.resolution.map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Aspect ratio<select value={aspect} onChange={e=>setAspect(e.target.value)}>{model.aspect.map(value=><option key={value}>{value}</option>)}</select></label>
      {model.duration&&<label>Duration<select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{Array.from({length:model.duration[1]-model.duration[0]+1},(_,i)=>model.duration[0]+i).map(value=><option key={value} value={value}>{value}s</option>)}</select></label>}
     </div>
     <div className="k4k-video-popup-footnote"><ShieldCheck size={16}/><span>Credits are reserved only after you confirm a signed quote. No charge for opening this popup.</span></div>
     {model.status==='provider-verified'?<CustomerCreativeGeneration model={model} mode={mode} prompt={prompt} aspect={aspect} duration={duration} resolution={resolution} referenceCount={files.length} onModels={onModels}/>:model.cta?<Link href={model.cta} className="k4k-video-popup-cta"><Upload size={17}/> Continue in {model.name}<ArrowUpRight size={17}/></Link>:<p className="k4k-video-popup-unavailable">Generation is not enabled for this workflow.</p>}
    </div>
    <div className="k4k-video-popup-result">
     <div className="k4k-video-popup-result-heading"><h3>Result</h3><span>16:9 VIDEO PREVIEW</span></div>
     <div className="k4k-video-popup-stage">
      {preview.status==='ready'?<video key={preview.url} controls autoPlay muted loop playsInline preload="metadata" src={preview.url} aria-label="Your latest completed K4K video"/>:<div className="k4k-video-popup-stage-empty"><Film size={37}/><strong>{preview.status==='loading'?'Loading your existing video…':preview.status==='signed-out'?'Sign in to see your video':preview.status==='error'?'Preview could not be loaded':'Your video will appear here'}</strong><p>{preview.status==='empty'?'Once a generation is complete, the latest private video appears in this 16:9 player.':preview.status==='error'?'Try refreshing the preview. No generation or credits were affected.':preview.status==='signed-out'?'Your private video is never shown to other customers.':'The original aspect ratio is preserved inside the 16:9 frame.'}</p></div>}
     </div>
     <div className="k4k-video-popup-result-meta">
      <div><strong>{preview.status==='ready'?'Your latest completed video':'Private K4K library'}</strong><span>Original proportions maintained · no cropping</span></div>
      <button type="button" onClick={()=>setRefreshKey(x=>x+1)} disabled={preview.status==='loading'}><RefreshCw size={16}/> Refresh preview</button>
     </div>
     <div className="k4k-video-popup-result-note"><span>Output</span><p>This is your existing completed video, not a newly generated sample. New generations appear in your private library after provider confirmation.</p><Link href="/k4k-app/videos">Open video library <ArrowUpRight size={15}/></Link></div>
    </div>
   </div>
  </section>
 </div>;
}
