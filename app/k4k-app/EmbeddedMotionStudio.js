'use client';
import {useEffect,useState} from 'react';
import {Play,Search,ShieldCheck,Film} from 'lucide-react';
import HiggsfieldPreview from './higgsfield-preview/page';
import MotionTemplatePreview from './MotionTemplatePreview';
import catalogue from './template-catalogue.json';
import './embedded-motion-studio.css';

const originals=catalogue.discoveryPreviews.filter(item=>item.k4kOriginal&&item.videoUrl);
function MotionUnavailable({model,loading,error}){
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('all');
 const [modalId,setModalId]=useState('');
 const filtered=originals.filter(item=>(filter==='all'||(filter==='short'?item.durationSeconds<=10:item.durationSeconds>10))&&item.title.toLowerCase().includes(query.toLowerCase()));
 const selected=originals.find(item=>item.id===modalId);
 const reason=loading?'Checking model access…':error?'The generator access check is unavailable. No files were submitted.':model.motionModel==='lite'?'K4K Motion Lite is not approved in this environment.':'K4K Motion generation is not enabled in this environment.';
 return <div className="kcp-motion-unavailable">
  <aside className="kcp-motion-gated-input">
   <h2>Motion transfer</h2>
   <p>Choose a K4K Original and watch the full preview. When the model is enabled, Recreate will prepare the source for your avatar and replacement character images.</p>
   <div className="kcp-motion-upload-disabled"><Film size={24}/><strong>Add a reference video to extract motion</strong><small>4–30 seconds · MP4</small></div>
   <div className="kcp-motion-upload-disabled"><Film size={24}/><strong>Add your characters, products or clothes</strong><small>Avatar and replacement character photos</small></div>
   <div className="kcp-motion-release-status" role="status"><ShieldCheck size={17}/><span>{reason} Your credits are unchanged.</span></div>
   <button type="button" disabled className="kcp-motion-gated-generate">Generate · unavailable</button>
  </aside>
  <section className="kcp-motion-gated-library">
   <header><div><strong>Motion Library</strong><small>K4K Originals · {originals.length} real template previews</small></div><label><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search motion templates" aria-label="Search motion templates"/></label></header>
   <div className="kcp-motion-filter-row" role="group" aria-label="Filter motion templates">
    <button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>All</button>
    <button type="button" aria-pressed={filter==='short'} onClick={()=>setFilter('short')}>Short clips</button>
    <button type="button" aria-pressed={filter==='long'} onClick={()=>setFilter('long')}>Longer scenes</button>
   </div>
   <div className="kcp-motion-gated-grid">{filtered.map(item=><article key={item.id} className="kcp-motion-template-card"
    onMouseEnter={event=>{const v=event.currentTarget.querySelector('video');if(v&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)v.play().catch(()=>{})}}
    onMouseLeave={event=>event.currentTarget.querySelector('video')?.pause()}>
    <div className="kcp-motion-template-media">
     <video src={item.videoUrl} muted loop playsInline preload="metadata" aria-hidden="true" onLoadedMetadata={event=>{const v=event.currentTarget;if(v.readyState>=1&&Number.isFinite(v.duration))v.currentTime=Math.min(.2,v.duration/2)}}/>
     <button type="button" className="kcp-motion-template-open" onClick={()=>setModalId(item.id)} aria-label={'Preview '+item.title}><Play size={22}/></button>
     <span className="kcp-motion-template-duration">{Math.ceil(item.durationSeconds)}s</span>
     <button type="button" className="kcp-motion-template-recreate" onClick={()=>setModalId(item.id)}>Recreate <Play size={14}/></button>
    </div><strong>{item.title}</strong><small>Preview · generation access required</small>
   </article>)}</div>
   {!filtered.length&&<p className="kcp-motion-library-empty">No templates match your search.</p>}
  </section>
  {selected&&<MotionTemplatePreview
   template={selected} library={originals} canRecreate={false} unavailableReason={reason}
   onClose={()=>setModalId('')} onChooseTemplate={setModalId} onRecreate={()=>{}}
  />}
 </div>;
}
export default function EmbeddedMotionStudio({model}){
 const [config,setConfig]=useState(null),[error,setError]=useState(false);
 useEffect(()=>{
  let active=true;
  setConfig(null);setError(false);
  fetch('/api/k4k-motion/creator-config',{cache:'no-store'})
   .then(response=>{if(!response.ok)throw Error('CONFIG_UNAVAILABLE');return response.json()})
   .then(value=>{if(active)setConfig(value)})
   .catch(()=>{if(active)setError(true)});
  return()=>{active=false};
 },[]);
 const allowed=!!config?.enabled&&(model.motionModel==='ultra'||config.liteEnabled);
 return <div className="kcp-motion-embedded">
   <div className="kcp-motion-mode-tabs" role="tablist" aria-label="K4K Motion workflow">
     <button type="button" role="tab" aria-selected="true">Motion transfer</button>
     <button type="button" role="tab" aria-selected="false" disabled title="Object Swap is not enabled">Objects swap · Coming soon</button>
   </div>
   {allowed?<HiggsfieldPreview
     key={model.motionModel}
     customer embedded
     templates={config.templates}
     gallery={config.gallery}
     initialMotionModel={model.motionModel}
     liteEnabled={config.liteEnabled}
     maxUsd={config.maxUsd}
     usdPerCredit={config.usdPerCredit}
     qualityCaps={config.qualityCaps}
   />:<MotionUnavailable model={model} loading={!config&&!error} error={error}/>}
 </div>;
}
