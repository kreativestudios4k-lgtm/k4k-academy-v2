'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CheckCircle2,Clapperboard,Film,ImagePlus,Play,Search,Volume2,VolumeX} from 'lucide-react';
import catalogue from '../template-catalogue.json';
import {generationReference} from '../../../lib/template-generation.mjs';
import {useK4KLocale} from '../locale';
import './motion-explore.css';

const templates=[...new Map([...catalogue.discoveryPreviews,...catalogue.trending,...catalogue.topPerforming].filter(t=>t.videoUrl).map(t=>[t.id,t])).values()];
const ready=t=>{const r=generationReference(t);return r.supported&&r.seconds>=4&&!t.generationPaused};
export default function MotionExploreGallery(){
 const {locale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [selected,setSelected]=useState(templates[0]?.id||null),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[sound,setSound]=useState(false);
 const video=useRef(null);
 const shown=useMemo(()=>templates.filter(t=>(filter==='all'||(filter==='ready'?ready(t):!ready(t)))&&t.title.toLowerCase().includes(query.trim().toLowerCase())),[query,filter]);
 const current=templates.find(t=>t.id===selected)||templates[0];
 const playable=current&&ready(current);
 useEffect(()=>{const player=video.current;if(!player)return;player.muted=!sound;player.play().catch(()=>{})},[selected,sound]);
 useEffect(()=>{if(shown.length&&!shown.some(t=>t.id===selected))setSelected(shown[0].id)},[shown,selected]);
 if(!current)return <main className="kmx-root"><p>No templates available.</p></main>;
 return <main className="kmx-root">
  <header className="kmx-top">
   <Link className="kmx-logo" href="/k4k-app/motion"><img src="/k4k-mark.svg" width="30" height="30" alt=""/> K4K <span>Motion</span></Link>
   <nav aria-label="K4K creative navigation"><Link href="/k4k-app/image">Image</Link><Link href="/k4k-app/video">Video</Link><Link aria-current="page" href="/k4k-app/motion/explore">Motion Library</Link><Link href="/k4k-app/videos">My Generations</Link></nav>
   <Link className="kmx-top-create" href="/k4k-app/motion">Open Director Studio <ArrowRight size={16}/></Link>
  </header>
  <div className="kmx-shell">
   <section className="kmx-intro">
    <p className="kmx-eyebrow">K4K MOTION / EXPLORE</p>
    <h1>{tr('One video. Endless possibilities.','Um vídeo. Infinitas possibilidades.','Un vídeo. Posibilidades infinitas.')}</h1>
    <p>{tr('Choose a motion below, preview the scene, then open it in Director Studio to cast your characters.','Escolha uma cena, assista à prévia e abra no Director Studio para trocar os personagens.','Elige una escena, mira la vista previa y ábrela en Director Studio para cambiar personajes.')}</p>
   </section>
   <div className="kmx-layout">
    <aside className="kmx-controls" aria-label="Motion template setup">
     <div className="kmx-controls-title"><Clapperboard size={20}/><div><strong>K4K Motion</strong><small>{tr('Motion Transfer','Transferência de movimento','Transferencia de movimiento')}</small></div></div>
     <div className="kmx-field"><label>{tr('Selected scene','Cena selecionada','Escena seleccionada')}</label><strong>{current.title}</strong><small>{Math.round(current.durationSeconds||0)}s · {tr('Reference video','Vídeo de referência','Vídeo de referencia')}</small></div>
     <div className="kmx-field"><label>{tr('Character references','Referências de personagens','Referencias de personajes')}</label><span className="kmx-ref"><ImagePlus size={20}/>{Math.min(8,Math.max(1,Number(current.requiredImages||current.peopleCount||1)))} {tr('photo slots prepared in Director Studio','espaços de fotos no Director Studio','espacios de fotos en Director Studio')}</span></div>
     <p className="kmx-note">{tr('Previewing does not use credits. Generation requires a verified source, character photos and an approved quote.','Prévia sem consumo de créditos. Para gerar, confirme o vídeo, fotos e custo.','Vista previa sin créditos. Para generar, confirma el vídeo, las fotos y el coste.')}</p>
     {playable?<Link className="kmx-generate" href={'/k4k-app/motion?template='+encodeURIComponent(current.id)}><Play size={17}/>{tr('Use this motion','Usar este movimento','Usar este movimiento')}<ArrowRight size={17}/></Link>:<span className="kmx-unavailable">{tr('Preview only · generation unavailable for this length','Somente prévia · geração indisponível para esta duração','Solo vista previa · generación no disponible para esta duración')}</span>}
     <Link className="kmx-upload" href="/k4k-app/motion">{tr('Upload my own video instead','Enviar meu próprio vídeo','Subir mi propio vídeo')}</Link>
    </aside>
    <div className="kmx-content">
     <section className="kmx-preview" aria-label="Selected template preview">
      <div className="kmx-player">
       <video key={current.id} ref={video} src={current.videoUrl} poster={current.posterUrl||undefined} playsInline loop muted preload="metadata" onClick={()=>setSound(v=>!v)}/>
       <button type="button" className="kmx-sound" onClick={()=>setSound(v=>!v)} aria-label={sound?'Mute preview':'Unmute preview'}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>
      </div>
      <div className="kmx-preview-meta"><span className="kmx-eyebrow">SELECTED TEMPLATE</span><h2>{current.title}</h2><p>{Math.round(current.durationSeconds||0)}s · {tr('Keep the motion, change the cast','Mantenha o movimento, troque o elenco','Mantén el movimiento, cambia el reparto')}</p>{playable&&<span className="kmx-ready"><CheckCircle2 size={15}/> {tr('Ready to customise','Pronto para personalizar','Listo para personalizar')}</span>}</div>
     </section>
     <section className="kmx-library" aria-label="Motion template library">
      <div className="kmx-library-top"><div><span className="kmx-eyebrow">MOTION LIBRARY</span><h2>{tr('Explore templates','Explore os templates','Explora plantillas')}</h2></div><div className="kmx-filters"><label className="kmx-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr('Search scenes','Buscar cenas','Buscar escenas')} aria-label="Search motion templates"/></label><select aria-label="Filter templates" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{tr('All','Todos','Todos')}</option><option value="ready">{tr('Ready to create','Disponíveis','Disponibles')}</option><option value="preview">{tr('Preview only','Somente prévia','Solo vista previa')}</option></select></div></div>
      {shown.length?<div className="kmx-grid">{shown.map(t=><button type="button" key={t.id} className={'kmx-card'+(t.id===selected?' is-selected':'')} onClick={()=>{setSelected(t.id);setSound(false);document.querySelector('.kmx-preview')?.scrollIntoView({block:'nearest',behavior:'smooth'})}} aria-pressed={t.id===selected}><span className="kmx-thumb"><img loading="lazy" src={t.posterUrl||undefined} alt=""/><span>{Math.round(t.durationSeconds||0)}s</span></span><strong>{t.title}</strong><small>{ready(t)?tr('Ready to create','Pronto para criar','Listo para crear'):tr('Preview only','Somente prévia','Solo vista previa')}</small></button>)}</div>:<p className="kmx-empty">No matching templates.</p>}
     </section>
    </div>
   </div>
  </div>
 </main>;
}
