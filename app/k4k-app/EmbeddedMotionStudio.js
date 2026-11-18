'use client';
import {useEffect,useState} from 'react';
import {Play,Search,ShieldCheck,Film} from 'lucide-react';
import HiggsfieldPreview from './higgsfield-preview/page';
import catalogue from './template-catalogue.json';
import './embedded-motion-studio.css';

const originals=catalogue.discoveryPreviews.filter(item=>item.k4kOriginal&&item.videoUrl);
function MotionUnavailable({model,loading,error}){
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState('');
 const filtered=originals.filter(item=>item.title.toLowerCase().includes(query.toLowerCase()));
 const playing=originals.find(item=>item.id===selected)||filtered[0]||originals[0];
 return <div className="kcp-motion-unavailable">
   <aside className="kcp-motion-gated-input">
     <h2>Motion transfer</h2>
     <p>Choose a reference video and replacement characters when K4K Motion generation is enabled for your account.</p>
     <div className="kcp-motion-upload-disabled"><Film size={24}/><strong>Add a reference video to extract motion</strong><small>4–30 seconds · MP4</small></div>
     <div className="kcp-motion-upload-disabled"><Film size={24}/><strong>Add your characters, products or clothes</strong><small>Character photos and private verification</small></div>
     <div className="kcp-motion-release-status" role="status"><ShieldCheck size={17}/><span>{loading?'Checking model access…':error?'Unable to check generation availability. No media was submitted.':model.motionModel==='lite'?'K4K Motion Lite is not enabled in this environment.': 'K4K Motion generation is not enabled in this environment.'} Your credits are unchanged.</span></div>
     <button type="button" disabled className="kcp-motion-gated-generate">Generate · unavailable</button>
   </aside>
   <section className="kcp-motion-gated-library">
    <header><div><strong>Motion Library</strong><small>K4K Originals · browse before generation</small></div><label><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search motion templates" aria-label="Search motion templates"/></label></header>
    <div className="kcp-motion-gated-layout"><div className="kcp-motion-gated-grid">{filtered.map(item=><button key={item.id} type="button" className={playing?.id===item.id?'selected':''} onClick={()=>setSelected(item.id)}>
      <span><video src={item.videoUrl} muted playsInline preload="metadata" onLoadedMetadata={e=>{const v=e.currentTarget;if(v.readyState>=1&&Number.isFinite(v.duration))v.currentTime=Math.min(.2,v.duration/2)}}/></span>
      <strong>{item.title}</strong><small>{Math.round(item.durationSeconds)}s · Preview</small>
    </button>)}</div>
    <aside className="kcp-motion-gated-feature">{playing&&<><video key={playing.id} src={playing.videoUrl} controls autoPlay muted loop playsInline preload="metadata"/><strong>{playing.title}</strong><small>Source demonstration only · not a generated output</small></>}</aside>
    </div>
   </section>
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
 if(!allowed)return <MotionUnavailable model={model} loading={!config&&!error} error={error}/>;
 return <HiggsfieldPreview
   key={model.motionModel}
   customer embedded
   templates={config.templates}
   gallery={config.gallery}
   initialMotionModel={model.motionModel}
   liteEnabled={config.liteEnabled}
   maxUsd={config.maxUsd}
   usdPerCredit={config.usdPerCredit}
   qualityCaps={config.qualityCaps}
 />;
}
