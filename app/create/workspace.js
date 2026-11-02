'use client';
import {useState,useEffect} from 'react';
import Link from 'next/link';
import './workspace.css';
import {simulateK4KJourney,modelsForMode} from '../../lib/k4k-demo-preview.mjs';

const modes=['Text to video','Image to video','Character swap'];
export default function Workspace({template}){
 const [mode,setMode]=useState(template===null?'Text to video':'Character swap');
 const [prompt,setPrompt]=useState('');
 const [model,setModel]=useState(template===null?'K4K Create':'K4K Motion Lite');
 const [demo,setDemo]=useState(null);
 const [images,setImages]=useState([]);
 const [videoRef,setVideoRef]=useState(null);
 const [target,setTarget]=useState('Main person in the scene');
 const [outfit,setOutfit]=useState('Keep the original outfit');
 const [error,setError]=useState('');
 useEffect(()=>()=>images.forEach(x=>URL.revokeObjectURL(x.url)),[images]);
 useEffect(()=>()=>{if(videoRef)URL.revokeObjectURL(videoRef.url);},[videoRef]);
 function setCreationMode(next){setMode(next);setModel(modelsForMode(next)[0]);setDemo(null);setError('');}
 function files(event){
  const chosen=Array.from(event.target.files||[]);
  if(chosen.length===0)return;
  if(chosen.length>4||chosen.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>15*1024*1024)){setError('Choose up to four JPG, PNG or WebP images, under 15 MB each.');return;}
  setError('');setDemo(null);setImages(chosen.map(f=>({name:f.name,url:URL.createObjectURL(f)})));
 }
 function chooseVideo(event){
  const f=event.target.files?.[0];if(!f)return;
  if(!['video/mp4','video/quicktime','video/webm'].includes(f.type)||f.size>100*1024*1024){setError('Choose an MP4, MOV or WebM reference under 100 MB.');return;}
  const url=URL.createObjectURL(f);setVideoRef({name:f.name,url});setDemo(null);setError('');
 }
 function runDemo(){
  if(mode==='Character swap'&&template===null&&!videoRef){setError('Choose a motion-reference video to test Character Swap.');setDemo(null);return;}
  const result=simulateK4KJourney({model,mode,prompt,imageCount:images.length,hasTemplate:template!==null||Boolean(videoRef)});
  setDemo(result);setError(result.ok?'':result.error);
 }
 const hasMotionTemplate=template!==null&&mode==='Character swap';
 const motionUrl=hasMotionTemplate?`/videos/template-${template}.mp4`:videoRef?.url;
 return <main className="cw">
  <header><Link href="/">K4K ✳ APP</Link><Link href="/templates">Template vault</Link><Link href="/academy">My Academy ↗</Link></header>
  <div className="cw-layout">
   <section className="cw-settings">
    <p className="cw-label">K4K CREATOR STUDIO / PRIVATE BETA</p><h1>Direct your next moment.</h1>
    <p className="cw-note">Choose the right creation flow. Each mode has its own models and input steps.</p>
    <div className="cw-tabs" role="group" aria-label="Creation mode">{modes.map(x=><button type="button" key={x} aria-pressed={mode===x} onClick={()=>setCreationMode(x)}>{x}</button>)}</div>
    <div className="cw-step"><span>01 / CHOOSE THE MODEL</span><label>{mode==='Character swap'?'Motion transfer':'Creation model'}<select value={model} onChange={e=>{setModel(e.target.value);setDemo(null);}}>{modelsForMode(mode).map(m=><option key={m} value={m}>{m}</option>)}</select></label><p className="cw-note">{mode==='Character swap'?'Designed for reference-driven movements and character replacements.':'Designed for original video concepts and image animation.'}</p></div>
    <div className="cw-step"><span>02 / BRING YOUR REFERENCES</span>
     {mode==='Character swap'&&(hasMotionTemplate?<div className="cw-reference"><strong>✓ K4K motion template loaded</strong><p className="cw-note">You don't need to upload this reference again.</p><video muted autoPlay loop playsInline preload="metadata" aria-label="Silent reference video" poster={`/videos/template-${template}.webp`} src={motionUrl}/><Link href="/templates">Change template ↗</Link></div>:<label className="cw-upload">Motion reference video<input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={chooseVideo}/><small>MP4, MOV or WebM · up to 100 MB · local preview only</small></label>)}
     {mode!=='Text to video'&&<label className="cw-upload">{mode==='Character swap'?'New character reference images':'Image to animate'}<input type="file" accept="image/png,image/jpeg,image/webp" multiple={mode==='Character swap'} onChange={files}/><small>{mode==='Character swap'?'1–4 JPG, PNG or WebP images':'1 JPG, PNG or WebP image'} · 15 MB each · not uploaded</small></label>}
     <div className="cw-images">{images.map((x,i)=><figure key={x.url}><img src={x.url} alt={`Reference ${i+1}: ${x.name}`}/><figcaption>Reference {i+1}</figcaption></figure>)}</div>
     {videoRef&&mode==='Character swap'&&template===null&&<p className="cw-note">✓ Video selected: {videoRef.name}</p>}
     {mode==='Character swap'&&<div className="cw-character-directions"><label>Who should be replaced?<input type="text" value={target} maxLength={180} onChange={e=>setTarget(e.target.value)} placeholder="e.g. person standing on the left"/></label><label>Wardrobe direction (optional)<select value={outfit} onChange={e=>setOutfit(e.target.value)}><option>Keep the original outfit</option><option>Use the character's reference outfit</option><option>Describe a new outfit in the prompt</option></select></label></div>}
    </div>
    <div className="cw-step"><span>03 / DIRECT THE SCENE</span><label>Creative prompt<textarea value={prompt} maxLength={1800} onChange={e=>setPrompt(e.target.value)} placeholder={mode==='Character swap'? 'Preserve the source movement and camera. Keep the face and identity consistent, with believable lighting and proportions.':'Describe subject, action, camera movement and atmosphere…'}/></label><small className="cw-note">{prompt.length}/1800 characters</small>{mode==='Character swap'&&<p className="cw-note">Target: {target||'Not specified'} · Outfit: {outfit}. These notes are for the future generation workflow.</p>}</div>
    {error&&<p role="alert" className="cw-error">{error}</p>}
    <div className="cw-status"><strong>04 / REVIEW THE FREE PREVIEW</strong><p>No provider calls, uploads, checkout or credit deduction happen in this simulation. Real generation will check verified payment, an exact credit quote and provider budget before a job can start.</p><p>New K4K APP plan proposed: £9.99/month for 100 credits. Existing Academy plans remain unchanged.</p></div>
    <button className="cw-generate" type="button" onClick={runDemo}>Try the creation flow · £0</button>
    <p className="cw-note">Simulation only — this does not make a finished AI video.</p><Link className="cw-help" href="/academy/studio">Open Academy Prompt Studio ↗</Link>
   </section>
   <section className="cw-results"><div><span className="cw-label">YOUR CREATIVE CANVAS</span><h2>{mode==='Character swap'?'The motion stays. Your cast changes.':mode==='Image to video'?'Give your image a new rhythm.':'Bring an original scene to life.'}</h2><p>{hasMotionTemplate?'Your selected K4K reference is already loaded. Add a character image, set the direction and test the flow.':mode==='Character swap'?'Choose a reference clip and a new character to plan a motion remix.':'Build your video concept in a dedicated studio mode.'}</p>
    {mode==='Character swap'&&motionUrl&&<video muted autoPlay loop playsInline preload="metadata" aria-label="Silent reference video" poster={hasMotionTemplate?`/videos/template-${template}.webp`:undefined} src={motionUrl}/>}
    {mode==='Image to video'&&images.length>0&&<img className="cw-canvas-image" src={images[0].url} alt="Selected image-to-video reference"/>}
    {demo?.ok?<div className="cw-demo-result" role="status"><strong>Beta workflow validated · £0 charged</strong><p>Mode: {demo.mode}. Model: {demo.model}. These steps are simulated, not real AI generation.</p><ol>{demo.steps.map(s=><li key={s}>{s}</li>)}</ol><p>Real output appears here only when verified API billing and credit protection go live.</p></div>:<div className="cw-placeholder"><span>✳</span><strong>Preview canvas</strong><p>Choose references and run the £0 simulation to see your preparation checks.</p></div>}
   </div></section>
  </div>
 </main>;
}
