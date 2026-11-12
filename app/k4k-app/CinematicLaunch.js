'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Play,Pause,Volume2,VolumeX,Menu,X,Globe2} from 'lucide-react';
import catalogue from './template-catalogue.json';
import {useK4KLocale} from './locale';
import './cinematic-launch.css';

const videos=catalogue.trending.filter(item=>item.videoUrl).slice(0,10);
function ShowcaseVideo({item,index,paused}){
 const ref=useRef(null);
 const [muted,setMuted]=useState(true);
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  const node=ref.current;if(!node)return;
  const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{threshold:.45});
  observer.observe(node);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  const node=ref.current;if(!node)return;
  if(visible&&!paused)node.play().catch(()=>{});else node.pause();
 },[visible,paused]);
 return <article className="kc-video">
  <video ref={ref} src={item.videoUrl} poster={item.posterUrl||undefined} muted={muted} loop playsInline preload="none" aria-label={item.title}/>
  <div className="kc-video-shade" aria-hidden="true"/>
  <span className="kc-video-number">{String(index+1).padStart(2,'0')} / K4K</span>
  <div className="kc-video-caption"><strong>{item.title}</strong><button type="button" aria-label={muted?'Play with sound':'Mute video'} aria-pressed={!muted} onClick={()=>{const node=ref.current;if(!node)return;node.muted=muted?false:true;setMuted(!muted);if(!paused)node.play().catch(()=>{});}}>{muted?<VolumeX size={16}/>:<Volume2 size={16}/>}</button></div>
 </article>;
}
export default function CinematicLaunch(){
 const {locale,changeLocale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [paused,setPaused]=useState(false);
 const [menuOpen,setMenuOpen]=useState(false);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');if(media.matches)setPaused(true);},[]);
 return <div className="kc-launch">
 <header className="kc-header"><div className="kc-nav-inner">
  <Link href="/" className="kc-logo" aria-label="K4K APP home"><img src="/k4k-mark.svg" alt="" width="34" height="34"/><span className="kc-wordmark">K4K<span>APP</span></span></Link>
  <nav className="kc-desktop-nav" aria-label="Main navigation"><a href="#showcase">{tr('Showcase','Vitrine','Galería')}</a><a href="#release">{tr('Launch','Lançamento','Lanzamiento')}</a><Link href="/academy">Academy</Link></nav>
  <div className="kc-header-right"><label className="kc-language"><Globe2 size={15}/><select aria-label={tr('Language','Idioma','Idioma')} value={locale} onChange={e=>changeLocale(e.target.value)}><option value="en">EN</option><option value="pt">PT</option><option value="es">ES</option></select></label><Link className="kc-login" href="/k4k-app/account">{tr('Sign in','Entrar','Entrar')}<ArrowUpRight size={15}/></Link><button className="kc-menu-toggle" type="button" aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} aria-controls="kc-mobile-nav" onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X size={22}/>:<Menu size={22}/>}</button></div>
 </div>{menuOpen&&<nav id="kc-mobile-nav" className="kc-mobile-nav" aria-label="Mobile navigation"><a href="#showcase" onClick={()=>setMenuOpen(false)}>{tr('Showcase','Vitrine','Galería')}</a><a href="#release" onClick={()=>setMenuOpen(false)}>{tr('Launch','Lançamento','Lanzamiento')}</a><Link href="/academy" onClick={()=>setMenuOpen(false)}>Academy</Link><Link href="/k4k-app/account" onClick={()=>setMenuOpen(false)}>{tr('Sign in','Entrar','Entrar')}</Link></nav>}</header>
 <main>
 <section className="kc-hero">
 <div className="kc-kicker"><i/> KREATIVESTUDIOS4K / {tr('THE NEXT CHAPTER','O PRÓXIMO CAPÍTULO','EL PRÓXIMO CAPÍTULO')}</div>
 <h1><span>{tr("DON’T FOLLOW","NÃO SIGA","NO SIGAS")}</span><span>{tr('THE TREND.','A TENDÊNCIA.','LA TENDENCIA.')}</span><em>{tr('CREATE IT.','CRIE A SUA.','CRÉALA.')}</em></h1>
 <p>{tr('Your imagination. Your characters. Your next viral video.','Sua imaginação. Seus personagens. Seu próximo vídeo viral.','Tu imaginación. Tus personajes. Tu próximo vídeo viral.')}</p>
 <a className="kc-release" href="#release"><span>{tr('PLANNED RELEASE','LANÇAMENTO PREVISTO','LANZAMIENTO PREVISTO')}</span><strong>04.12.2026</strong><ArrowUpRight size={22}/></a>
 </section>
 <section className="kc-showcase" id="showcase"><div className="kc-showcase-head"><div><span>K4K ORIGINALS</span><h2>{tr('THE WORLD IS WATCHING.','O MUNDO ESTÁ ASSISTINDO.','EL MUNDO ESTÁ MIRANDO.')}</h2></div><button type="button" onClick={()=>setPaused(p=>!p)} aria-label={paused?'Play previews':'Pause previews'}>{paused?<Play size={17}/>:<Pause size={17}/>} {paused?tr('Play','Reproduzir','Reproducir'):tr('Pause','Pausar','Pausar')}</button></div>
 <div className="kc-video-grid">{videos.map((item,index)=><ShowcaseVideo key={item.id} item={item} index={index} paused={paused}/>)}</div>
 </section>
 <section id="release" className="kc-final"><span>K4K APP / {tr('COMING SOON','EM BREVE','PRÓXIMAMENTE')}</span><h2><span>{tr('THE NEXT ERA','A NOVA ERA','LA NUEVA ERA')}</span><em>{tr('OF CREATORS.','DOS CRIADORES.','DE LOS CREADORES.')}</em></h2><strong className="kc-final-date">04.12.2026</strong><p>{tr('Planned launch. Final timing depends on testing and readiness.','Lançamento previsto. A data final depende dos testes e da preparação.','Lanzamiento previsto. La fecha final depende de las pruebas y la preparación.')}</p><Link href="/academy" className="kc-academy">{tr('Existing student? Enter Academy','Já é aluno? Entre na Academy','¿Ya eres estudiante? Entra a Academy')} <ArrowUpRight size={16}/></Link></section>
 </main><footer className="kc-footer"><strong>K4K™</strong><span>CREATED BY KREATIVESTUDIOS4K</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/k4k-app/support">Support</Link></div></footer>
 </div>;
}
