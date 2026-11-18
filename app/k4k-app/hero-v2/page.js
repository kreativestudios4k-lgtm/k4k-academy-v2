'use client';
// K4K single-viewport hero. Built to the supplied layout and motion spec, with
// K4K's own brand and copy: no other company's name, mark or statistics, and
// no media at all — the backdrop, grain and every icon are CSS or inline SVG.
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useK4KLocale} from '../locale';
import './hero-v2.css';

// Each figure below is checked against the model catalogue rather than invented.
const STATS=[
 {id:'models',label:{en:'12 image and video models',pt:'12 modelos de imagem e vídeo',es:'12 modelos de imagen y vídeo'},
  icon:<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="khg1" x1="3" y1="2" x2="14" y2="22"><stop offset="0" stopColor="#fff" stopOpacity=".38"/><stop offset="1" stopColor="#3a3a3a" stopOpacity=".62"/></linearGradient><linearGradient id="khg2" x1="3" y1="2" x2="14" y2="22"><stop offset="0" stopColor="#3a3a3a" stopOpacity=".38"/><stop offset="1" stopColor="#fff" stopOpacity=".62"/></linearGradient></defs><rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#khg1)"/><rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#khg2)"/><rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a"/></svg>},
 {id:'refs',label:{en:'Up to 16 reference images',pt:'Até 16 imagens de referência',es:'Hasta 16 imágenes de referencia'},
  icon:<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#e8e8e8"/><circle cx="9.3" cy="10" r="2.1" fill="#111"/><path d="M4.6 18.4c1.5-3 4-4.5 7.4-4.5s5.9 1.5 7.4 4.5" stroke="#111" strokeWidth="1.85" fill="none" strokeLinecap="round"/></svg>},
 {id:'length',label:{en:'2 to 30 second generations',pt:'Gerações de 2 a 30 segundos',es:'Generaciones de 2 a 30 segundos'},
  icon:<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.2" fill="none" stroke="#e8e8e8" strokeWidth="1.8"/><path d="M12 6.6V12l4 2.4" stroke="#e8e8e8" strokeWidth="1.85" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>},
];

export default function HeroV2(){
 const {locale}=useK4KLocale();
 const pt=locale==='pt',es=locale==='es';
 const tr=(en,br,spa)=>pt?br:es?spa:en;
 const L=obj=>pt?obj.pt:es?obj.es:obj.en;
 const root=useRef(null);
 const [menuOpen,setMenuOpen]=useState(false);

 // Resting opacity is 1, so the page is never blank if animations never run.
 // Mark each element done on its own animationend, with a rAF fallback.
 useEffect(()=>{
  const nodes=root.current?.querySelectorAll('.kh-appear,.kh-photo');
  if(!nodes?.length)return;
  nodes.forEach(node=>node.addEventListener('animationend',()=>node.classList.add('is-in'),{once:true}));
  let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
   nodes.forEach(node=>{
    const running=typeof node.getAnimations==='function'&&node.getAnimations().some(a=>a.playState==='running'||a.playState==='finished');
    if(!running)node.classList.add('is-in');
   });
  })});
  return()=>cancelAnimationFrame(frame);
 },[]);

 useEffect(()=>{
  if(!menuOpen)return;
  const onKey=event=>{if(event.key==='Escape')setMenuOpen(false)};
  const wide=window.matchMedia('(min-width: 901px)');
  const onWide=event=>{if(event.matches)setMenuOpen(false)};
  document.addEventListener('keydown',onKey);
  wide.addEventListener('change',onWide);
  document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',onKey);wide.removeEventListener('change',onWide);document.body.style.overflow=''};
 },[menuOpen]);

 const nav=[
  {label:tr('Studio','Estúdio','Estudio'),href:'/k4k-app/studio',cls:'kh-scale',d:'.16s'},
  {label:tr('Models','Modelos','Modelos'),href:'/k4k-app/studio?model=wan-prime',cls:'kh-soft',d:'.28s'},
  {label:tr('Plans','Planos','Planes'),href:'/k4k-app/credits',cls:'kh-scale',d:'.40s'},
  {label:tr('Support','Suporte','Soporte'),href:'/k4k-app/support',cls:'kh-soft',d:'.52s'},
 ];

 return <div className={'kh'+(menuOpen?' menu-open':'')} ref={root}>
  <div className="kh-grain" aria-hidden="true"/>
  <div className="kh-photo" aria-hidden="true"/>
  <div className="kh-page">
   <div className="kh-backdrop" aria-hidden="true" onClick={()=>setMenuOpen(false)}/>

   <header className="kh-header">
    <Link href="#top" className="kh-logo kh-appear kh-scale" style={{'--d':'.08s'}} aria-label="K4K APP">
     <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="2.6" y="2.6" width="6" height="18.8" rx="2.4"/>
      <path d="M11.2 12 20.6 2.6h-5.1L10.4 8.6v6.8l5.1 6h5.1z"/>
     </svg>
     K4K<i>.app</i>
    </Link>

    <nav className="kh-nav" id="kh-nav" aria-label={tr('Primary','Principal','Principal')}>
     {nav.map(item=><Link key={item.href} href={item.href} className={'kh-appear '+item.cls} style={{'--d':item.d}} onClick={()=>setMenuOpen(false)}>{item.label}</Link>)}
    </nav>

    <Link href="/k4k-app/register?plan=starter" className="kh-btn kh-solid kh-header-cta kh-appear kh-scale" style={{'--d':'.34s'}}>
     {tr('Start for free','Comece grátis','Empieza gratis')}
    </Link>

    <button type="button" className="kh-burger kh-appear kh-scale" style={{'--d':'.34s'}}
     aria-controls="kh-nav" aria-expanded={menuOpen}
     aria-label={menuOpen?tr('Close menu','Fechar menu','Cerrar menú'):tr('Open menu','Abrir menu','Abrir menú')}
     onClick={()=>setMenuOpen(open=>!open)}><b/><b/><b/></button>
   </header>

   <main className="kh-hero" id="top">
    <div className="kh-copy">
     <span className="kh-badge kh-appear kh-pop" style={{'--d':'.22s'}}>
      <svg className="kh-star" width="18" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z"/></svg>
      {tr('AI video and image studio','Estúdio de vídeo e imagem com IA','Estudio de vídeo e imagen con IA')}
     </span>

     <h1>
      <span className="kh-line kh-appear kh-mask" style={{'--d':'.42s'}}>{tr("Don't follow",'Não siga','No sigas')} <em>{tr('the trend','a tendência','la tendencia')}</em>.</span>
      <span className="kh-line kh-appear kh-mask" style={{'--d':'.62s'}}>{tr('Create it.','Crie a sua.','Créala.')}</span>
     </h1>

     <p className="kh-lede kh-appear kh-soft" style={{'--d':'.82s',animationDuration:'1.25s'}}>
      {tr('Bring a reference, cast your own characters, and keep every frame you make.','Traga uma referência, escolha seus personagens e guarde cada quadro que criar.','Trae una referencia, elige tus personajes y conserva cada fotograma que crees.')}
     </p>

     <div className="kh-hero-actions">
      <Link href="/k4k-app/register?plan=starter" className="kh-btn kh-solid kh-appear kh-abtn" style={{'--d':'.96s'}}>{tr('Start for free','Comece grátis','Empieza gratis')}</Link>
      <Link href="/k4k-app/studio" className="kh-btn kh-ghost kh-appear kh-side" style={{'--d':'1.10s'}}>{tr('See it in action','Veja funcionando','Míralo en acción')}</Link>
     </div>
    </div>
   </main>

   <footer className="kh-stats">
    {STATS.map((stat,i)=><span className="kh-stat kh-appear kh-astat" key={stat.id} style={{'--d':(1.12+i*0.16).toFixed(2)+'s'}}>
     {stat.icon}{L(stat.label)}
    </span>)}
   </footer>
  </div>
 </div>;
}
