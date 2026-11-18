'use client';
import {useEffect,useRef} from 'react';
import {ArrowRight,Clock3,Film,Play,ShieldCheck,X} from 'lucide-react';
import './motion-template-preview.css';

/**
 * Preview only. No provider requests, billing or synthetic social metrics here.
 * All source media comes from the K4K Originals catalogue. Recreate is delegated
 * to the existing signed Motion flow only for server-approved templates.
 */
export default function MotionTemplatePreview({template,library=[],canRecreate=false,onClose,onRecreate,onChooseTemplate,unavailableReason=''}) {
 const closeRef=useRef(null),dialogRef=useRef(null),previousFocus=useRef(null);
 useEffect(()=>{
  if(!template)return;
  previousFocus.current=document.activeElement;
  const handleKey=event=>{
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(event.key==='Tab'&&dialogRef.current){
    const focusable=[...dialogRef.current.querySelectorAll('button:not([disabled]), a[href], video[controls]')].filter(el=>el.getClientRects().length>0);
    if(focusable.length===0)return;
    if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable[focusable.length-1].focus();}
    if(!event.shiftKey&&document.activeElement===focusable[focusable.length-1]){event.preventDefault();focusable[0].focus();}
   }
  };
  document.addEventListener('keydown',handleKey);
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeRef.current?.focus();
  return()=>{
   document.removeEventListener('keydown',handleKey);
   document.body.style.overflow=oldOverflow;
   previousFocus.current?.focus?.();
  };
 },[template?.id,onClose]);
 if(!template)return null;
 const related=library.filter(item=>item.id!==template.id).slice(0,4);
 return <div className="k4km-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="k4km-preview-title" className="k4km-preview-modal">
   <div className="k4km-preview-main">
    <div className="k4km-preview-player">
     <video key={template.id} src={template.videoUrl} controls playsInline autoPlay muted loop preload="metadata" aria-label={template.title+' full motion preview'}/>
     <span className="k4km-video-watermark">K4K ORIGINAL · MOTION PREVIEW</span>
    </div>
    <div className="k4km-preview-bottom"><div><strong>{template.title}</strong><small>Source demonstration · {Math.ceil(template.durationSeconds||0)}s · not your generated result</small></div><button onClick={onClose} type="button">Close preview</button></div>
   </div>
   <aside className="k4km-preview-aside">
    <header><span>K4K MOTION</span><button ref={closeRef} onClick={onClose} aria-label="Close template preview" type="button"><X size={20}/></button></header>
    <h2 id="k4km-preview-title">{template.title}</h2>
    <div className="k4km-preview-meta"><span><Film size={15}/> K4K Original</span><span><Clock3 size={15}/> {Math.ceil(template.durationSeconds||0)}s</span></div>
    <p>Preview this source motion. When you choose Recreate, K4K will prepare the selected template in your creator so you can add your own avatar or replacement character images.</p>
    <div className="k4km-preview-section"><h3>More K4K Originals</h3><div className="k4km-related-grid">
     {related.map(item=><button key={item.id} type="button" onClick={()=>onChooseTemplate(item.id)} title={'Preview '+item.title}>
      <span><video src={item.videoUrl} muted playsInline preload="metadata" onLoadedMetadata={event=>{const video=event.currentTarget;if(Number.isFinite(video.duration)&&video.duration>0)video.currentTime=Math.min(.2,video.duration/2)}}/></span>
      <small>{item.title.replace('K4K Original · ','')}</small>
     </button>)}
    </div></div>
    <div className="k4km-preview-steps"><strong>How to recreate</strong><p>1. Select this source video</p><p>2. Add your avatar / character photos</p><p>3. Verify media, review the signed credit quote and generate</p></div>
    {canRecreate?<button className="k4km-recreate-primary" type="button" onClick={onRecreate}><Play size={17} fill="currentColor"/> Recreate this motion <ArrowRight size={18}/></button>:
      <div className="k4km-recreate-unavailable"><ShieldCheck size={17}/><span>{unavailableReason||'This motion is preview-only and cannot be submitted for generation.'}</span></div>}
    <small className="k4km-preview-disclaimer">Viewing a video never charges credits. Generation requires permission to use the source and reference photos.</small>
   </aside>
  </section>
 </div>;
}
