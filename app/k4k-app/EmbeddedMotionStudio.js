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
 const [preparedId,setPreparedId]=useState('');
 const [avatarFiles,setAvatarFiles]=useState([]);
 const [avatarPreviews,setAvatarPreviews]=useState([]);
 const [fileError,setFileError]=useState('');
 useEffect(()=>{
  const urls=avatarFiles.map(file=>URL.createObjectURL(file));
  setAvatarPreviews(urls);
  return ()=>urls.forEach(url=>URL.revokeObjectURL(url));
 },[avatarFiles]);
 const filtered=originals.filter(item=>(filter==='all'||(filter==='short'?item.durationSeconds<=10:item.durationSeconds>10))&&item.title.toLowerCase().includes(query.toLowerCase()));
 const selected=originals.find(item=>item.id===modalId);
 const prepared=originals.find(item=>item.id===preparedId);
 const canPrepareDraft=item=>!!item&&Number(item.durationSeconds)>=4&&Number(item.durationSeconds)<=30&&!item.previewOnly&&!item.generationPaused;
 function prepareAvatarDraft(){
  if(!canPrepareDraft(selected))return;
  setPreparedId(selected.id);setAvatarFiles([]);setFileError('');setModalId('');
  requestAnimationFrame(()=>document.getElementById('kcp-motion-preview-avatar')?.scrollIntoView({behavior:'smooth',block:'center'}));
 }
 function addAvatarFiles(list){
  const incoming=Array.from(list||[]);
  if(incoming.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024||file.size<12)){
   setFileError('Use JPG, PNG or WebP images up to 10 MB each.');return;
  }
  if(avatarFiles.length+incoming.length>8){setFileError('Choose up to 8 replacement character images.');return;}
  setAvatarFiles(current=>[...current,...incoming]);setFileError('');
 }
 const reason=loading?'Checking model access…':error?'The generator access check is unavailable. No files were submitted.':model.motionModel==='lite'?'K4K Motion Lite is not approved in this environment.':'K4K Motion generation is not enabled in this environment.';
 return <div className="kcp-motion-unavailable">
  <aside className="kcp-motion-gated-input">
   <h2>Motion transfer</h2>
   <p>Choose a K4K Original and watch the full preview. When the model is enabled, Recreate will prepare the source for your avatar and replacement character images.</p>
   {prepared?<div className="kcp-motion-draft" id="kcp-motion-preview-avatar">
     <strong>Selected reference</strong>
     <video key={prepared.id} src={prepared.videoUrl} controls playsInline muted preload="metadata" aria-label={prepared.title+' reference video'}/>
     <small>{prepared.title} · {Math.ceil(prepared.durationSeconds)}s</small>
     <label className="kcp-motion-avatar-upload"><Film size={21}/><strong>Add your avatar or character images</strong><small>Up to 8 JPG, PNG or WebP files (10 MB each)</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>{addAvatarFiles(event.target.files);event.target.value=''}} aria-label="Choose replacement avatar images"/></label>
     {!!avatarPreviews.length&&<div className="kcp-motion-avatar-previews">{avatarPreviews.map((url,index)=><div key={url}><img src={url} alt={'Avatar '+(index+1)}/><button type="button" onClick={()=>setAvatarFiles(old=>old.filter((_,i)=>i!==index))} aria-label={'Remove avatar '+(index+1)}>×</button></div>)}</div>}
     {fileError&&<p className="kcp-motion-file-error" role="alert">{fileError}</p>}
     <p>Draft preview only. Your images stay on this device and are not uploaded or charged.</p>
    </div>:<>
     <div className="kcp-motion-upload-disabled"><Film size={24}/><strong>Add a reference video to extract motion</strong><small>Choose a template to prepare your reference</small></div>
     <div className="kcp-motion-upload-disabled"><Film size={24}/><strong>Add your characters, products or clothes</strong><small>Press Recreate on a template to add your avatar photos</small></div>
    </>}
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
   template={selected} library={originals} canRecreate={canPrepareDraft(selected)} draftOnly unavailableReason={reason}
   onClose={()=>setModalId('')} onChooseTemplate={setModalId} onRecreate={prepareAvatarDraft}
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
