'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Film,ImagePlus,Plus,ShieldCheck,Sparkles,Upload,X} from 'lucide-react';
import CustomerCreativeGeneration from './CustomerCreativeGeneration';
import './video-generation-popup.css';

export default function VideoGenerationPopup({
 open,setOpen,model,mode,setMode,prompt,setPrompt,aspect,setAspect,
 duration,setDuration,resolution,setResolution,files,setFiles,thumbnails,addFiles,onModels
}){
 const modalRef=useRef(null),closeRef=useRef(null),fileRef=useRef(null);
 const [showTips,setShowTips]=useState(false);
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


 if(!open||model.id!=='kling4_hf')return null;
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
     <div className="k4k-video-popup-result-heading"><h3>Result</h3><span>KLING 4.0 · 16:9 SAMPLE</span></div>
     <div className="k4k-video-popup-stage">
      <video controls autoPlay muted loop playsInline preload="metadata" src={model.demoUrl} aria-label="Uploaded Kling 4.0 Higgsfield sample animation"/>
      <span className="k4k-video-popup-demo-chip">7s MODEL DEMO</span>
     </div>
     <div className="k4k-video-popup-result-meta">
      <div><strong>Kling 4.0 · Higgsfield</strong><span>Uploaded example video · loops automatically · 16:9</span></div>
      <span className="k4k-video-popup-nocharge">Preview only</span>
     </div>
     <div className="k4k-video-popup-result-note"><span>DEMO VIDEO</span><p>This animation demonstrates the selected model. It is not the output of your prompt. When you generate a new video, the result is saved securely in your private library.</p><Link href="/k4k-app/videos">Open video library <ArrowUpRight size={15}/></Link></div>
    </div>
   </div>
  </section>
 </div>;
}
