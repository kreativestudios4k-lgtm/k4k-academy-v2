'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Check,ChevronDown,Clock3,Film,ImagePlus,Images,Info,Play,SlidersHorizontal,Sparkles,Upload,Video,WandSparkles,Volume2,History,BookOpen,MoveRight} from 'lucide-react';
import {publicCreationModels} from '../../lib/creation-studio-catalog.mjs';
import CustomerCreativeGeneration from './CustomerCreativeGeneration';
import catalogue from './template-catalogue.json';
import './video-creation-workspace.css';

const VIDEOS=publicCreationModels('video');
const videoShowcases=VIDEOS.filter(m=>m.demoUrl);
const inRange=model=>model.duration?Array.from({length:model.duration[1]-model.duration[0]+1},(_,i)=>model.duration[0]+i):[];
const tutorials=[
 {number:'01',title:'ADD YOUR IDEA',text:'Write the scene or action you want to create. Add references only where the selected workflow supports them.'},
 {number:'02',title:'CHOOSE YOUR MODEL',text:'Switch models and set duration, quality and aspect ratio without returning to Explore.'},
 {number:'03',title:'GENERATE & SAVE',text:'Review the K4K credit quote, confirm generation and find the output in your private Library.'},
];
const inspiration=catalogue.discoveryPreviews.filter(p=>p.videoUrl).slice(0,5);
function ModelDemo({model,controls=false}){
 const ref=useRef(null),[visible,setVisible]=useState(false);
 useEffect(()=>{
  const node=ref.current;
  if(!node||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(([entry])=>{setVisible(entry.isIntersecting)},{rootMargin:'120px',threshold:0.2});
  observer.observe(node);return()=>observer.disconnect();
 },[model.id]);
 useEffect(()=>{
  const video=ref.current;
  if(!video||!visible||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  video.play().catch(()=>{});
  return()=>video.pause();
 },[visible,model.id]);
 return <video ref={ref} src={model.demoUrl} muted playsInline loop preload="metadata" controls={controls} aria-label={model.name+' showcase video'} />;
}
function StudioSelect({title,value,onChange,options,disabled=false,selectRef=null}){
 return <label className="k4kv-option">
  <span>{title}</span>
  <span className="k4kv-option-choice"><select ref={selectRef} aria-label={title} value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>{options.map(option=>typeof option==="object"?<option key={option.value} value={option.value}>{option.label}</option>:<option key={String(option)} value={option}>{option}</option>)}</select><ChevronDown size={14}/></span>
 </label>;
}
function GalleryTile({item,onClick,selected}){
 return <button type="button" className={'k4kv-sample-tile'+(selected?' is-selected':'')} onClick={onClick} aria-pressed={selected} title={'Preview '+item.name}>
  <span className={'k4kv-sample-visual'+(item.demoAspect==='9:16'?' is-portrait':'')}><ModelDemo key={item.id} model={item}/><span className="k4kv-sample-play"><Play size={13} fill="currentColor"/></span></span>
  <span className="k4kv-sample-footer"><strong>{item.name}</strong><small>{item.demoDurationSec}s · {item.demoAspect}</small></span>
 </button>;
}
function TutorialCard({step,index,onPickModel}){
 return <div className="k4kv-tutorial-card">
  <div className={'k4kv-tutorial-graphic k4kv-tutorial-'+index}>
   {index===0?<><span className="k4kv-tutorial-sheet"><Images size={39}/></span><span className="k4kv-tutorial-spark"><Sparkles size={22}/></span></>:
    index===1?<><span className="k4kv-tutorial-film"><Film size={37}/></span><span className="k4kv-tutorial-arrow"><MoveRight size={28}/></span></>:
    <><span className="k4kv-tutorial-glow"><Play size={35} fill="currentColor"/></span><span className="k4kv-tutorial-spark"><Sparkles size={20}/></span></>}
  </div>
  <strong>{step.title}</strong><p>{step.text}</p>
 </div>;
}
function ModelShowcase({model,onSelectModel}){
 const [tab,setTab]=useState('models');
 return <section className="k4kv-discovery" aria-labelledby="k4kv-discovery-title">
  <div className="k4kv-discovery-head">
   <div className="k4kv-discovery-tabs" role="tablist" aria-label="Video workspace preview">
    <button type="button" onClick={()=>setTab('models')} role="tab" aria-selected={tab==='models'}><Film size={16}/> Model previews</button>
    <button type="button" onClick={()=>setTab('guide')} role="tab" aria-selected={tab==='guide'}><BookOpen size={16}/> How it works</button>
   </div>
   <Link href="/k4k-app/videos" className="k4kv-history-link"><History size={16}/> History</Link>
  </div>
  {tab==='guide'?<div className="k4kv-guide">
   <header><small>K4K VIDEO STUDIO / WORKFLOW</small><h2 id="k4kv-discovery-title">MAKE VIDEOS IN ONE CLICK</h2><p>Start with a creative idea, choose a model, and generate through a verified K4K credit quote.</p></header>
   <div className="k4kv-tutorial-grid">{tutorials.map((step,i)=><TutorialCard key={step.number} step={step} index={i}/>)}</div>
   <button className="k4kv-guide-switch" onClick={()=>setTab('models')} type="button">Browse model videos <ArrowRight size={16}/></button>
  </div>:<div className="k4kv-model-library">
   <div className="k4kv-model-copy">
    <div><small>VIDEO CREATION / SELECTED MODEL</small><h2 id="k4kv-discovery-title">{model.name}</h2><p>{model.description}</p></div>
    <span className="k4kv-preview-badge"><Play size={12}/> Uploaded model example · not your result</span>
   </div>
   {model.demoUrl&&<div className={'k4kv-feature-video'+(model.demoAspect==='9:16'?' is-portrait':'')}><ModelDemo key={model.id+'feature'} model={model} controls/><span>{model.demoDurationSec}s · {model.demoAspect}</span></div>}
   <div className="k4kv-library-subheading"><div><h3>Explore video models</h3><p>Choose a clip to open its model and settings here.</p></div><small>{videoShowcases.length} REAL DEMOS</small></div>
   <div className="k4kv-sample-grid">{videoShowcases.map(item=><GalleryTile key={item.id} item={item} selected={item.id===model.id} onClick={()=>onSelectModel(item)}/>)}</div>
   <div className="k4kv-inspiration">
    <div><strong>More inspiration from K4K Originals</strong><small>Preview clips · not interchangeable model presets</small></div>
    <div className="k4kv-original-strip">{inspiration.map(item=><Link href={'/k4k-app/motion?template='+encodeURIComponent(item.id)} key={item.id} title={'Open '+item.title+' in Motion Library'}><video src={item.videoUrl} muted playsInline preload="none"/><span>{item.title.replace('K4K Original · ','')}</span></Link>)}</div>
   </div>
  </div>}
 </section>;
}
export default function VideoCreationWorkspace({
 model,mode,setMode,resolution,setResolution,aspect,setAspect,duration,setDuration,
 prompt,setPrompt,files,setFiles,thumbnails,addFiles,onSelectModel,customerModels,onModels,error
}){
 const [isPromptHelp,setPromptHelp]=useState(false),[showOptions,setShowOptions]=useState(false);
 const modelSelect=useRef(null);
 const preview=model.demoUrl;
 const canAddRefs=model.refs>0&&mode!=='Text to video'&&!model.cta;
 const isText=mode==='Text to video';
 const selectedTab=mode==='Video edit'?'edit':'create';
 useEffect(()=>{setPromptHelp(false);setShowOptions(false)},[model.id]);
 function onTab(next){
  if(next==='motion'){onSelectModel(VIDEOS.find(m=>m.id==='k4k-motion-lite'));return}
  if(next==='edit'){
   if(model.modes.includes('Video edit')){setMode('Video edit');return}
   const editingModel=VIDEOS.find(m=>m.id==='seedance_2_5_flash');
   if(editingModel){onSelectModel(editingModel);setMode('Video edit');}
   return;
  }
  setMode(model.modes.includes('Text to video')?'Text to video':model.modes[0]);
 }
 return <div className="k4kv-layout">
  <section className="k4kv-sidebar" aria-label="Video creation settings">
   <nav className="k4kv-tabs" aria-label="Video workflows">
    <button type="button" onClick={()=>onTab('create')} aria-current={selectedTab==='create'?'page':undefined}>Create Video</button>
    <button type="button" onClick={()=>onTab('edit')} aria-current={selectedTab==='edit'?'page':undefined}>Edit Video</button>
    <button type="button" onClick={()=>onTab('motion')}>Motion Control</button>
   </nav>
   <div className="k4kv-editor-scroll">
    <div className="k4kv-current-model">
     {preview&&<video key={'poster'+model.id} src={preview} muted playsInline preload="metadata"/>}
     <div className="k4kv-current-shade"/>
     <small>{isText?'GENERAL':mode.toUpperCase()}</small>
     <strong>{model.name}</strong>
     <button type="button" onClick={()=>{const select=modelSelect.current;if(select?.showPicker)select.showPicker();else select?.focus()}}><SlidersHorizontal size={14}/> Change</button>
    </div>
    <div className="k4kv-ref-tabs" aria-label="Video input mode">{model.modes.includes('Text to video')&&<button type="button" aria-pressed={isText} onClick={()=>setMode('Text to video')}>Text</button>}{model.modes.filter(m=>m!=='Text to video').map(m=><button type="button" key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{m==='Omni-reference'?'References':m}</button>)}</div>
    <div className={'k4kv-upload'+(!canAddRefs?' is-disabled':'')}>
     <div className="k4kv-upload-icons"><Images size={18}/><Film size={18}/><Volume2 size={16}/></div>
     <strong>Add references</strong><small>{canAddRefs?'Add up to '+model.refs+' reference images':'Image, video or audio · not enabled for this model/mode'}</small>
     {canAddRefs&&<label className="k4kv-upload-action"><Upload size={14}/> Select images<input type="file" hidden multiple accept="image/png,image/jpeg,image/webp" onChange={e=>{addFiles(e.target.files);e.target.value=''}}/></label>}
     {!!thumbnails.length&&<div className="k4kv-ref-grid">{thumbnails.map((url,i)=><span key={url}><img src={url} alt={'Reference '+(i+1)}/><button type="button" onClick={()=>setFiles(old=>old.filter((_,n)=>n!==i))} aria-label={'Remove reference '+(i+1)}>×</button></span>)}</div>}
    </div>
    <label className="k4kv-prompt-field"><span>Prompt</span><textarea value={prompt} rows={5} maxLength={10000} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the visual change or action you want — for example, a floating city at sunrise, cinematic camera movement and realistic lighting…"/></label>
    <div className="k4kv-prompt-actions">
     <button type="button" onClick={()=>setPromptHelp(x=>!x)} aria-expanded={isPromptHelp}>@ Elements <ChevronDown size={13}/></button>
     <span>Audio available only where supported</span>
    </div>
    {isPromptHelp&&<div className="k4kv-prompt-help">Try: subject, action, environment, lens, camera movement and lighting. This does not automatically rewrite your prompt.</div>}
    <div className="k4kv-model-form"><StudioSelect title="Model" selectRef={modelSelect} value={model.id} onChange={id=>{const next=VIDEOS.find(m=>m.id===id);if(next)onSelectModel(next)}} options={VIDEOS.map(m=>({value:m.id,label:m.name}))}/></div>
    <div className="k4kv-editor-options">
     <div className="k4kv-grid-option"><StudioSelect title="Duration" value={duration} onChange={v=>setDuration(Number(v))} options={model.duration?Array.from({length:model.duration[1]-model.duration[0]+1},(_,i)=>model.duration[0]+i):[]}/><StudioSelect title="Aspect Ratio" value={aspect} onChange={setAspect} options={model.aspect}/></div>
     <div className="k4kv-grid-option"><StudioSelect title="Quality" value={resolution} onChange={setResolution} options={model.resolution}/><label className="k4kv-option"><span>Bitrate</span><strong>Provider default</strong></label></div>
     <button type="button" className="k4kv-extra-trigger" onClick={()=>setShowOptions(x=>!x)} aria-expanded={showOptions}>More settings <ChevronDown size={15}/></button>
     {showOptions&&<div className="k4kv-extra-details">{model.description} Additional bitrate and audio options are only available after the provider confirms support.</div>}
    </div>
    {model.refs>0&&<p className="k4kv-reference-warning"><Info size={15}/> Reference editing is not enabled in the signed text-to-video generator. Uploaded files are never silently sent to a text-only endpoint.</p>}
    {error&&<p role="alert" className="k4kv-error">{error}</p>}
   </div>
   <div className="k4kv-editor-bottom"><CustomerCreativeGeneration key={model.id} model={model} mode={mode} prompt={prompt} aspect={aspect} duration={duration} resolution={resolution} referenceCount={files.length} onModels={onModels} stayInWorkspace/></div>
  </section>
  <ModelShowcase key={model.id+'library'} model={model} onSelectModel={onSelectModel}/>
 </div>;
}
