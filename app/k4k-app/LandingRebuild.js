'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,ArrowRight,Menu,X,Play,Volume2,VolumeX} from 'lucide-react';
import {useK4KLocale} from './locale';
import './landing-rebuild.css';

// Replace only when the creator approves a video for the homepage.
// A silent, inline, looping MP4 will take over the hero visual.
const HERO_VIDEO_SRC='';

export default function LandingRebuild(){
 const {locale,changeLocale}=useK4KLocale();
 const [mobileOpen,setMobileOpen]=useState(false);
 const [muted,setMuted]=useState(true);
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const nav=[
  {text:tr('Home','Início','Inicio'),href:'/'},
  {text:tr('Image','Imagem','Imagen'),href:'/k4k-app/image'},
  {text:tr('Video','Vídeo','Vídeo'),href:'/k4k-app/video'},
  {text:'K4K Motion',href:'/k4k-app/motion'}
 ];
 return <div className="k4k-rebuild">
  <div className="kr-stage">
   <header className="kr-header">
    <Link className="kr-logo" href="/" aria-label="K4K APP home"><img src="/k4k-mark.svg" width="30" height="30" alt=""/><span>K4K<span className="kr-logo-thin"> APP</span></span></Link>
    <nav className="kr-nav" aria-label={tr('Main navigation','Navegação principal','Navegación principal')}>{nav.map(item=><Link key={item.href} href={item.href}>{item.text}</Link>)}</nav>
    <div className="kr-actions">
     <label className="kr-language"><span className="kr-sr-only">{tr('Language','Idioma','Idioma')}</span><select aria-label={tr('Language','Idioma','Idioma')} value={locale} onChange={e=>changeLocale(e.target.value)}><option value="en">EN</option><option value="pt">PT</option><option value="es">ES</option></select></label>
     <div className="kr-auth"><Link className="kr-signup" href="/signup">{tr('Sign Up','Criar conta','Registrarse')}</Link><Link className="kr-signin" href="/login">{tr('Sign In','Entrar','Iniciar sesión')}</Link></div>
     <button className="kr-menu-toggle" type="button" aria-label={mobileOpen?'Close menu':'Open menu'} aria-expanded={mobileOpen} aria-controls="kr-mobile-nav" onClick={()=>setMobileOpen(v=>!v)}>{mobileOpen?<X size={22}/>:<Menu size={22}/>}</button>
    </div>
   </header>
   {mobileOpen&&<nav id="kr-mobile-nav" className="kr-mobile-nav" data-open="" aria-label="Mobile navigation">{nav.map(item=><Link key={item.href} href={item.href} onClick={()=>setMobileOpen(false)}>{item.text}<ArrowUpRight size={16}/></Link>)}</nav>}
   <main>
    <section className="kr-hero" aria-labelledby="kr-hero-title">
     <div className="kr-hero-topline"><span>2026 / KREATIVE STUDIOS 4K</span><span>{tr('CREATE WHAT’S NEXT','CRIE O PRÓXIMO','CREA LO QUE SIGUE')}</span></div>
     <div className="kr-title-scene">
      <div className="kr-halo kr-halo-one" aria-hidden="true"/><div className="kr-halo kr-halo-two" aria-hidden="true"/>
      <h1 id="kr-hero-title">K4K <span>APP</span></h1>
      <div className="kr-center-art" aria-hidden={!!HERO_VIDEO_SRC}>
       {HERO_VIDEO_SRC?<video src={HERO_VIDEO_SRC} autoPlay loop playsInline muted={muted} preload="metadata" className="kr-loop-video" aria-label="K4K featured creative film"/>:<div className="kr-sculpture" aria-hidden="true"><div className="kr-sculpture-core"/><div className="kr-orbit kr-orbit-one"/><div className="kr-orbit kr-orbit-two"/><div className="kr-orbit kr-orbit-three"/><div className="kr-orbit kr-orbit-four"/><div className="kr-orbit kr-orbit-five"/></div>}
      </div>
      {HERO_VIDEO_SRC&&<button className="kr-video-sound" type="button" aria-label={muted?'Enable sound':'Mute sound'} onClick={()=>setMuted(v=>!v)}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>}
      <span className="kr-side-label kr-side-left">K4K / 001</span><span className="kr-side-label kr-side-right">IMAGINE / CREATE / REPEAT</span>
     </div>
     <div className="kr-hero-bottom">
      <div className="kr-about"><span className="kr-overline"><span className="kr-overline-dot"/> {tr('ABOUT K4K','SOBRE A K4K','SOBRE K4K')}</span><p>{tr('Don’t follow the trend. Create it.','Não siga a tendência. Crie a sua.','No sigas la tendencia. Créala.')}</p><small>{tr('Images. Videos. Motion. Your imagination, without limits.','Imagens. Vídeos. Movimento. Sua imaginação sem limites.','Imágenes. Vídeos. Movimiento. Tu imaginación sin límites.')}</small></div>
      <Link href="/k4k-app/create" className="kr-create-link">{tr('START CREATING','COMEÇAR A CRIAR','EMPEZAR A CREAR')} <span><ArrowUpRight size={19}/></span></Link>
     </div>
    </section>
   </main>
   <footer className="kr-footer"><span>© K4K APP</span><div><Link href="/k4k-app/motion/explore">{tr('Explore','Explorar','Explorar')}</Link><Link href="/k4k-app/credits">{tr('Pricing','Preços','Precios')}</Link><Link href="/k4k-app/support">{tr('Contact','Contacto','Contacto')}</Link></div></footer>
  </div>
 </div>;
}
