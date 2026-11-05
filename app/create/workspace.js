'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import './workspace.css';
const modes=['Motion transfer','Object swap'];
const showcase=[0,1,2,3,4,5];
export default function Workspace({template}){
 const [mode,setMode]=useState('Motion transfer');
 const [model,setModel]=useState('Motion Pro');
 const [duration,setDuration]=useState(5);
 const [quality,setQuality]=useState('720p');
 const [prompt,setPrompt]=useState('');
 const [showPrompt,setShowPrompt]=useState(false);
 const [references,setReferences]=useState([]);
 const [motion,setMotion]=useState(null);
 const [error,setError]=useState('');
 useEffect(()=>()=>{references.forEach(x=>URL.revokeObjectURL(x.url));if(motion?.url)URL.revokeObjectURL(motion.url)},[references,motion]);
 function addImages(event){
  const chosen=Array.from(event.target.files||[]);
  if(chosen.length+references.length>30||chosen.some(x=>!['image/jpeg','image/png','image/webp'].includes(x.type)||x.size>15*1024*1024)){setError('Maximum 30 JPG, PNG or WebP images, 15 MB each.');return}
  setError('');setReferences(old=>[...old,...chosen.map(x=>({name:x.name,url:URL.createObjectURL(x)}))]);event.target.value='';
 }
 function addMotion(event){
  const file=event.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('video/')||file.size>150*1024*1024){setError('Choose a video file under 150 MB.');return}
  setError('');setMotion({name:file.name,url:URL.createObjectURL(file)});
 }
 const selectedVideo=motion?.url||(template!==null?`/videos/template-${template}.mp4`:null);
 return <main className="km">
  <header className="km-top"><Link href="/k4k-app" className="km-brand">K4K<span> APP</span></Link><nav><Link href="/k4k-app">Explore</Link><Link href="/templates">Templates</Link><span className="km-active">Motion</span><Link href="/creator-beta/pricing">Pricing</Link></nav><div className="km-topright"><span className="km-beta">PRIVATE BETA</span><Link href="/academy">Student access ↗</Link></div></header>
  <div className="km-body">
   <aside className="km-sidebar">
    <div className="km-side-tabs"><span className="km-tab-on">Create Video</span><span>Edit Video</span><span>Motion Control</span></div>
    <div className="km-side-content">
     <div className="km-promo"><div className="km-promo-art">✦ <span>CREATE THE NEXT VIRAL MOMENT</span></div><strong>K4K MOTION</strong><small>Reality manipulation, made simple</small></div>
     <div className="km-switch">{modes.map(x=><button key={x} type="button" className={mode===x?'selected':''} onClick={()=>setMode(x)}>{x==='Motion transfer'?'◉':'◇'} {x}</button>)}</div>
     <label className="km-upload-box"><span className="km-upload-icon">▣</span><strong>{selectedVideo?'Change reference video':'Add a reference video'}</strong><small>Extract motion from a video · target 3–30 seconds</small><input type="file" accept="video/*" onChange={addMotion}/></label>
     {selectedVideo&&<video className="km-side-video" controls playsInline src={selectedVideo}/>}
     <label className="km-upload-box"><span className="km-upload-icon">♧</span><strong>Add your characters, products or clothes</strong><small>Up to 30 images · JPG, PNG, WebP</small><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addImages}/></label>
     {references.length>0&&<div className="km-thumbs">{references.map((x,i)=><img src={x.url} alt={`Reference ${i+1}: ${x.name}`} key={x.url}/>)}</div>}
     <label className="km-prompt-toggle">Prompt <input type="checkbox" checked={showPrompt} onChange={e=>setShowPrompt(e.target.checked)}/></label>
     {showPrompt&&<textarea className="km-prompt" value={prompt} maxLength={2000} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the motion, character replacement, camera and scene…"/>}
     <label className="km-field">Model<select value={model} onChange={e=>setModel(e.target.value)}><option>Motion Pro</option><option>Motion Lite</option></select></label>
     <div className="km-row"><label className="km-field">Quality<select value={quality} onChange={e=>setQuality(e.target.value)}><option>720p</option><option>480p</option><option>1080p</option></select></label><label className="km-field">Duration <span>{duration}s</span><input type="range" min="3" max="30" step="1" value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label></div>
     <small className="km-disclaimer">3–30s is a target range. Available lengths and quality depend on provider validation. No generation or charges in this preview.</small>
     {error&&<p role="alert" className="km-error">{error}</p>}
     <button className="km-generate" disabled>✦ Generate · Coming soon</button>
    </div>
   </aside>
   <section className="km-main">
    <div className="km-subnav"><span className="km-subnav-on">Motion Library</span><span>History</span><span>How it works</span></div>
    <div className="km-intro"><div><p className="km-eyebrow">K4K MOTION STUDIO</p><h1>TURN ONE VIDEO INTO MANY</h1><p>Take the motion and recreate it with your own characters, locations and products. Keep the movement, make it yours.</p><Link href="/creator-beta/pricing" className="km-intro-cta">Explore creator plans ↗</Link></div><div className="km-feature-video"><video autoPlay muted loop playsInline preload="metadata" poster="/videos/template-0.webp" src="/videos/template-0.mp4"/></div></div>
    <div className="km-library-head"><div><h2>Motion Library</h2><p>Choose a viral reference and create your own version</p></div><span className="km-library-pill">TRENDING TEMPLATES</span></div>
    <div className="km-gallery">{showcase.map(i=><Link key={i} href={`/create?template=${i}`} className="km-gallery-card"><video muted loop playsInline autoPlay preload="none" poster={`/videos/template-${i}.webp`} src={`/videos/template-${i}.mp4`}/><span>Motion {String(i+1).padStart(2,'0')} <b>↗</b></span></Link>)}</div>
    <p className="km-footnote">Template videos are previews. Generation is unavailable until the private beta is verified.</p>
   </section>
  </div>
 </main>
}
