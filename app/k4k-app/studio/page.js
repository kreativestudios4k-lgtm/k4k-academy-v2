'use client';
// One studio shell that every model opens into, built alongside the existing
// routes rather than replacing them. It owns no credit, quote or settlement
// logic: models with a proven live path hand off to that path, and every other
// model says plainly that it cannot generate yet.
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Film,Images,Plus,X,Search,ArrowRight,Sparkles} from 'lucide-react';
import PreviewShell from '../PreviewShell';
import {CREATION_MODELS,publicCreationModels,publicCreationModelGroups} from '../../../lib/creation-studio-catalog.mjs';
import {creativeModelReadiness} from '../../../lib/creative-provider-readiness.mjs';
import {useK4KLocale} from '../locale';
import './studio.css';

const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
const MAX_IMAGE=10*1024*1024;

// The only two paths that reach a provider today. Everything else in the
// catalogue is discovery until its provider work is finished.
const LIVE_PATHS={
 'k4k-motion-lite':'/k4k-app/motion?model=lite',
 'k4k-motion-ultra':'/k4k-app/motion?model=ultra',
 'wan-prime':'/k4k-app/creator',
};

export default function Studio(){
 const {locale}=useK4KLocale();
 const pt=locale==='pt',es=locale==='es';
 const tr=(en,br,spa)=>pt?br:es?spa:en;

 const [kind,setKind]=useState('video');
 const [id,setId]=useState('k4k-motion-lite');
 const [pickerOpen,setPickerOpen]=useState(false),[query,setQuery]=useState('');
 const model=useMemo(()=>CREATION_MODELS.find(x=>x.id===id)||CREATION_MODELS[0],[id]);
 const [mode,setMode]=useState(model.modes[0]);
 const [resolution,setResolution]=useState(model.resolution[0]);
 const [aspect,setAspect]=useState(model.aspect[0]);
 const [duration,setDuration]=useState(model.duration?.[0]||5);
 const [prompt,setPrompt]=useState('');
 const [refs,setRefs]=useState([]);
 const [error,setError]=useState('');

 useEffect(()=>()=>{refs.forEach(item=>URL.revokeObjectURL(item.url))},[refs]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const wanted=CREATION_MODELS.find(x=>x.id===params.get('model'));
  if(wanted)select(wanted);
 },[]);

 function select(next){
  setId(next.id);setKind(next.kind);setMode(next.modes[0]);
  setResolution(next.resolution[0]);setAspect(next.aspect[0]);
  setDuration(next.duration?.[0]||5);
  setRefs(old=>{old.slice(next.refs).forEach(item=>URL.revokeObjectURL(item.url));return old.slice(0,next.refs)});
  setError('');setPickerOpen(false);
  window.history.replaceState(null,'','/k4k-app/studio?model='+encodeURIComponent(next.id));
 }
 function addRefs(event){
  const chosen=Array.from(event.target.files||[]);event.target.value='';
  const ok=chosen.filter(file=>IMAGE_TYPES.includes(file.type)&&file.size<=MAX_IMAGE);
  if(ok.length<chosen.length)setError(tr('Use JPG, PNG or WebP files up to 10 MB.','Use JPG, PNG ou WebP de até 10 MB.','Usa JPG, PNG o WebP de hasta 10 MB.'));
  else setError('');
  setRefs(old=>[...old,...ok.map(file=>({file,url:URL.createObjectURL(file)}))].slice(0,model.refs));
 }
 function removeRef(index){setRefs(old=>old.filter((item,i)=>{if(i===index)URL.revokeObjectURL(item.url);return i!==index}))}

 const livePath=LIVE_PATHS[model.id];
 const readiness=creativeModelReadiness(model.id,mode);
 const groups=publicCreationModelGroups(kind);
 const siblings=publicCreationModels(kind).filter(item=>item.id!==model.id);
 const searching=query.trim().toLowerCase();

 return <PreviewShell active="Creator" studio>
  <div className="kst">
   <aside className="kst-rail" aria-label={tr('Creation settings','Configurações de criação','Ajustes de creación')}>
    <div className="kst-brand"><img src="/k4k-mark.svg" alt=""/><strong>K4K <span>STUDIO</span></strong></div>
    <div className="kst-scroll">
     <div className="kst-kinds" role="group" aria-label={tr('Media type','Tipo de mídia','Tipo de medio')}>
      <button type="button" aria-pressed={kind==='video'} onClick={()=>{if(kind!=='video')select(publicCreationModels('video')[0])}}><Film size={15}/>{tr('Video','Vídeo','Vídeo')}</button>
      <button type="button" aria-pressed={kind==='image'} onClick={()=>{if(kind!=='image')select(publicCreationModels('image')[0])}}><Images size={15}/>{tr('Image','Imagem','Imagen')}</button>
     </div>

     <button type="button" className="kst-pick" aria-expanded={pickerOpen} onClick={()=>setPickerOpen(open=>!open)}>
      {model.demoUrl?<video className="kst-pick-art" src={model.demoUrl} muted playsInline preload="metadata"/>:<span className="kst-pick-art"/>}
      <span style={{minWidth:0}}><b>{model.name}</b><small>{model.premium?tr('K4K Motion','K4K Motion','K4K Motion'):model.displayProvider||model.provider}</small></span>
     </button>

     {pickerOpen&&<div className="kst-pick-list">
      <label style={{display:'flex',alignItems:'center',gap:8}}><Search size={14}/><input aria-label={tr('Search models','Buscar modelos','Buscar modelos')} placeholder={tr('Search models…','Buscar modelos…','Buscar modelos…')} value={query} onChange={e=>setQuery(e.target.value)}/></label>
      {groups.map(group=>{
       const items=group.models.filter(item=>item.name.toLowerCase().includes(searching));
       if(!items.length)return null;
       return <div key={group.id}>
        <p className="kst-group">{group.title}</p>
        {items.map(item=><button type="button" key={item.id} className="kst-opt" aria-pressed={item.id===model.id} onClick={()=>select(item)}>
         {item.demoUrl?<img src={item.demoUrl.replace(/\.mp4$/,'.jpg')} alt="" onError={e=>{e.currentTarget.style.visibility='hidden'}}/>:<img alt="" style={{visibility:'hidden'}}/>}
         <span style={{minWidth:0}}><b>{item.name}</b><small>{LIVE_PATHS[item.id]?tr('Ready to create','Pronto para criar','Listo para crear'):tr('Not connected yet','Ainda não conectado','Aún no conectado')}</small></span>
        </button>)}
       </div>;
      })}
     </div>}

     {model.modes.length>1&&<label className="kst-field">{tr('Workflow','Ferramenta','Flujo')}
      <select value={mode} onChange={e=>setMode(e.target.value)}>{model.modes.map(item=><option key={item}>{item}</option>)}</select></label>}

     <div className="kst-two">
      <label className="kst-field">{tr('Quality','Qualidade','Calidad')}
       <select value={resolution} onChange={e=>setResolution(e.target.value)}>{model.resolution.map(item=><option key={item}>{item}</option>)}</select></label>
      <label className="kst-field">{tr('Aspect','Proporção','Formato')}
       <select value={aspect} onChange={e=>setAspect(e.target.value)}>{model.aspect.map(item=><option key={item}>{item}</option>)}</select></label>
     </div>

     {model.duration&&<label className="kst-field">{tr('Duration','Duração','Duración')} · {duration}s
      <select value={duration} onChange={e=>setDuration(Number(e.target.value))}>
       {Array.from({length:model.duration[1]-model.duration[0]+1},(x,i)=>model.duration[0]+i).map(value=><option key={value} value={value}>{value}s</option>)}
      </select></label>}

     {model.refs>0&&<div className="kst-field">{tr('Reference images','Imagens de referência','Imágenes de referencia')} · {refs.length}/{model.refs}
      <div className="kst-refs">
       {refs.map((item,i)=><div className="kst-ref" key={item.url}><img src={item.url} alt={'Reference '+(i+1)}/><button type="button" aria-label={'Remove reference '+(i+1)} onClick={()=>removeRef(i)}><X size={10}/></button></div>)}
       {refs.length<model.refs&&<label className="kst-add"><Plus size={16}/><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addRefs} aria-label={tr('Add reference images','Adicionar imagens','Añadir imágenes')}/></label>}
      </div>
     </div>}

     <label className="kst-field">{tr('Prompt','Instruções','Instrucciones')}
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,2000))} maxLength={2000} placeholder={tr('Describe your scene, characters, movement and mood…','Descreva sua cena, personagens, movimento e atmosfera…','Describe tu escena, personajes, movimiento y ambiente…')}/></label>

     {error&&<p role="alert" className="kst-warn">{error}</p>}
     {!livePath&&<p className="kst-warn" role="status">{tr('This model is not connected to a provider yet, so it cannot generate and no credits can be charged for it.','Este modelo ainda não está conectado a um fornecedor, portanto não pode gerar e nenhum crédito é cobrado.','Este modelo aún no está conectado a un proveedor, así que no puede generar y no se cobran créditos.')}{readiness.status==='unsupported-mode'?' '+tr('This workflow is not available for it.','Esta ferramenta não está disponível para ele.','Este flujo no está disponible para él.'):''}</p>}
    </div>

    <div className="kst-foot">
     {livePath
      ?<Link className="kst-go" href={livePath}><Sparkles size={16}/>{tr('Open','Abrir','Abrir')} {model.name}<ArrowRight size={16}/></Link>
      :<button type="button" className="kst-go" disabled>{tr('Not connected yet','Ainda não conectado','Aún no conectado')}</button>}
     <p>{tr('Your credit cost is shown and confirmed before anything is generated.','O custo em créditos é exibido e confirmado antes de gerar.','El coste en créditos se muestra y confirma antes de generar.')}</p>
    </div>
   </aside>

   <section className="kst-main" aria-label={tr('Model','Modelo','Modelo')}>
    <div className="kst-head">
     <div style={{minWidth:0,flex:1}}>
      <h1>{model.name}</h1>
      <p>{model.description}</p>
     </div>
     <span className={'kst-chip '+(livePath?'live':'soon')}>{livePath?tr('Ready to create','Pronto para criar','Listo para crear'):tr('Not connected yet','Ainda não conectado','Aún no conectado')}</span>
    </div>

    <div className="kst-stage">
     {model.demoUrl
      ?<video src={model.demoUrl} muted loop playsInline autoPlay preload="metadata"/>
      :<p className="kst-stage-empty">{tr('No preview for this model yet.','Ainda sem prévia para este modelo.','Aún no hay vista previa de este modelo.')}</p>}
    </div>

    <div className="kst-specs">
     <span className="kst-spec"><b>{model.modes.join(' · ')}</b></span>
     <span className="kst-spec">{tr('Quality','Qualidade','Calidad')} <b>{model.resolution.join(' / ')}</b></span>
     {model.duration&&<span className="kst-spec">{tr('Length','Duração','Duración')} <b>{model.duration[0]}–{model.duration[1]}s</b></span>}
     <span className="kst-spec">{tr('References','Referências','Referencias')} <b>{model.refs}</b></span>
    </div>

    <div className="kst-more">
     <h2>{kind==='video'?tr('Other video models','Outros modelos de vídeo','Otros modelos de vídeo'):tr('Other image models','Outros modelos de imagem','Otros modelos de imagen')}</h2>
     <div className="kst-grid">
      {siblings.map(item=><button type="button" key={item.id} className="kst-card" onClick={()=>select(item)}>
       {item.demoUrl?<video className="kst-card-art" src={item.demoUrl} muted loop playsInline preload="metadata" onMouseEnter={e=>e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0}}/>:<span className="kst-card-art"/>}
       <span className="kst-card-body"><b>{item.name}</b><small>{LIVE_PATHS[item.id]?tr('Ready to create','Pronto para criar','Listo para crear'):tr('Not connected yet','Ainda não conectado','Aún no conectado')}</small></span>
      </button>)}
     </div>
    </div>
   </section>
  </div>
 </PreviewShell>;
}
