'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {inspectMotionInputs} from '../../lib/motion-preview.mjs';
import './motion.css';

function LocalMedia({file,kind,onDuration}) {
 const [url,setUrl]=useState('');
 useEffect(()=>{
  if(!file){setUrl('');return;}
  const next=URL.createObjectURL(file);
  setUrl(next);
  return ()=>URL.revokeObjectURL(next);
 },[file]);
 if(!url)return <div className="km-empty">{kind==='video'?'Reference movement will preview here.':'Your replacement character will preview here.'}</div>;
 return kind==='video'
  ? <video controls playsInline preload="metadata" src={url} onLoadedMetadata={e=>onDuration(e.currentTarget.duration)} />
  : <img src={url} alt="Local replacement character preview" />;
}

export default function MotionAlpha(){
 const [video,setVideo]=useState(null);
 const [image,setImage]=useState(null);
 const [duration,setDuration]=useState(NaN);
 const [mode,setMode]=useState('replace');
 const [prompt,setPrompt]=useState('Preserve the source movement, camera timing, scene lighting and the replacement character identity.');
 const [result,setResult]=useState(null);
 function handleVideo(e){setResult(null);setDuration(NaN);setVideo(e.target.files?.[0]||null);}
 function handleImage(e){setResult(null);setImage(e.target.files?.[0]||null);}
 function validate(){setResult(inspectMotionInputs({video,image,durationSeconds:duration,mode,prompt}));}
 return <main className="km">
  <header className="km-header"><Link href="/">K4K ✳ APP</Link><span>EXPERIMENTAL MOTION LAB</span><Link href="/create">Create Studio ↗</Link></header>
  <section className="km-hero">
    <div className="km-eyebrow"><span className="km-dot" /> WAN 2.2 ANIMATE · PRIVATE PREVIEW · £0 TEST MODE</div>
    <h1>Every movement.<br/><em>A new character.</em></h1>
    <p>Explore K4K Motion Engine Alpha: replace a person in a source clip or animate a character using its movement. Your files stay inside this browser during the free preview.</p>
    <div className="km-badges"><span>Zero credits deducted</span><span>No GPU connected</span><span>No uploads or paid calls</span></div>
  </section>
  <div className="km-layout">
   <section className="km-panel">
    <h2>01 / Choose your motion</h2>
    <div className="km-toggle" role="group" aria-label="Motion mode">
     <button type="button" aria-pressed={mode==='replace'} onClick={()=>{setMode('replace');setResult(null);}}>Replace in scene<small>Keep the original background</small></button>
     <button type="button" aria-pressed={mode==='animate'} onClick={()=>{setMode('animate');setResult(null);}}>Animate character<small>Transfer body and face motion</small></button>
    </div>
    <div className="km-inputs">
     <label className="km-upload"><strong>02 / Source video</strong><span>MP4, WebM or MOV · up to 60 MB · 2–10 seconds</span><input type="file" accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" onChange={handleVideo}/></label>
     <label className="km-upload"><strong>03 / New character</strong><span>JPG, PNG or WebP · up to 15 MB</span><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImage}/></label>
    </div>
    <label className="km-prompt"><strong>04 / Direction</strong><textarea value={prompt} maxLength={1200} onChange={e=>{setPrompt(e.target.value);setResult(null);}} rows={4} /></label>
    <p className="km-meta">Clip length: {Number.isFinite(duration)?duration.toFixed(2)+'s':'waiting for video'} · {prompt.length}/1200 characters</p>
    <button className="km-validate" type="button" onClick={validate}>Validate workflow — free</button>
    <button className="km-disabled" disabled type="button">Render video — GPU not connected</button>
    <p className="km-disclaimer">This validates inputs and shows the planned workflow only. No AI-generated video is produced, no files leave the browser, and no Supabase or Stripe records are modified.</p>
   </section>
   <section className="km-preview">
    <h2>Your motion workspace</h2>
    <div className="km-previews">
     <article><div className="km-media"><LocalMedia file={video} kind="video" onDuration={setDuration}/></div><small>SOURCE MOVEMENT</small><strong>{video?.name||'No video selected'}</strong></article>
     <article><div className="km-media"><LocalMedia file={image} kind="image" /></div><small>CHARACTER REFERENCE</small><strong>{image?.name||'No character selected'}</strong></article>
    </div>
    {result && <div className="km-result" role="status" aria-live="polite">
      {result.ok ? <><strong>✓ Free workflow validation passed</strong><p>Ready for a future GPU test. This preview has not generated a video.</p><dl><dt>Engine</dt><dd>{result.manifest.engine}</dd><dt>Mode</dt><dd>{result.manifest.mode}</dd><dt>Clip</dt><dd>{result.manifest.clipDurationSeconds}s</dd><dt>Charge</dt><dd>£0.00</dd><dt>Execution</dt><dd>Dry run only</dd></dl></>
       : <><strong>Check these inputs</strong><ul>{result.errors.map(error=><li key={error}>{error}</li>)}</ul></>}
    </div>}
    {!result && <div className="km-wait"><span>PREVIEW STAGE</span><h3>Shape the next move.</h3><p>Upload the two inputs, select a mode and validate the workflow. Rendering becomes available only after a separate GPU setup and an approved cost test.</p></div>}
   </section>
  </div>
 </main>;
}
