'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,CheckCircle2,ClipboardCopy,Clapperboard,Copy,Download,FileVideo,Film,ImagePlus,Info,Layers3,LockKeyhole,Play,RefreshCcw,ShieldCheck,Sparkles,UploadCloud,Video,Wallet, X, Zap} from 'lucide-react';
import {K4K_CHARACTER_POSITIONS,K4K_VIDEO_MODES,makeK4KSwapPrompt} from '../../../lib/k4k-studio-prompt';

const MAX_VIDEO=250*1024*1024;
const MAX_IMAGE=15*1024*1024;
const allowedVideo=/\.(mp4|mov|webm|m4v)$/i;
const allowedImage=/\.(png|jpe?g|webp)$/i;
const humanSize=(size)=>size>=1024*1024?(size/(1024*1024)).toFixed(1)+' MB':(size/1024).toFixed(0)+' KB';

function ImageReference({index,file,onChange,onRemove,disabled=false}){
 const [url,setUrl]=useState('');
 const inputRef=useRef(null);
 useEffect(()=>{
  if(!file){setUrl('');return;}
  const objectUrl=URL.createObjectURL(file);
  setUrl(objectUrl);
  return()=>URL.revokeObjectURL(objectUrl);
 },[file]);
 return <div className={'k4k-studio-sheet '+(file?'has-file':'')}>
  <span className="k4k-studio-sheet-kicker">IMAGE {index} / {index===1?'CHARACTER SHEET 01':'CHARACTER SHEET 02'}</span>
  <input ref={inputRef} className="k4k-studio-visually-hidden" id={'studio-image-'+index} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" disabled={disabled}
   onChange={(event)=>{const selected=event.target.files?.[0]||null;if(selected)onChange(selected);event.target.value='';}}/>
  <label htmlFor={'studio-image-'+index} className="k4k-studio-sheet-picker">
   {file&&url?<img className="k4k-studio-sheet-image" src={url} alt={'Local preview of character sheet '+index}/>:<div className="k4k-studio-empty-image"><ImagePlus size={31}/><strong>CHOOSE CHARACTER SHEET</strong><span>PNG, JPG or WEBP · up to 15 MB</span></div>}
  </label>
  <div className="k4k-studio-file-meta">
   {file?<><div><strong title={file.name}>{file.name}</strong><small>{humanSize(file.size)} · saved on this device only</small></div><button type="button" onClick={onRemove} className="k4k-studio-remove" title={'Remove image '+index} aria-label={'Remove character sheet '+index}><X size={17}/></button></>:<span>One person, consistent face and outfit</span>}
  </div>
 </div>;
}

function VideoReference({file,onChange,onRemove,onDuration,duration}){
 const [url,setUrl]=useState('');
 const inputRef=useRef(null);
 useEffect(()=>{
  if(!file){setUrl('');onDuration(null);return;}
  const objectUrl=URL.createObjectURL(file);setUrl(objectUrl);
  return()=>URL.revokeObjectURL(objectUrl);
 },[file,onDuration]);
 return <div className={'k4k-studio-video-frame '+(file?'has-video':'')}>
  <input ref={inputRef} className="k4k-studio-visually-hidden" id="studio-video-file" type="file" accept=".mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm" onChange={event=>{const selected=event.target.files?.[0]||null;if(selected)onChange(selected);event.target.value='';}}/>
  {file&&url?<div className="k4k-studio-video-player">
   <video src={url} controls playsInline preload="metadata" onLoadedMetadata={event=>onDuration(Number.isFinite(event.currentTarget.duration)?event.currentTarget.duration:null)} aria-label="Your source video preview"/>
   <div className="k4k-studio-video-meta"><span>{file.name}</span>{duration!==null&&<span>{duration.toFixed(1)}s</span>}</div>
   <button type="button" className="k4k-studio-video-remove" onClick={onRemove} aria-label="Remove source video"><X size={17}/></button>
  </div>:<label htmlFor="studio-video-file" className="k4k-studio-drop">
   <span className="k4k-studio-drop-icon"><UploadCloud size={33}/></span>
   <strong>SELECT REFERENCE VIDEO</strong>
   <span>Choose the video whose movements you want to reproduce.</span>
   <small>MP4, MOV, WEBM · max 250 MB · stays in your browser</small>
   <span className="k4k-studio-drop-cta">CHOOSE VIDEO <ArrowUpRight size={16}/></span>
  </label>}
 </div>;
}

const checklist=[
 {id:'identity',title:'Faces stay the same',desc:'No face morphing, changing hair, glasses or skin tone.'},
 {id:'wardrobe',title:'Outfits stay consistent',desc:'Each character wears the exact outfit from their own sheet.'},
 {id:'positions',title:'Correct person replaced',desc:'The LEFT / RIGHT / CENTRE positions match your prompt.'},
 {id:'movement',title:'Natural motion and contact',desc:'No extra hands, duplicate bodies, warping or floating objects.'},
 {id:'audio',title:'Rights and disclosure checked',desc:'You have permission for footage, music and likenesses; label AI content when appropriate.'}
];

export default function CharacterSwapStudio(){
 const [video,setVideo]=useState(null);
 const [duration,setDuration]=useState(null);
 const [sheet1,setSheet1]=useState(null);
 const [sheet2,setSheet2]=useState(null);
 const [count,setCount]=useState(1);
 const [position1,setPosition1]=useState('left');
 const [position2,setPosition2]=useState('right');
 const [mode,setMode]=useState('object');
 const [format,setFormat]=useState('original');
 const [keepScene,setKeepScene]=useState(true);
 const [keepOutfits,setKeepOutfits]=useState(true);
 const [keepAudio,setKeepAudio]=useState(true);
 const [subjectDetail,setSubjectDetail]=useState('');
 const [creativeNote,setCreativeNote]=useState('');
 const [generated,setGenerated]=useState('');
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const [reviewed,setReviewed]=useState({});
 const resultRef=useRef(null);
 const setDurationStable=useRef(setDuration).current;

 const dirty=()=>{setGenerated('');setCopied(false);setError('');};
 const setFile=(kind,file)=>{
  if(!file)return;
  const videoFile=kind==='video';
  const formatOk=videoFile?(file.type.startsWith('video/')||allowedVideo.test(file.name)):(file.type.startsWith('image/')||allowedImage.test(file.name));
  const limit=videoFile?MAX_VIDEO:MAX_IMAGE;
  if(!formatOk || !(videoFile?allowedVideo:allowedImage).test(file.name)){
   setError('Unsupported file. Use MP4/MOV/WEBM for video, or PNG/JPG/WEBP for character sheets.');return;
  }
  if(file.size>limit||file.size===0){setError(videoFile?'Choose a non-empty video smaller than 250 MB.':'Choose a non-empty character sheet smaller than 15 MB.');return;}
  if(videoFile){setVideo(file);setDuration(null);}else if(kind==='sheet1')setSheet1(file);else setSheet2(file);
  dirty();setReviewed({});
 };
 const resetFile=kind=>{if(kind==='video'){setVideo(null);setDuration(null);}else if(kind==='sheet1')setSheet1(null);else setSheet2(null);dirty();setReviewed({});};
 const update=(setter,value)=>{setter(value);dirty();};
 const needsSecond=count===2;
 const ready=Boolean(video&&sheet1&&(!needsSecond||sheet2)&&(count!==2||position1!==position2));
 const hasVideoLengthWarning=duration!==null&&(duration<4||duration>30);
 const generate=()=>{
  if(!video){setError('First choose a reference video.');return;}
  if(!sheet1){setError('Add a character sheet for @Image1.');return;}
  if(needsSecond&&!sheet2){setError('Add a second character sheet for @Image2.');return;}
  try{
   const output=makeK4KSwapPrompt({mode,count,position1,position2,format,keepScene,keepOutfits,keepAudio,subjectDetail,creativeNote});
   setError('');setGenerated(output);setCopied(false);
   requestAnimationFrame(()=>resultRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
  }catch(e){setError(e.message||'Please check the character positions.');}
 };
 const copy=async()=>{
  if(!generated)return;
  try{await navigator.clipboard.writeText(generated);setCopied(true);setError('');}
  catch{setError('Copy was blocked by your browser. Select the prompt text and copy it manually.');}
 };
 const download=()=>{
  if(!generated)return;
  const blob=new Blob([generated],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='K4K-Genjutsu-Character-Swap-Prompt.txt';document.body.append(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const checklistCount=checklist.filter(x=>reviewed[x.id]).length;
 return <div className="k4k-studio-builder">
  <div className="k4k-studio-progress-strip" aria-label="Your creation process">
   <span className={video?'completed':'active'}><b>01</b> REFERENCE VIDEO</span>
   <ArrowRight size={15}/>
   <span className={sheet1&&(!needsSecond||sheet2)?'completed':video?'active':''}><b>02</b> CHARACTER SHEETS</span>
   <ArrowRight size={15}/>
   <span className={generated?'completed':ready?'active':''}><b>03</b> GENJUTSU PROMPT</span>
   <ArrowRight size={15}/>
   <span><b>04</b> GENERATE & REVIEW</span>
  </div>

  <div className="k4k-studio-workspace">
   <section className="k4k-studio-panel" aria-labelledby="k4k-studio-video-heading">
    <div className="k4k-studio-panel-title"><span className="k4k-studio-panel-count">01</span><div><small>INVESTIGATE / SOURCE VIDEO</small><h2 id="k4k-studio-video-heading">Choose your reference</h2></div></div>
    <p>Your video is the source of the movement, people and camera. Choose footage you're permitted to transform.</p>
    <VideoReference file={video} onChange={file=>setFile('video',file)} onRemove={()=>resetFile('video')} onDuration={setDurationStable} duration={duration}/>
    {hasVideoLengthWarning&&<p className="k4k-studio-warning" role="status"><Info size={17}/> Genjutsu commonly accepts roughly 4–30 seconds. Trim this clip before using it on Higgsfield; current limits may differ.</p>}
    <div className="k4k-studio-tip"><ShieldCheck size={18}/> Media is previewed locally and is not uploaded to K4K Academy. You'll upload it again in Higgsfield.</div>
    <div className="k4k-studio-tip" role="note"><Info size={18}/><span><strong>NEW: GENJUTSU LITE (20 OCT 2026).</strong> For quick, potentially lower-cost practice edits, Higgsfield now offers Genjutsu Lite. It uses only the first 15 seconds of a source video and preserves source audio. {duration!==null&&duration>15?'Your video is longer than 15 seconds: trim it first or choose standard Genjutsu to keep later action.':'Compare the credit cost with standard Genjutsu before generating.'} <a href="https://open.higgsfield.ai/models/higgsfield/genjutsu-light/object-swap/v1.0/playground" target="_blank" rel="noopener noreferrer">Read official Lite details</a>. This studio still prepares a prompt only; it does not run Lite or charge credits.</span></div>
   </section>

   <section className="k4k-studio-panel" aria-labelledby="k4k-studio-characters-heading">
    <div className="k4k-studio-panel-title"><span className="k4k-studio-panel-count">02</span><div><small>DIRECT / REPLACEMENT CAST</small><h2 id="k4k-studio-characters-heading">Add your characters</h2></div></div>
    <p>Use a consistent character sheet for each replacement person. Do not combine two identities in one sheet.</p>
    <fieldset className="k4k-studio-toggle-group">
     <legend>How many original people do you want to replace?</legend>
     <div className="k4k-studio-toggle-options">
      <button type="button" className={count===1?'selected':''} aria-pressed={count===1} onClick={()=>update(setCount,1)}><CheckCircle2 size={17}/> ONE PERSON</button>
      <button type="button" className={count===2?'selected':''} aria-pressed={count===2} onClick={()=>update(setCount,2)}><Layers3 size={17}/> TWO PEOPLE</button>
     </div>
    </fieldset>
    <div className="k4k-studio-image-grid">
     <div className="k4k-studio-image-column">
      <ImageReference index={1} file={sheet1} onChange={file=>setFile('sheet1',file)} onRemove={()=>resetFile('sheet1')}/>
      <label className="k4k-studio-select-label" htmlFor="studio-position1">Replace which original person?</label>
      <select id="studio-position1" value={position1} onChange={event=>update(setPosition1,event.target.value)}>
       {K4K_CHARACTER_POSITIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
     </div>
     {needsSecond&&<div className="k4k-studio-image-column">
      <ImageReference index={2} file={sheet2} onChange={file=>setFile('sheet2',file)} onRemove={()=>resetFile('sheet2')}/>
      <label className="k4k-studio-select-label" htmlFor="studio-position2">Replace which second person?</label>
      <select id="studio-position2" value={position2} onChange={event=>update(setPosition2,event.target.value)}>
       {K4K_CHARACTER_POSITIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
     </div>}
    </div>
    {needsSecond&&position1===position2&&<p className="k4k-studio-warning" role="alert"><Info size={17}/> Assign each sheet to a different original person.</p>}
    <label className="k4k-studio-select-label" htmlFor="studio-target-notes">Original person details (optional)</label>
    <input id="studio-target-notes" type="text" maxLength={180} value={subjectDetail} onChange={event=>update(setSubjectDetail,event.target.value)}
     placeholder="e.g. The player wearing red who scores the goal"/>
   </section>

   <section className="k4k-studio-panel k4k-studio-settings" aria-labelledby="k4k-studio-settings-heading">
    <div className="k4k-studio-panel-title"><span className="k4k-studio-panel-count">03</span><div><small>EXECUTE / GENJUTSU SETUP</small><h2 id="k4k-studio-settings-heading">Direct the scene</h2></div></div>
    <p>Choose how Higgsfield should use the reference. This prepares the prompt; it does not run a paid generation.</p>
    <fieldset className="k4k-studio-toggle-group">
     <legend>Which Genjutsu mode best matches your goal?</legend>
     <div className="k4k-studio-mode-grid">
      {K4K_VIDEO_MODES.map(item=><button type="button" key={item.value} className={mode===item.value?'selected':''} aria-pressed={mode===item.value} onClick={()=>update(setMode,item.value)}>
       <strong>{item.label.toUpperCase()}</strong><span>{item.summary}</span>{mode===item.value&&<CheckCircle2 size={18} className="k4k-studio-mode-check"/>}
      </button>)}
     </div>
    </fieldset>
    <div className="k4k-studio-options-grid">
     <div><label className="k4k-studio-select-label" htmlFor="studio-format">Output format</label>
      <select id="studio-format" value={format} onChange={event=>update(setFormat,event.target.value)}>
       <option value="original">Keep original aspect ratio</option><option value="9:16">9:16 · TikTok / Reels</option>
       <option value="16:9">16:9 · YouTube</option><option value="4:5">4:5 · Feed</option>
      </select>
     </div>
     <div><label className="k4k-studio-select-label" htmlFor="studio-direction">Creative direction (optional)</label>
      <input id="studio-direction" maxLength={340} value={creativeNote} onChange={event=>update(setCreativeNote,event.target.value)} placeholder="e.g. Keep original football celebration"/>
     </div>
    </div>
    <div className="k4k-studio-checkboxes">
     <label><input type="checkbox" checked={keepScene} onChange={event=>update(setKeepScene,event.target.checked)}/> <span>Preserve the original environment</span></label>
     <label><input type="checkbox" checked={keepOutfits} onChange={event=>update(setKeepOutfits,event.target.checked)}/> <span>Keep exact clothing from each sheet</span></label>
     <label><input type="checkbox" checked={keepAudio} onChange={event=>update(setKeepAudio,event.target.checked)}/> <span>Keep original audio if supported</span></label>
    </div>
    <button type="button" className="k4k-studio-generate" onClick={generate} disabled={!ready}>
     <Sparkles size={20}/> GENERATE MY GENJUTSU PROMPT <ArrowUpRight size={19}/>
    </button>
    <p className="k4k-studio-ready-note">{ready?'Your reference inputs are ready to make a customised prompt.':'Add the reference video and all selected character sheets to unlock prompt generation.'}</p>
    {error&&<p role="alert" className="k4k-studio-error">{error}</p>}
   </section>

   <section ref={resultRef} className="k4k-studio-panel k4k-studio-result" aria-labelledby="k4k-studio-result-heading">
    <div className="k4k-studio-panel-title"><span className="k4k-studio-panel-count">04</span><div><small>YOUR ORIGINAL K4K IDEA PROMPT</small><h2 id="k4k-studio-result-heading">Copy it. Then create.</h2></div></div>
    {generated?<div className="k4k-studio-result-content">
     <div className="k4k-studio-result-success"><CheckCircle2 size={20}/> Your {count===2?'two-person':'one-person'} {mode==='object'?'Object Swap':'Motion Transfer'} prompt is ready.</div>
     <label className="k4k-studio-select-label" htmlFor="studio-final-prompt">Genjutsu-ready prompt (editable by selecting and copying)</label>
     <textarea id="studio-final-prompt" readOnly value={generated} rows={20} onFocus={event=>event.target.select()}/>
     <div className="k4k-studio-result-actions">
      <button type="button" className="k4k-studio-copy" onClick={copy}>{copied?<Check size={19}/>:<Copy size={19}/>} {copied?'COPIED!':'COPY PROMPT'}</button>
      <button type="button" className="k4k-studio-download" onClick={download}><Download size={18}/> SAVE .TXT</button>
      <a className="k4k-studio-open-hf" href="https://higgsfield.ai/genjutsu" target="_blank" rel="noopener noreferrer">OPEN HIGGSFIELD GENJUTSU <ArrowUpRight size={17}/></a>
     </div>
     <div className="k4k-studio-handoff"><strong>NEXT STEP: Upload these same files on Higgsfield</strong>
      <p>Open Genjutsu, choose {mode==='object'?'Object Swap':'Motion Transfer'}, upload the source video as @Video1 and your character sheet{needsSecond?'s as @Image1 and @Image2':' as @Image1'}, paste the prompt, review the displayed credit cost and generate. K4K does not transfer the local files automatically.</p>
     </div>
    </div>:<div className="k4k-studio-empty-result"><ClipboardCopy size={34}/><strong>Your custom prompt will appear here.</strong><p>Add a video, select the cast and click Generate My Genjutsu Prompt above. No payment or API credits are needed for this step.</p></div>}
   </section>
  </div>

  <section className="k4k-studio-audit" aria-labelledby="k4k-studio-audit-heading">
   <div className="k4k-studio-audit-header"><div><span className="k4k-course-kicker">A — AUDIT / YOUR QUALITY GATE</span><h2 id="k4k-studio-audit-heading">CHECK BEFORE YOU POST.</h2><p>After Higgsfield finishes, review the exported video and tick off each quality check.</p></div><strong>{checklistCount}/{checklist.length} CHECKS</strong></div>
   <div className="k4k-studio-audit-list">
    {checklist.map(item=><label key={item.id} className={reviewed[item.id]?'done':''}>
     <input type="checkbox" checked={Boolean(reviewed[item.id])} onChange={event=>setReviewed(state=>({...state,[item.id]:event.target.checked}))}/>
     <span className="k4k-studio-audit-icon">{reviewed[item.id]?<Check size={18}/>:<span/>}</span>
     <span><strong>{item.title}</strong><small>{item.desc}</small></span>
    </label>)}
   </div>
   {checklistCount===checklist.length&&<p className="k4k-studio-audit-complete"><CheckCircle2 size={19}/> Your checklist is complete. Review the final video and publish only when you're satisfied with the rights and result.</p>}
  </section>
  <div className="k4k-studio-bottom-links"><Link href="/academy/lessons/viral-character-swap"><Film size={17}/> READ THE FULL 8-STEP LESSON <ArrowRight size={16}/></Link><p><LockKeyhole size={15}/> Work stays local until you choose to upload it to Higgsfield. This Studio does not generate videos or bill AI credits.</p></div>
 </div>;
}
