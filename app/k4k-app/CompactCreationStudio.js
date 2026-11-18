'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,ArrowUpRight,ChevronDown,Clock3,FileText,Film,Globe2,Image as ImageIcon,Images,Info,Layers3,Play,Plus,ShieldCheck,Sparkles,Upload,Video,X} from 'lucide-react';
import {publicCreationModels} from '../../lib/creation-studio-catalog.mjs';
import CustomerCreativeGeneration from './CustomerCreativeGeneration';
import './compact-creation-studio.css';

const videoModels=publicCreationModels('video');
const imageModels=publicCreationModels('image');
const allModels=[...videoModels,...imageModels];
const durations=model=>model.duration?Array.from({length:model.duration[1]-model.duration[0]+1},(_,i)=>model.duration[0]+i):[];
const isTextGeneration=(model,mode)=>!model.cta&&((model.kind==='video'&&mode==='Text to video')||(model.kind==='image'&&mode==='Text to image'));

function Setting({label,icon:Icon,value,onChange,values,disabled=false}){
 return <label className="kcp-setting">
  <span>{Icon&&<Icon size={15}/>} {label}</span>
  <select value={value} onChange={event=>onChange(event.target.value)} disabled={disabled} aria-label={label}>
   {values.map(value=><option key={String(value)} value={value}>{value==='source'?'Source':value}</option>)}
  </select>
 </label>;
}

function RefDropzone({model,files,thumbnails,addFiles,setFiles}){
 const inputRef=useRef(null);
 const supported=model.refs>0&&!model.cta;
 return <div className={'kcp-references'+(supported?'':' kcp-references-disabled')}>
  <div className="kcp-reference-icons"><span><Images size={16}/></span><span><Film size={16}/></span></div>
  {supported?<button type="button" className="kcp-references-add" onClick={()=>inputRef.current?.click()}><Plus size={16}/> Add elements or references</button>:
   <strong>Elements & references</strong>}
  <small>{model.cta?'Upload source video and character references in the dedicated creator.':model.refs>0?'Add up to '+model.refs+' images · JPG, PNG or WebP':'Reference uploads are unavailable for this text-only model.'}</small>
  {supported&&<>
   <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="kcp-file-hidden" onChange={event=>{addFiles(event.target.files);event.target.value='';}} aria-label="Upload reference images"/>
   {!!thumbnails.length&&<div className="kcp-reference-thumbs">{thumbnails.map((url,i)=><div key={url} className="kcp-reference-thumb"><img src={url} alt={'Reference '+(i+1)}/><button type="button" aria-label={'Remove reference '+(i+1)} onClick={()=>setFiles(current=>current.filter((_,j)=>j!==i))}><X size={13}/></button></div>)}</div>}
  </>}
 </div>;
}

function ResultArt({model}){
 const isPortrait=model.demoAspect==='9:16';
 return <div className={'kcp-result-media'+(isPortrait?' is-portrait':'')+(model.kind==='image'?' is-image':'')}>
  {model.demoUrl?<video key={model.id} src={model.demoUrl} controls autoPlay muted loop playsInline preload="metadata" aria-label={model.name+' demonstration video'}/>:
   <div className="kcp-visual-placeholder" role="img" aria-label="Abstract K4K branded image placeholder, not generated output">
    <span className="kcp-visual-disc"/>
    <span className="kcp-visual-ring"/>
    <div className="kcp-visual-mark"><ImageIcon size={42} strokeWidth={1.2}/><b>K4K</b><small>IMAGE STUDIO</small></div>
   </div>}
  <span className="kcp-preview-label">{model.demoUrl?'MODEL DEMO':'IMAGE PREVIEW'}</span>
 </div>;
}

export default function CompactCreationStudio({
 model,kind,mode,setMode,resolution,setResolution,aspect,setAspect,duration,setDuration,
 prompt,setPrompt,files,setFiles,thumbnails,addFiles,onSelectModel,customerModels,onModels,error
}){
 const [guideOpen,setGuideOpen]=useState(false);
 const [moreOpen,setMoreOpen]=useState(false);
 const [switchOpen,setSwitchOpen]=useState(false);
 const [filter,setFilter]=useState('');
 const switchRef=useRef(null);
 const isImage=kind==='image',isCinema=model.id==='kling4_hf'||model.id==='kling4_0';
 const isSeedance=model.id.startsWith('seedance');
 const compactType=isImage?'image':isCinema?'cinema':'advanced';
 const activeGeneration=isTextGeneration(model,mode)&&customerModels[model.id]===true;
 const choices=allModels.filter(item=>item.name.toLowerCase().includes(filter.toLowerCase()));
 useEffect(()=>{setGuideOpen(false);setMoreOpen(false);setSwitchOpen(false);setFilter('');},[model.id]);
 useEffect(()=>{
  if(!switchOpen)return;
  const close=event=>{if(!switchRef.current?.contains(event.target))setSwitchOpen(false);};
  const escape=event=>{if(event.key==='Escape')setSwitchOpen(false);};
  document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
  return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};
 },[switchOpen]);
 return <main className={'kcp-root kcp-'+compactType}>
  <header className="kcp-header">
   <Link href="/" className="kcp-brand" aria-label="K4K APP homepage"><img src="/k4k-mark.svg" width="29" height="29" alt=""/>K4K <span>APP</span></Link>
   <div className="kcp-divider"/>
   <div className="kcp-model-dropdown" ref={switchRef}>
    <button type="button" className="kcp-model-trigger" aria-haspopup="true" aria-expanded={switchOpen} onClick={()=>setSwitchOpen(v=>!v)}>
     {isImage?<ImageIcon size={16}/>:<Video size={16}/>}
     <span>{model.name}</span><ChevronDown size={16}/>
    </button>
    {switchOpen&&<div className="kcp-switch-menu" role="dialog" aria-label="Switch AI model">
     <label className="kcp-switch-search">Search models<input autoFocus value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search video and image models"/></label>
     {['video','image'].map(type=><div key={type} className="kcp-switch-group">
      <strong>{type==='video'?'VIDEO MODELS':'IMAGE MODELS'}</strong>
      {choices.filter(item=>item.kind===type).map(item=><button key={item.id} type="button" aria-current={model.id===item.id?'true':undefined} onClick={()=>{onSelectModel(item);setSwitchOpen(false);}}><span>{item.name}</span>{model.id===item.id?<span className="kcp-selected-dot"/>:<ArrowUpRight size={13}/>}</button>)}
     </div>)}
     {!choices.length&&<p className="kcp-no-models">No matching models</p>}
    </div>}
   </div>
   <nav className="kcp-header-right" aria-label="Workspace">
    <div className="kcp-kind-tabs"><button type="button" aria-pressed={!isImage} onClick={()=>onSelectModel(videoModels[0])}><Film size={15}/> Video</button><button type="button" aria-pressed={isImage} onClick={()=>onSelectModel(imageModels[0])}><Images size={15}/> Image</button></div>
    <Link href="/k4k-app/videos" className="kcp-library-link">Library <ArrowUpRight size={15}/></Link>
    <Link href="/" className="kcp-explore-link"><ArrowLeft size={15}/> Explore</Link>
   </nav>
  </header>
  <div className="kcp-workspace">
   <section className="kcp-input" aria-labelledby="kcp-input-title">
    <div className="kcp-input-scroll">
     <div className="kcp-panel-head"><h1 id="kcp-input-title">Input</h1><span>{model.name}</span></div>
     <label className="kcp-prompt"><span>Prompt <b>*</b></span><textarea value={prompt} maxLength={10000} rows={compactType==='cinema'?5:4} onChange={e=>setPrompt(e.target.value)} placeholder={isImage?'Describe your image, style, colours and composition…':'Describe your subject, scene, action, camera movement and lighting…'}/></label>
     {(compactType==='advanced'||compactType==='image')&&<RefDropzone model={model} files={files} setFiles={setFiles} addFiles={addFiles} thumbnails={thumbnails}/>}
     {compactType==='advanced'&&<>
      <button type="button" className="kcp-toggle-row" aria-expanded={guideOpen} onClick={()=>setGuideOpen(x=>!x)}><span>Prompt guidance</span><span className={'kcp-toggle-track'+(guideOpen?' on':'')}><i/></span></button>
      {guideOpen&&<p className="kcp-explain">Add the subject, action, camera movement, lighting and a clear ending. Guidance does not rewrite your text or change what is submitted.</p>}
      <button type="button" className="kcp-more" aria-expanded={moreOpen} onClick={()=>setMoreOpen(v=>!v)}>Advanced options <ChevronDown size={16}/></button>
      {moreOpen&&<div className="kcp-more-content"><p>Reference Document and Reference Web Page inputs are not connected to this workflow. Upload only supported image references, if available.</p><div className="kcp-disabled-rows"><span><FileText size={16}/> Reference Document · unavailable</span><span><Globe2 size={16}/> Reference Web Page · unavailable</span></div></div>}
     </>}
     <div className="kcp-settings" aria-label="Generation settings">
      {compactType==='advanced'&&<Setting label="Workflow" icon={Layers3} value={mode} onChange={setMode} values={model.modes}/>}
      {model.duration&&<Setting label="Duration" icon={Clock3} value={duration} onChange={value=>setDuration(Number(value))} values={durations(model)} disabled={activeGeneration&&model.id!=='kling4_hf'}/>}
      <Setting label={isImage?'Quality':'Resolution'} icon={Sparkles} value={resolution} onChange={setResolution} values={model.resolution} disabled={activeGeneration&&model.id!=='kling4_hf'}/>
      <Setting label="Aspect ratio" icon={isImage?ImageIcon:Film} value={aspect} onChange={setAspect} values={model.aspect}/>
     </div>
     {model.cta&&<div className="kcp-workflow-notice" role="status"><ShieldCheck size={17}/><p>{model.premium?'Motion transfer requires your source video and replacement cast.':'Reference-video generation requires your source video and replacement photos.'} Upload these in the existing {model.premium?'K4K Motion Director':'Wan 3 Creator'} after selecting Continue.</p></div>}
     {!model.cta&&model.refs>0&&<div className="kcp-workflow-notice" role="status"><Info size={16}/><p>Reference media is a preview control. Only supported signed text-generation workflows can run here; non-text/reference generation remains gated.</p></div>}
     {error&&<p className="kcp-error" role="alert">{error}</p>}
    </div>
    <div className="kcp-action-area">
     {model.cta?<Link href={model.cta} className="kcp-continue"><Sparkles size={17}/> Continue to {model.premium?'Motion Director':'Wan 3 Creator'} <ArrowRight size={17}/></Link>:
       <CustomerCreativeGeneration key={model.id} model={model} mode={mode} prompt={prompt} aspect={aspect} duration={duration} resolution={resolution} referenceCount={files.length} onModels={onModels}/>}
    </div>
   </section>
   <section className="kcp-result" aria-labelledby="kcp-result-title">
    <div className="kcp-panel-head"><h2 id="kcp-result-title">Result</h2><span>{model.kind==='video'?'VIDEO':'IMAGE'}</span></div>
    <ResultArt model={model}/>
    <div className="kcp-result-details">
     <div className="kcp-result-title"><div><strong>{model.name}</strong><small>{model.demoUrl?'Uploaded demonstration · '+model.demoDurationSec+'s · '+model.demoAspect:'Branded preview · no example image supplied yet'}</small></div><span className="kcp-demo-badge">Preview only</span></div>
     <div className="kcp-result-pricing"><div><Info size={15}/><strong>Price & generation</strong></div><p>{model.cta?'Your exact credit quote is presented in the working '+(model.premium?'Motion Director.':'Wan 3 Creator.'): 'The signed K4K credit quote appears before you confirm a generation. Cost varies by approved model and settings.'} No credit is charged for viewing this example.</p></div>
     <div className="kcp-result-foot"><p>This is {model.demoUrl?'a supplied showcase video':'an interface preview'}, not the output of your prompt. Generated files are saved privately in your Library.</p><Link href="/k4k-app/videos">Open Library <ArrowUpRight size={15}/></Link></div>
    </div>
   </section>
  </div>
 </main>;
}
