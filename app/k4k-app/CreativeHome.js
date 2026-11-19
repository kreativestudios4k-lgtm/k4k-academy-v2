'use client';

import {useState,useEffect,useRef} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Check,ChevronDown,Film,Globe2,Images,Menu,Play,Sparkles,Clapperboard,BriefcaseBusiness,X} from 'lucide-react';
import catalogue from './template-catalogue.json';
import {CREATION_MODELS} from '../../lib/creation-studio-catalog.mjs';
import {useK4KLocale} from './locale';
import {useVerifiedAccount} from './useVerifiedAccount';
import AccountMenu from './AccountMenu';
import './k4k-clean-home.css';

// The user-supplied 8-second K4K chrome film, stored at the approved media CDN.
// Keep the public hero as a non-billable presentation asset. Changing the model APIs is unnecessary.
// The optional environment override lets us move the master to a first-party CDN later.
const HERO_VIDEO_URL=process.env.NEXT_PUBLIC_K4K_HOME_HERO_VIDEO_URL||
 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/6250e761-2957-4f49-92d3-69b1f23d907e.mp4';

const originals=catalogue.discoveryPreviews.filter(item=>item.videoUrl).slice(0,8);
const modelOrder=['kling4_hf','seedance_2_5','k4k-motion-lite','wan-prime','nano_banana_2','flux_3_image','seedance_2_5_flash','k4k-motion-ultra','gpt_image_2_6','kling_omni_image'];
const orderedModels=modelOrder.map(id=>CREATION_MODELS.find(model=>model.id===id)).filter(Boolean);
const groups=[
 {id:'all',name:'All models'},
 {id:'video',name:'Video'},
 {id:'image',name:'Image'},
 {id:'motion',name:'K4K Motion'},
 {id:'business',name:'Business Studio'}
];
// Every public model opens the same studio workspace first. Once inside, workflows
// that need a specialist Director can be launched explicitly, without silently
// bypassing the selected-model interface or altering its provider routing.
function studioHref(model){
 return '/k4k-app/create?kind='+encodeURIComponent(model.kind)+'&model='+encodeURIComponent(model.id);
}
function ModelArt({model}){
 const videoRef=useRef(null);
 useEffect(()=>{
  const video=videoRef.current;
  if(!video||!model.demoUrl)return;
  // Keep motion respectful of reduced-motion preferences and avoid loading six full
  // videos while visitors are still watching the large homepage hero.
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const play=()=>{video.play().catch(()=>{});};
  if(!('IntersectionObserver' in window)){play();return ()=>video.pause();}
  const observer=new IntersectionObserver(([entry])=>{
   if(entry.isIntersecting)play();else video.pause();
  },{threshold:0.35,rootMargin:'60px 0px'});
  observer.observe(video);
  return ()=>{observer.disconnect();video.pause();};
 },[model.demoUrl]);
 return <div className={'kc26-card-art '+(model.demoAspect==='9:16'?'kc26-card-art-portrait ':'')+(model.kind==='image'?'kc26-card-art-image':model.premium?'kc26-card-art-motion':'kc26-card-art-video')}>
  {model.demoUrl?
   <video ref={videoRef} src={model.demoUrl} muted loop playsInline preload="metadata" aria-label={model.name+' example clip'}/>:
   <div className="kc26-generated-visual" aria-hidden="true"><span className="kc26-grid-aura"/><span className="kc26-visual-orbit"/><span className="kc26-visual-glow"/>{model.kind==='image'?<Images size={42} strokeWidth={1}/>:model.premium?<Clapperboard size={42} strokeWidth={1}/>:<Film size={42} strokeWidth={1}/>}</div>}
  <div className="kc26-card-art-overlay"/>
  <span className="kc26-card-art-marker">{model.demoUrl?'REAL MODEL EXAMPLE':'INTERFACE ANIMATION'}</span>
 </div>;
}
function OriginalCard({item,index}){
 const videoRef=useRef(null);
 const [playing,setPlaying]=useState(false);
 const play=()=>{const v=videoRef.current;if(v){v.play().then(()=>setPlaying(true)).catch(()=>{});}};
 const pause=()=>{const v=videoRef.current;if(v){v.pause();setPlaying(false);}};
 return <Link href={'/k4k-app/motion?template='+encodeURIComponent(item.id)}
   className={'kc26-original kc26-original-'+index}
   onMouseEnter={play} onMouseLeave={pause} onFocus={play} onBlur={pause}
   aria-label={'Explore '+item.title}>
  <video ref={videoRef} src={item.videoUrl} poster={item.posterUrl||undefined} muted loop playsInline preload="metadata" aria-hidden="true"/>
  <div className="kc26-original-shade"/>
  <div className="kc26-original-badge"><Play size={12} fill="currentColor"/><span>{playing?'PLAYING':'WATCH'}</span></div>
  <div className="kc26-original-copy"><small>K4K ORIGINAL / {String(index+1).padStart(2,'0')}</small><strong>{item.title.replace(/^K4K Original · /,'')}</strong><span>{item.previewOnly?'Preview only':'Explore scene'} <ArrowUpRight size={15}/></span></div>
 </Link>;
}

export default function CreativeHome(){
 const {locale,changeLocale}=useK4KLocale();
 const {user}=useVerifiedAccount();
 const [menuOpen,setMenuOpen]=useState(false);
 const [filter,setFilter]=useState('all');
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const visible=orderedModels.filter(m=>filter==='all'||(filter==='motion'?m.premium:filter==='business'?m.id.startsWith('seedance'):filter==='video'?m.kind==='video'&&!m.premium&&!m.id.startsWith('seedance'):m.kind==='image'));
 useEffect(()=>{if(!menuOpen)return;function keydown(e){if(e.key==='Escape')setMenuOpen(false)}window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown)},[menuOpen]);
 return <div className="k4k-clean-home">
  <header className="kc26-header">
   <div className="kc26-header-inner">
    <Link href="/" className="kc26-brand" aria-label="K4K APP home"><img src="/k4k-mark.svg" width="34" height="34" alt=""/><strong>K4K<span> APP</span></strong></Link>
    <nav className="kc26-nav" aria-label={tr('Main navigation','Navegação principal','Navegación principal')}>
     <Link href="/" aria-current="page">{tr('Explore','Explorar','Explorar')}</Link>
     <Link href="/k4k-app/image">{tr('Image','Imagem','Imagen')}</Link>
     <Link href="/k4k-app/video">{tr('Video','Vídeo','Vídeo')}</Link>
     <Link href="/k4k-app/motion">K4K Motion</Link>
     <Link href="/k4k-app/business">Business Studio</Link>
     <Link href="/k4k-app/credits">{tr('Pricing','Preços','Precios')}</Link>
    </nav>
    <div className="kc26-header-actions">
     <label className="kc26-language"><Globe2 size={15}/><select aria-label="Language" value={locale} onChange={event=>changeLocale(event.target.value)}><option value="en">EN</option><option value="pt">PT</option><option value="es">ES</option></select><ChevronDown size={13}/></label>
     {user?<AccountMenu user={user}/>:<Link className="kc26-login" href="/login?next=%2Fk4k-app%2Fcreate">{tr('Sign in','Entrar','Entrar')}</Link>}
     <Link className="kc26-signup" href={user?'/k4k-app/create':'/k4k-app/register'}>{user?tr('Create','Criar','Crear'):tr('Get started','Começar','Empezar')}<ArrowUpRight size={16}/></Link>
     <button type="button" className="kc26-menu-toggle" aria-controls="kc26-mobile-menu" aria-expanded={menuOpen} aria-label={menuOpen?'Close menu':'Open menu'} onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X size={20}/>:<Menu size={20}/>}</button>
    </div>
   </div>
   {menuOpen&&<nav id="kc26-mobile-menu" className="kc26-mobile-menu" aria-label="Mobile navigation">{[
    ['Explore','/'],['Image','/k4k-app/image'],['Video','/k4k-app/video'],['K4K Motion','/k4k-app/motion'],['Business Studio','/k4k-app/business'],['Pricing','/k4k-app/credits'],['My library','/k4k-app/videos']
   ].map(([name,href])=><Link key={href} href={href} onClick={()=>setMenuOpen(false)}>{name}<ArrowUpRight size={15}/></Link>)}{!user&&<><Link href="/login?next=%2Fk4k-app%2Fcreate" onClick={()=>setMenuOpen(false)}>{tr("Sign in","Entrar","Entrar")}<ArrowUpRight size={15}/></Link><Link href="/k4k-app/register" onClick={()=>setMenuOpen(false)}>{tr("Create account","Criar conta","Crear cuenta")}<ArrowUpRight size={15}/></Link></>}</nav>}
  </header>
  <main>
   <section className="kc26-hero" aria-labelledby="kc26-hero-title">
    <div className="kc26-hero-stage" aria-hidden="true">
     {HERO_VIDEO_URL&&<video src={HERO_VIDEO_URL} poster="/k4k-home-hero-poster.svg" autoPlay muted loop playsInline preload="metadata" className="kc26-hero-video" aria-hidden="true"/>}
     <div className={'kc26-chrome-stage'+(HERO_VIDEO_URL?' kc26-with-video':'')}>
      <span className="kc26-top-ring"/><span className="kc26-ring-inner"/>
      <span className="kc26-beam kc26-beam-left"/><span className="kc26-beam kc26-beam-right"/>
      <span className="kc26-halo-base"/><span className="kc26-hero-monogram">K4K</span>
      <span className="kc26-hero-smoke"/>
     </div>
    </div>
    <div className="kc26-hero-scrim" aria-hidden="true"/>
    <div className="kc26-hero-container">
     <p className="kc26-kicker"><span/> K4K APP / KREATIVE STUDIOS 4K</p>
     <h1 id="kc26-hero-title">{tr('DON’T FOLLOW','NÃO SIGA','NO SIGAS')}<br/>{tr('THE TREND.','A TENDÊNCIA.','LA TENDENCIA.')}<br/><em>{tr('CREATE IT.','CRIE A SUA.','CRÉALA.')}</em></h1>
     <p className="kc26-hero-sub">{tr('One creative studio for AI images, cinematic video and motion. Make something they haven’t seen before.','Um estúdio para imagens, vídeos cinematográficos e movimento com IA. Crie algo que ninguém viu antes.','Un estudio para imágenes, vídeo cinematográfico y movimiento con IA. Crea algo que aún no hayan visto.')}</p>
     <div className="kc26-hero-actions">
      <Link className="kc26-button-primary" href="/k4k-app/create">{tr('Start creating','Começar a criar','Empezar a crear')} <ArrowUpRight size={17}/></Link>
      <Link className="kc26-button-secondary" href="#models">{tr('Explore AI models','Explorar modelos','Explorar modelos')} <ArrowRight size={16}/></Link>
     </div>
    </div>
    <div className="kc26-hero-bottom"><span>K4K / CREATE THE IMPOSSIBLE</span><a href="#models">{tr('Scroll to explore','Deslize para explorar','Desliza para explorar')} <span aria-hidden="true">↓</span></a><span>01 — 04</span></div>
   </section>

   <section className="kc26-quicklinks" aria-label="Create with K4K">
    <Link href="/k4k-app/image"><Images size={20}/><span><strong>{tr('Create image','Criar imagem','Crear imagen')}</strong><small>{tr('From a single idea','A partir de uma ideia','Desde una idea')}</small></span><ArrowUpRight size={18}/></Link>
    <Link href="/k4k-app/video"><Film size={20}/><span><strong>{tr('Create video','Criar vídeo','Crear vídeo')}</strong><small>{tr('Motion starts here','O movimento começa aqui','El movimiento empieza aquí')}</small></span><ArrowUpRight size={18}/></Link>
    <Link href="/k4k-app/motion"><Clapperboard size={20}/><span><strong>K4K Motion</strong><small>{tr('Recast your next scene','Recrie a próxima cena','Recrea tu próxima escena')}</small></span><ArrowUpRight size={18}/></Link>
     <Link href="/k4k-app/business"><BriefcaseBusiness size={20}/><span><strong>Business Studio</strong><small>{tr('Seedance for premium campaigns','Seedance para campanhas premium','Seedance para campañas premium')}</small></span><ArrowUpRight size={18}/></Link>
   </section>

   <section id="models" className="kc26-section kc26-models">
    <div className="kc26-section-heading">
     <div><p className="kc26-eyebrow">01 / {tr('THE TOOLKIT','AS FERRAMENTAS','LAS HERRAMIENTAS')}</p><h2>{tr('Explore what’s possible.','Explore as possibilidades.','Explora las posibilidades.')}</h2><p>{tr('Discover the models behind your next creation. Choose a tool and go straight to its studio.','Descubra os modelos para a sua próxima criação. Escolha uma ferramenta e abra o estúdio.','Descubre los modelos para tu próxima creación. Elige uno y abre su estudio.')}</p></div>
     <Link className="kc26-simple-link" href="/k4k-app/create">{tr('Open Creative Studio','Abrir estúdio criativo','Abrir estudio creativo')} <ArrowUpRight size={18}/></Link>
    </div>
    <div className="kc26-filter-row" role="group" aria-label="Filter models">
     {groups.map(g=><button key={g.id} type="button" aria-pressed={filter===g.id} onClick={()=>setFilter(g.id)}>{g.name}</button>)}
     <span className="kc26-filter-count">{visible.length} {tr('models','modelos','modelos')}</span>
    </div>
    <div className="kc26-model-grid">
     {visible.map(model=><Link key={model.id} href={studioHref(model)} className="kc26-model-card">
      <ModelArt model={model}/>
      <div className="kc26-model-copy">
       <div className="kc26-model-top"><strong>{model.name}</strong><ArrowUpRight size={17}/></div>
       <p>{model.description}</p>
       <span>{model.status==='active'?tr('Open workflow','Abrir ferramenta','Abrir herramienta'):tr('Explore model · access varies','Explorar modelo · acesso variável','Explorar modelo · acceso variable')} <ArrowRight size={13}/></span>
      </div>
     </Link>)}
    </div>
    <p className="kc26-model-note">{tr('Models shown here are in the K4K catalogue. Some tools require enabled access or have restricted workflows. Animation-only cards are interface previews, not generated model results.','Os modelos estão no catálogo K4K. Alguns têm acesso limitado. As animações ilustrativas não são resultados gerados.','Los modelos están en el catálogo K4K. Algunos tienen acceso limitado. Las animaciones ilustrativas no son resultados generados.')}</p>
   </section>

   <section className="kc26-section kc26-gallery" id="originals">
    <div className="kc26-section-heading">
     <div><p className="kc26-eyebrow">02 / K4K ORIGINALS</p><h2>{tr('Made to be reimagined.','Feito para recriar.','Hecho para recrear.')}</h2><p>{tr('Real clips from our creative collection. Hover to watch and open a scene to explore the workflow.','Clipes reais da nossa coleção. Passe o cursor para assistir e abra uma cena.','Clips reales de nuestra colección. Pasa el cursor para verlos y abre una escena.')}</p></div>
     <Link className="kc26-simple-link" href="/k4k-app/motion">{tr('Discover K4K Motion','Descubra K4K Motion','Descubre K4K Motion')} <ArrowUpRight size={18}/></Link>
    </div>
    <div className="kc26-original-grid">{originals.slice(0,6).map((item,i)=><OriginalCard key={item.id} item={item} index={i}/>)}</div>
   </section>

   <section className="kc26-motion" aria-labelledby="kc26-motion-title">
    <div className="kc26-motion-visual" aria-hidden="true"><span className="kc26-motion-orbit"/><span className="kc26-motion-inner">K4K<span>MOTION</span></span><span className="kc26-motion-scan"/></div>
    <div className="kc26-motion-copy">
     <p className="kc26-eyebrow">03 / K4K MOTION STUDIO</p>
     <h2 id="kc26-motion-title">{tr('Same movement.','Mesmo movimento.','Mismo movimiento.')}<br/><em>{tr('A whole new story.','Uma nova história.','Una historia nueva.')}</em></h2>
     <p>{tr('Take a reference video, bring your own characters and recreate the scene in the K4K Motion Director.','Use um vídeo de referência, escolha seus personagens e recrie a cena no K4K Motion Director.','Usa un vídeo de referencia, elige tus personajes y recrea la escena en K4K Motion Director.')}</p>
     <Link className="kc26-button-primary" href="/k4k-app/motion">{tr('Explore K4K Motion','Explorar K4K Motion','Explorar K4K Motion')} <ArrowUpRight size={17}/></Link>
    </div>
   </section>

   <section className="kc26-final" aria-label="Start creating">
    <p className="kc26-eyebrow">04 / THE NEXT FRAME IS YOURS</p>
    <h2>{tr('YOUR IDEAS.','SUAS IDEIAS.','TUS IDEAS.')}<br/>{tr('YOUR NEXT CREATION.','SUA PRÓXIMA CRIAÇÃO.','TU PRÓXIMA CREACIÓN.')}</h2>
    <p>{tr('Everything starts with one idea. Make yours move.','Tudo começa com uma ideia. Dê movimento à sua.','Todo empieza con una idea. Dale movimiento a la tuya.')}</p>
    <Link className="kc26-button-primary" href={user?'/k4k-app/create':'/k4k-app/register'}>{user?tr('Open my studio','Abrir meu estúdio','Abrir mi estudio'):tr('Create your account','Criar conta','Crear cuenta')} <ArrowUpRight size={17}/></Link>
   </section>
  </main>
  <footer className="kc26-footer">
   <div><Link href="/" className="kc26-brand"><img src="/k4k-mark.svg" width="28" height="28" alt=""/><strong>K4K APP</strong></Link><p>{tr('Original films. New possibilities.','Filmes originais. Novas possibilidades.','Películas originales. Nuevas posibilidades.')}</p></div>
   <nav aria-label="Footer"><Link href="/k4k-app/credits">{tr('Pricing','Preços','Precios')}</Link><Link href="/affiliates">{tr('Affiliates','Afiliados','Afiliados')}</Link><Link href="/privacy">{tr('Privacy','Privacidade','Privacidad')}</Link><Link href="/k4k-app/support">{tr('Support','Suporte','Soporte')}</Link></nav>
   <span>© 2026 K4K APP / KREATIVE STUDIOS 4K</span>
  </footer>
 </div>;
}
