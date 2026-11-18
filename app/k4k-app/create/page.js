'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Images,Film,Layers,Upload,Plus,X,Copy,Check,ShieldCheck,Sparkles,SlidersHorizontal,Play,CheckCircle2,Clock3,Search,ChevronDown,ImagePlus} from 'lucide-react';
import {CREATION_MODELS,creationModels,publicCreationModels,publicCreationModelGroups,creationBrief} from '../../../lib/creation-studio-catalog.mjs';
import {creativeModelReadiness} from '../../../lib/creative-provider-readiness.mjs';
import CustomerCreativeGeneration from '../CustomerCreativeGeneration';
import VideoGenerationPopup from '../VideoGenerationPopup';
import ModelSelectionAnimation from '../ModelSelectionAnimation';
import CompactCreationStudio from '../CompactCreationStudio';
import {useK4KLocale} from '../locale';
import './create.css';
import StudioSidebar from '../StudioSidebar';
const UI={en:{eyebrow:'K4K CREATIVE STUDIO',headline:'Create what you imagine.',subtitle:'Choose Image or Video, select a model, and review the credit cost before creating. Advanced reference tools are shown only when supported.',images:'Images',videos:'Videos',models:'AI MODELS',settings:'CREATIVE CONTROLS',prompt:'Your prompt',placeholder:'Describe your scene, lighting, characters, movement and mood…',mode:'Workflow',resolution:'Quality',ratio:'Aspect ratio',duration:'Duration',reference:'Reference images',add:'Add references',preview:'Prepared references',copy:'Copy creative brief',copied:'Copied',active:'Workflow available',pilot:'API preview',pending:'Integration planned',open:'Open Wan 3',ready:'This workflow is not yet available',note:'No credits are charged on this page. Pending models cannot generate yet.',actions:'NEXT STEP',library:'My videos',explore:'Explore templates',title:'Your creation starts here',hint:'K4K Motion is premium character swapping. Wan 3 (Wan-powered) is the standard video generation tool.'},pt:{eyebrow:'K4K ESTÚDIO CRIATIVO',headline:'Crie sem limites.',subtitle:'Imagem e vídeo no mesmo lugar. Escolha um modelo, prepare suas referências e desenvolva sua ideia.',images:'Imagens',videos:'Vídeos',models:'MODELOS DE IA',settings:'CONTROLES CRIATIVOS',prompt:'Seu prompt',placeholder:'Descreva sua cena, iluminação, personagens, movimento e atmosfera…',mode:'Ferramenta',resolution:'Qualidade',ratio:'Proporção',duration:'Duração',reference:'Imagens de referência',add:'Adicionar referências',preview:'Referências preparadas',copy:'Copiar briefing',copied:'Copiado',active:'Ferramenta disponível',pilot:'Prévia da API',pending:'Integração planejada',open:'Abrir Wan 3',ready:'Prévia — geração ainda não conectada',note:'Nenhum crédito é cobrado nesta página. Os novos modelos ainda não podem gerar.',actions:'PRÓXIMO PASSO',library:'Meus vídeos',explore:'Explorar templates',title:'Sua criação começa aqui',hint:'Escolha um modelo e prepare seu briefing. Use o Wan 3 enquanto conectamos os modelos premium.'},es:{eyebrow:'K4K ESTUDIO CREATIVO',headline:'Crea sin límites.',subtitle:'Imágenes y vídeo en un solo lugar. Elige un modelo y prepara tus referencias.',images:'Imágenes',videos:'Vídeos',models:'MODELOS DE IA',settings:'CONTROLES CREATIVOS',prompt:'Tu prompt',placeholder:'Describe tu escena, iluminación, personajes, movimiento y ambiente…',mode:'Flujo',resolution:'Calidad',ratio:'Formato',duration:'Duración',reference:'Imágenes de referencia',add:'Agregar referencias',preview:'Referencias preparadas',copy:'Copiar briefing',copied:'Copiado',active:'Flujo disponible',pilot:'Vista previa API',pending:'Integración pendiente',open:'Abrir Wan 3',ready:'Vista previa — generación aún no conectada',note:'No se cobran créditos aquí. Los modelos pendientes aún no generan.',actions:'SIGUIENTE PASO',library:'Mis vídeos',explore:'Explorar plantillas',title:'Tu creación comienza aquí',hint:'Selecciona un modelo y prepara el briefing. Puedes seguir usando Wan 3.'}};
export default function CreativeStudio(){
 const {locale}=useK4KLocale(),t=UI[locale]||UI.en;
 const [kind,setKind]=useState('video'),[id,setId]=useState('wan-prime');
 const model=useMemo(()=>CREATION_MODELS.find(x=>x.id===id)||CREATION_MODELS[0],[id]);
 const [mode,setMode]=useState(model.modes[0]),[resolution,setResolution]=useState(model.resolution[0]),[aspect,setAspect]=useState(model.aspect[0]),[duration,setDuration]=useState(model.duration?.[0]||5);
 const [prompt,setPrompt]=useState(''),[files,setFiles]=useState([]),[copied,setCopied]=useState(false),[error,setError]=useState('');
 const [customerModels,setCustomerModels]=useState({});
 const [modelPickerOpen,setModelPickerOpen]=useState(false),[modelQuery,setModelQuery]=useState('');
 const [generatorOpen,setGeneratorOpen]=useState(false);
 const visiblePickerModels=publicCreationModels(kind).filter(item=>item.name.toLowerCase().includes(modelQuery.trim().toLowerCase()));
 const selectedLive=customerModels[model.id]===true&&((model.kind==='video'&&mode==='Text to video')||(model.kind==='image'&&mode==='Text to image'));
 useEffect(()=>{if(selectedLive){setResolution(model.id==='kling4_hf'?'720p':model.id==='kling4_0'?'720p':model.id==='seedance_2_5'?'480p':'1K');if(model.duration&&model.id!=='kling4_hf')setDuration(5)}},[selectedLive,model.id]);
 function chooseModel(next){
  // Keep all selected models on the same full-page creation workspace. The
  // K4K Cinema popup remains opt-in, never an automatic detour.
  setGeneratorOpen(false);
  setModelPickerOpen(false);
  setKind(next.kind);
  setId(next.id);
  setMode(next.modes[0]);
  setResolution(next.resolution[0]);
  setAspect(next.id==='kling4_hf'?'16:9':next.aspect[0]);
  setDuration(next.duration?.[0]||5);
  setFiles(old=>old.slice(0,next.refs));
  setError('');
  const nextUrl='/k4k-app/create?kind='+encodeURIComponent(next.kind)+'&model='+encodeURIComponent(next.id);
  window.history.replaceState(null,'',nextUrl);
}
 function chooseKind(next){setKind(next);chooseModel(publicCreationModels(next)[0]);}
 function openVideoPopup(){if(model.id!=='kling4_hf')return;if(model.aspect.includes('16:9'))setAspect('16:9');setGeneratorOpen(true);}
 useEffect(()=>{
  // Named Image and Video destinations stay on the same proven generation
  // backend, selecting only catalog models permitted for the chosen tab.
  const params=new URLSearchParams(window.location.search);
  const requestedKind=params.get('kind');
  if(!['image','video'].includes(requestedKind))return;
  const requested=CREATION_MODELS.find(m=>m.id===params.get('model')&&m.kind===requestedKind);
  const fallback=requestedKind==='image'?'nano_banana_2':'seedance_2_5';
  const selected=requested||CREATION_MODELS.find(m=>m.id===fallback);
  if(selected){setKind(requestedKind);chooseModel(selected)}
 },[]);

 async function copyBrief(){try{const brief=creationBrief(model,{mode,resolution,aspect,duration,prompt,references:files.length});await navigator.clipboard.writeText(brief);setCopied(true);setError('')}catch(e){setCopied(false);setError(e.message==='PROMPT_REQUIRED'?(locale==='pt'?'Adicione um prompt antes de copiar.':'Write a prompt before copying.'):'Clipboard is unavailable.')} }
 function addFiles(list){const accepted=Array.from(list||[]).filter(f=>['image/jpeg','image/png','image/webp'].includes(f.type)&&f.size<=10*1024*1024);setFiles(old=>[...old,...accepted].slice(0,model.refs));setError(accepted.length<Array.from(list||[]).length?'Use JPG, PNG or WebP files up to 10 MB.':'')}
 const providerReadiness=creativeModelReadiness(model.id,mode);
 const [thumbnails,setThumbnails]=useState([]);useEffect(()=>{const urls=files.map(f=>URL.createObjectURL(f));setThumbnails(urls);return()=>urls.forEach(u=>URL.revokeObjectURL(u))},[files]);
 // The compact Input | Result experience is the default. A deliberate ?classic=1
 // query remains available as a safe, temporary visual fallback during review;
 // it does not change any generation routing or billing rules.
 const [classicView,setClassicView]=useState(false);
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('classic')==='1')setClassicView(true)},[]);
 if(!classicView)return <CompactCreationStudio
  model={model} kind={kind} mode={mode} setMode={setMode}
  resolution={resolution} setResolution={setResolution}
  aspect={aspect} setAspect={setAspect}
  duration={duration} setDuration={setDuration}
  prompt={prompt} setPrompt={setPrompt}
  files={files} setFiles={setFiles} thumbnails={thumbnails} addFiles={addFiles}
  onSelectModel={chooseModel} customerModels={customerModels} onModels={setCustomerModels} error={error}
 />;
 return <main className="kcs-root">
  <header className="kcs-nav"><Link className="kcs-brand" href="/k4k-app"><img src="/k4k-mark.svg" width="29" height="29" alt=""/> K4K<span> APP</span></Link><div className="kcs-main-links" role="navigation" aria-label="Creative Studio navigation"><Link href="/k4k-app/dashboard">Dashboard</Link><Link href="/k4k-app/image" aria-current={kind==='image'?'page':undefined}>Image</Link><Link href="/k4k-app/video" aria-current={kind==='video'?'page':undefined}>Video</Link><Link href="/k4k-app/motion">K4K Motion</Link></div><Link href="/k4k-app/videos" className="kcs-library-link">{t.library}<ArrowUpRight size={15}/></Link></header>
  <div className="k4k-dashboard-frame"><StudioSidebar active={kind}/><div className="k4k-dashboard-main">
  <div className="kcs-shell">
   <section className="kcs-hero"><div className="kcs-eyebrow"><Sparkles size={13}/>{t.eyebrow}</div><h1>{t.headline}</h1><p>{t.subtitle}</p><div className="kcs-segments" role="tablist" aria-label="Output type"><button role="tab" aria-selected={kind==='video'} className={kind==='video'?'selected':''} onClick={()=>chooseKind('video')}><Film size={18}/>{t.videos}</button><button role="tab" aria-selected={kind==='image'} className={kind==='image'?'selected':''} onClick={()=>chooseKind('image')}><Images size={18}/>{t.images}</button></div></section>
   <section className="kcs-dashboard-metrics" aria-label="Creative workspace overview">
      <article><span>Workspace</span><strong>{kind==='image'?'Image Studio':'Video Studio'}</strong><small>Choose the output you want</small></article>
      <article><span>Listed AI models</span><strong>{publicCreationModels(kind).length}</strong><small>Availability varies by workflow</small></article>
      <article><span>Selected model</span><strong>{model.name}</strong><small>{model.displayProvider||model.provider}</small></article>
      <article><span>Selected quality</span><strong>{resolution}</strong><small>{selectedLive?'Verified live workflow':model.status==='active'?'Existing generator available':'Check workflow readiness'}</small></article>
   </section>
   <div className="kcs-workspace-heading"><div><span>CREATE / {kind==='image'?'IMAGE':'VIDEO'}</span><h2>{kind==='image'?'Image Studio':'Video Studio'}</h2></div><button type="button" className="kcs-model-picker-trigger" aria-haspopup="dialog" onClick={()=>{setModelQuery('');setModelPickerOpen(true)}}><span>Model</span><strong>{model.name}</strong><ChevronDown size={18}/></button></div>
   <div className="kcs-layout"><aside className="kcs-models"><div className="kcs-section-label"><Layers size={15}/>{t.models}<span>{publicCreationModels(kind).length}</span></div><div className="kcs-model-grid">{publicCreationModelGroups(kind).map(group=><div className="kcs-model-group" key={group.id}><h3 style={{fontSize:11,color:"#bbb",letterSpacing:1.2,textTransform:"uppercase",margin:"16px 0 10px"}}>{group.title}</h3>{group.models.map(item=><button key={item.id} type="button" onClick={()=>chooseModel(item)} aria-pressed={id===item.id} className={'kcs-model '+(id===item.id?'current':'')}><span className="kcs-model-icon">{item.kind==='image'?<Images size={19}/>:<Film size={19}/>}</span><span className="kcs-model-info"><strong>{item.name}{item.premium?' · '+item.resolution[0]:''}</strong><small>{item.premium?'K4K Premium':item.displayProvider||item.provider}</small><em>{item.description}</em></span><span className={'kcs-indicator '+item.status} title={item.status==='active'?t.active:customerModels[item.id]?'Live customer generation':item.status==='provider-verified'?'Provider verified · other modes gated':item.status==='api-pilot'?t.pilot:t.pending}/></button>)}</div>)}</div></aside>
   <section className="kcs-compose"><div className="kcs-compose-top"><div className="kcs-section-label"><SlidersHorizontal size={15}/>{t.settings}</div><span className={'kcs-state '+model.status}>{model.status==='active'?<CheckCircle2 size={14}/>:<Clock3 size={14}/>} {model.status==='active'?t.active:selectedLive?'Live · credits quoted before generation':model.status==='provider-verified'?'Not yet available':model.status==='api-pilot'?t.pilot:t.pending}</span></div>
    <h2>{model.name}</h2><p className="kcs-desc">{model.description}</p><ModelSelectionAnimation key={model.id} model={model}/>{model.premium&&<div className="kcs-note" role="status"><ShieldCheck size={17}/><p><strong>K4K Motion · {model.resolution[0]}</strong> — Create through the live K4K Motion Director. Select a supported source, upload your cast, then review the verified credit quote before you confirm Generate.</p></div>}
    <div className="kcs-flow-steps"><span className="is-current">01 · Model</span><span>{model.cta?"02 · Open working creator":"02 · Prompt & options"}</span><span>{model.cta?"03 · Generate in creator":"03 · Generate"}</span></div>
    {model.cta&&<div className="kcs-note kcs-specialist-intro" role="status"><ShieldCheck size={17}/><p><strong>{model.premium?'K4K Motion Director':'Wan 3 Creator'}</strong> — {model.premium?'This model uses source-video motion transfer and numbered character references. Continue to its dedicated Director to upload the source, match your cast and confirm a verified credit quote.':'This model uses an existing reference-video generation workflow. Continue to its working creator to upload a source video and character references.'} No credits are charged in this model showcase.</p></div>}
    {!model.cta&&<>
    <div className="kcs-fields"><label>{t.mode}<select value={mode} onChange={e=>setMode(e.target.value)}>{model.modes.map(v=><option key={v}>{v}</option>)}</select></label><label>{t.resolution}<select value={resolution} disabled={selectedLive&&model.id!=='kling4_hf'} onChange={e=>setResolution(e.target.value)}>{model.resolution.map(v=><option key={v}>{v}</option>)}</select></label><label>{t.ratio}<select value={aspect} onChange={e=>setAspect(e.target.value)}>{model.aspect.map(v=><option key={v}>{v}</option>)}</select></label>{model.duration&&<label>{t.duration}<select value={duration} disabled={selectedLive&&model.id!=='kling4_hf'} onChange={e=>setDuration(Number(e.target.value))}>{Array.from({length:model.duration[1]-model.duration[0]+1},(_,i)=>model.duration[0]+i).map(n=><option value={n} key={n}>{n}s</option>)}</select></label>}</div>
    <label className="kcs-prompt-label"><span className="kcs-prompt-title"><Sparkles size={17}/>{t.prompt}</span><textarea value={prompt} maxLength={10000} onChange={e=>{setPrompt(e.target.value);setCopied(false)}} placeholder={t.placeholder} rows={6}/></label>
    {model.refs>0&&<><div className="kcs-reference-head"><strong>{t.reference}</strong><span>{files.length} / {model.refs}</span></div><div className="kcs-refs">{thumbnails.map((url,i)=><div key={url} className="kcs-thumb"><img alt={'Reference '+(i+1)} src={url}/><button aria-label={'Remove reference '+(i+1)} onClick={()=>setFiles(old=>old.filter((_,j)=>j!==i))}><X size={13}/></button></div>)}{files.length<model.refs&&<label className="kcs-add"><Plus size={21}/><span>{t.add}</span><input multiple accept="image/png,image/jpeg,image/webp" type="file" onChange={e=>{addFiles(e.target.files);e.target.value=''}}/></label>}</div></>}
    </>}
    {model.status==='provider-verified'&&<div className="kcs-note" role="status"><ShieldCheck size={17}/><p><strong>{selectedLive?'Ready to create':'Workflow availability'}</strong> — {selectedLive?'Choose your prompt and review the exact credit price before generating. Your finished work is saved privately.':'This specific workflow is not yet enabled for customer generation. Choose an available model or workflow; no credits are charged for selecting a tool.'}</p></div>}
    {!model.cta&&model.refs===0&&<div className="kcs-input-info"><ImagePlus size={18}/><p>Text prompt only for this model. Image reference uploads and edits will appear here only when the selected API supports them.</p></div>}
    
    {model.id==='kling4_hf'&&<button type="button" className="kcs-video-popup-launch" onClick={openVideoPopup}><Play size={18}/> Optional two-panel preview <span>16:9 demo</span><ArrowUpRight size={17}/></button>}
    {!model.cta&&model.status==='provider-verified'&&<CustomerCreativeGeneration model={model} mode={mode} prompt={prompt} aspect={aspect} duration={duration} resolution={resolution} referenceCount={files.length} onModels={setCustomerModels}/>}
    {!model.cta&&<div className="kcs-note"><ShieldCheck size={17}/><p>{selectedLive?'Credits are only reserved after you confirm a signed generation quote.':t.note}</p></div>}
    {error&&<p className="kcs-error" role="alert">{error}</p>}
    <div className="kcs-actions">{!model.cta&&<button type="button" onClick={copyBrief} className="kcs-copy">{copied?<Check size={17}/>:<Copy size={17}/>} {copied?t.copied:t.copy}</button>}{model.cta?<Link className="kcs-launch" href={model.cta}><Play size={17}/>{model.premium?'Continue to Motion Director':t.open}<ArrowRight size={17}/></Link>:selectedLive?<span className="kcs-launch"><CheckCircle2 size={17}/> Model ready above</span>:<span className="kcs-disabled"><Clock3 size={17}/>{t.ready}</span>}</div>
   </section></div>
  </div>
  </div></div>
  <VideoGenerationPopup open={generatorOpen} setOpen={setGeneratorOpen} model={model} mode={mode} setMode={setMode} prompt={prompt} setPrompt={setPrompt} aspect={aspect} setAspect={setAspect} duration={duration} setDuration={setDuration} resolution={resolution} setResolution={setResolution} files={files} setFiles={setFiles} thumbnails={thumbnails} addFiles={addFiles} onModels={setCustomerModels}/>
  {modelPickerOpen&&<div className="kcs-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModelPickerOpen(false)}}><section className="kcs-model-dialog" role="dialog" aria-modal="true" aria-label="Choose creation model"><header><div><span>K4K APP · MODELS</span><h2>Select model</h2></div><button type="button" aria-label="Close model picker" onClick={()=>setModelPickerOpen(false)}><X size={21}/></button></header><div className="kcs-dialog-tabs" role="group" aria-label="Choose image or video">{['image','video'].map(k=><button key={k} type="button" aria-pressed={kind===k} onClick={()=>{chooseKind(k);setModelPickerOpen(true);setModelQuery('')}}>{k==='image'?<Images size={17}/>:<Film size={17}/>} {k==='image'?'Image':'Video'}</button>)}</div><label className="kcs-search-model"><Search size={19}/><input autoFocus value={modelQuery} onChange={e=>setModelQuery(e.target.value)} placeholder="Search available models" aria-label="Search models"/></label><div className="kcs-dialog-list">{visiblePickerModels.length?visiblePickerModels.map(item=><button type="button" key={item.id} className={'kcs-dialog-model'+(item.id===model.id?' active':'')} onClick={()=>chooseModel(item)}><span className="kcs-dialog-model-icon">{item.kind==='image'?<Images size={22}/>:<Film size={22}/>}</span><span><strong>{item.name}</strong><small>{item.description}</small></span>{item.id===model.id?<CheckCircle2 size={18}/>:<ArrowRight size={18}/>}</button>):<p>No models found.</p>}</div><footer>Models display only their verified K4K workflows. Generation requires a signed credit confirmation.</footer></section></div>}
 </main>;
}
