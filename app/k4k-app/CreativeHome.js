'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Play,Film,Images,Sparkles,Clapperboard,Layers3,Menu,X,Globe2,CheckCircle2,ChevronRight,MoveUpRight} from 'lucide-react';
import catalogue from './template-catalogue.json';
import {useK4KLocale} from './locale';
import {useVerifiedAccount} from './useVerifiedAccount';
import AccountMenu from './AccountMenu';
import './creative-home.css';

// Showcase only K4K's curated original previews, not the legacy trending/celebrity templates.
// Original MP4 entries do not require separate poster images.
const featured=catalogue.discoveryPreviews.filter(item=>item.videoUrl);
const models=[
 {name:'K4K Motion',tag:'FEATURED · LIVE MOTION STUDIO',detail:'Swap characters in a real scene with your reference video',path:'/k4k-app/motion',symbol:'motion'},
 {name:'Wan 3',tag:'WAN-POWERED · AVAILABLE',detail:'Reference-led video creation with your own characters',path:'/k4k-app/creator',symbol:'video'},
 {name:'Seedance 2.5',tag:'LIVE · TEXT TO VIDEO',detail:'5-second cinematic videos · 480p · 20 credits',path:'/k4k-app/video?model=seedance_2_5',symbol:'video'},
 {name:'Kling 4.0',tag:'LIVE · TEXT TO VIDEO',detail:'5-second cinematic video · 720p · 12 credits',path:'/k4k-app/video?model=kling4_0',symbol:'video'},
 {name:'Image Studio',tag:'LIVE · TEXT TO IMAGE',detail:'Nano Banana 2.1 and FLUX 3 · single 1K images',path:'/k4k-app/image',symbol:'image'}
];
export default function CreativeHome(){
 const {locale,changeLocale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const {user}=useVerifiedAccount();
 const [menu,setMenu]=useState(false);
 return <div className="k4k-hf-home">
   <header className="khf-topbar">
     <div className="khf-nav-inner">
       <Link className="khf-brand" href="/" aria-label="K4K APP Home"><img src="/k4k-mark.svg" width="36" height="36" alt=""/><strong>K4K<span> APP</span></strong></Link>
       <nav className="khf-desktop-links" aria-label={tr('Main menu','Menu principal','Menú principal')}>
         <Link href="/" aria-current="page">{tr('Home','Início','Inicio')}</Link>
         
         <Link href="/k4k-app/image">{tr('Image','Imagem','Imagen')}</Link>
         <Link href="/k4k-app/video">{tr('Video','Vídeo','Vídeo')}</Link>
         <Link href="/k4k-app/motion">K4K Motion</Link>
         
         <Link href="/k4k-app/credits">{tr('Pricing','Preços','Precios')}</Link>
       </nav>
       <div className="khf-header-actions" aria-label={tr("Account and creation","Conta e criação","Cuenta y creación")}>
         <label className="khf-locale"><Globe2 size={15}/><select value={locale} onChange={e=>changeLocale(e.target.value)} aria-label="Language"><option value="en">EN</option><option value="pt">PT</option><option value="es">ES</option></select></label>
         {user?<AccountMenu user={user}/>:<Link className="khf-signin" aria-label={tr("Log in to K4K","Entrar no K4K","Iniciar sesión en K4K")} href="/login?next=%2Fk4k-app%2Fcreate">{tr('Log in','Entrar','Iniciar sesión')}</Link>}
         {user?<Link className="khf-header-cta" href="/k4k-app/create">{tr('Create','Criar','Crear')}<ArrowUpRight size={15}/></Link>:<Link className="khf-header-cta" href="/k4k-app/register">{tr('Sign up','Criar conta','Registrarse')}<ArrowUpRight size={15}/></Link>}
         <button className="khf-menu-button" type="button" aria-controls="khf-mobile-menu" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>{menu?<X size={20}/>:<Menu size={20}/>}</button>
       </div>
     </div>
     {menu&&<nav id="khf-mobile-menu" className="khf-mobile-menu" aria-label="Mobile menu"><Link onClick={()=>setMenu(false)} href="/">{tr('Home','Início','Inicio')}</Link><Link onClick={()=>setMenu(false)} href="/k4k-app/image">{tr('Image','Imagem','Imagen')}</Link><Link onClick={()=>setMenu(false)} href="/k4k-app/video">{tr('Video','Vídeo','Vídeo')}</Link><Link onClick={()=>setMenu(false)} href="/k4k-app/motion">K4K Motion</Link><Link onClick={()=>setMenu(false)} href="/k4k-app/creator">Wan 3</Link><Link onClick={()=>setMenu(false)} href="/k4k-app/credits">{tr('Pricing','Preços','Precios')}</Link><Link onClick={()=>setMenu(false)} href="/affiliates">{tr('Affiliates','Afiliados','Afiliados')}</Link>{!user&&<Link onClick={()=>setMenu(false)} className="khf-mobile-signup" href="/k4k-app/register">{tr('Sign up','Criar conta','Registrarse')} <ArrowRight size={16}/></Link>}{!user&&<Link className="khf-mobile-login" onClick={()=>setMenu(false)} href="/login?next=%2Fk4k-app%2Fcreate">{tr("Log in to K4K","Entrar no K4K","Iniciar sesión en K4K")} <ArrowRight size={16}/></Link>}</nav>}
   </header>
   <main>
     <section className="khf-hero khf-reference-hero" aria-labelledby="khf-hero-title">
       <div className="khf-reference-frame">
         <div className="khf-reference-atmosphere" aria-hidden="true"><img src="/k4k-liquid-chrome.svg" alt="" loading="eager"/></div>
         <div className="khf-reference-shimmer" aria-hidden="true"/>
         <div className="khf-reference-sideyear" aria-hidden="true">K4K · 2026</div>
         <div className="khf-reference-headline">
           <span className="khf-reference-eyebrow">{tr('THE NEXT ERA OF CREATION','A NOVA ERA DA CRIAÇÃO','LA NUEVA ERA DE CREACIÓN')}</span>
           <h1 id="khf-hero-title">K4K <span>APP</span></h1>
         </div>
         <div className="khf-reference-sculpture" aria-hidden="true"><img src="/k4k-liquid-chrome.svg" alt=""/></div>
         <div className="khf-reference-socials" aria-label={tr('Social links','Redes sociais','Redes sociales')}>
           <a href="https://www.instagram.com/kreativestudios4k/" target="_blank" rel="noopener noreferrer" aria-label="K4K on Instagram">IG</a>
           <a href="https://www.tiktok.com/@kreativestudios4k" target="_blank" rel="noopener noreferrer" aria-label="K4K on TikTok">TT</a>
         </div>
         <div className="khf-reference-about">
           <span className="khf-reference-label"><i/>{tr('ABOUT K4K APP','SOBRE K4K APP','SOBRE K4K APP')}</span>
           <p>{tr('DON’T FOLLOW THE TREND. CREATE IT.','NÃO SIGA A TENDÊNCIA. CRIE A SUA.','NO SIGAS LA TENDENCIA. CRÉALA.')}</p>
           <small>{tr('Your ideas. Your characters. Your next viral creation.','Suas ideias. Seus personagens. Sua próxima criação viral.','Tus ideas. Tus personajes. Tu próxima creación viral.')}</small>
         </div>
         <div className="khf-reference-bottomright">
           <Link className="khf-reference-watch" href="#discover">{tr('Explore K4K Originals','Explorar K4K Originals','Explorar K4K Originals')} <span><Play size={15} fill="currentColor"/></span></Link>
           <Link className="khf-reference-start" href="/k4k-app/motion">{tr('Start creating','Comece a criar','Empieza a crear')} <ArrowUpRight size={16}/></Link>
         </div>
         <div className="khf-reference-bottomtag" aria-hidden="true">IMAGE / VIDEO / K4K MOTION</div>
       </div>
     </section>
     <section className="khf-toolband" aria-label={tr('Creation shortcuts','Acesso rápido','Accesos rápidos')}>
       <div className="khf-toolband-inner">
         <div className="khf-toolband-heading"><span>{tr('WHAT WILL YOU CREATE?','O QUE VAI CRIAR?','¿QUÉ VAS A CREAR?')}</span><strong>{tr('Your next project starts here.','Seu próximo projeto começa aqui.','Tu próximo proyecto comienza aquí.')}</strong></div>
         <Link href="/k4k-app/image"><Images size={25}/><div><strong>{tr('Create image','Criar imagem','Crear imagen')}</strong><small>{tr('Generate & edit','Gerar e editar','Generar y editar')}</small></div><ArrowUpRight size={19}/></Link>
         <Link href="/k4k-app/video"><Film size={25}/><div><strong>{tr('Create video','Criar vídeo','Crear vídeo')}</strong><small>{tr('Explore video models','Explorar modelos','Explorar modelos')}</small></div><ArrowUpRight size={19}/></Link>
         <Link href="/k4k-app/creator"><Layers3 size={25}/><div><strong>Wan 3</strong><small>{tr('Wan-powered video production','Produção de vídeo com Wan','Vídeo con tecnología Wan')}</small></div><ArrowUpRight size={19}/></Link>
       </div>
     </section>
     <section className="khf-section khf-discover" id="discover">
       <div className="khf-section-heading"><div><span className="khf-overline">{tr('K4K ORIGINALS · MADE TO BE REIMAGINED','K4K ORIGINALS · FEITO PARA RECRIAR','K4K ORIGINALS · HECHO PARA RECREAR')}</span><h2>{tr('Discover the projects.','Explore os projetos.','Descubre los proyectos.')}<br/><em>{tr('Create your own version.','Crie a sua versão.','Crea tu propia versión.')}</em></h2></div><Link className="khf-viewall" href="/k4k-app/motion">{tr('Explore K4K Originals','Explorar K4K Originals','Explorar K4K Originals')}<ArrowUpRight size={18}/></Link></div>
       <div className="khf-project-grid">{featured.slice(0,10).map((entry,i)=><Link href={`/k4k-app/motion?template=${encodeURIComponent(entry.id)}`} className="khf-project" key={entry.id}><div className="khf-project-media"><video src={entry.videoUrl} poster={entry.posterUrl||undefined} muted playsInline preload="metadata" aria-label={entry.title} onLoadedMetadata={e=>{e.currentTarget.currentTime=0.1}} onMouseEnter={e=>e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0.1}}/><span className="khf-project-play"><Play size={17}/></span><span className="khf-project-length">{Math.round(entry.durationSeconds)}s</span></div><div className="khf-project-caption"><div><strong>{entry.title}</strong><small>{entry.previewOnly?tr('Preview only','Somente prévia','Solo vista previa'):tr('Motion ready','Movimento disponível','Movimiento disponible')}</small></div><ArrowUpRight size={19}/></div></Link>)}</div>
     </section>
     <section className="khf-model-section">
       <div className="khf-section khf-model-inner"><div className="khf-section-heading"><div><span className="khf-overline">{tr('ONE WORKSPACE. MORE POSSIBILITIES.','UM ESTÚDIO. MAIS POSSIBILIDADES.','UN ESTUDIO. MÁS POSIBILIDADES.')}</span><h2>{tr('Explore our AI studio.','Explore nosso estúdio de IA.','Explora nuestro estudio IA.')}</h2></div><Link className="khf-viewall" href="/k4k-app/video">{tr('View all tools','Ver ferramentas','Ver herramientas')}<ArrowUpRight size={18}/></Link></div>
       <div className="khf-model-grid">{models.map((m,i)=><Link className={'khf-model-card khf-model-'+i} href={m.path} key={m.name}><div className="khf-model-over"><span>{m.tag}</span><ArrowUpRight size={18}/></div><div className="khf-model-visual">{m.symbol==='image'?<Images size={50}/>:m.symbol==='motion'?<Clapperboard size={50}/>:<Film size={50}/>}<i/><i/><i/></div><div className="khf-model-text"><strong>{m.name}</strong><small>{m.detail}</small></div></Link>)}</div>
       <p className="khf-availability">{tr('Wan 3 uses our existing Wan-powered generation flow. K4K Motion reference templates are separate from generated customer videos. Text-to-image and text-to-video are available with credits. Advanced editing and reference workflows depend on the selected model.','Wan 3 usa a geração atual via Wan. Vídeo por texto e imagem por texto estão disponíveis com créditos. A edição avançada depende do modelo escolhido.','Wan 3 usa el generador Wan existente. Vídeo e imagen desde texto están disponibles con créditos; la edición avanzada depende del modelo elegido.')}</p>
       </div>
     </section>
     <section className="khf-section khf-last"><span className="khf-overline">K4K APP · KREATIVE STUDIOS 4K</span><h2>{tr('Your next viral idea','Sua próxima ideia viral','Tu próxima idea viral')}<br/><em>{tr('starts with you.','começa com você.','empieza contigo.')}</em></h2><p>{tr('Make something people haven’t seen before.','Crie algo que ninguém viu antes.','Crea algo que nadie haya visto antes.')}</p><Link className="khf-primary" href="/k4k-app/video">{tr('Enter Creative Studio','Entrar no Estúdio Criativo','Entrar al Estudio Creativo')}<ArrowRight size={20}/></Link></section>
   </main>
   <footer className="khf-footer"><Link href="/k4k-app" className="khf-brand"><img src="/k4k-mark.svg" width="28" height="28" alt=""/><strong>K4K APP</strong></Link><span>© K4K APP · KREATIVE STUDIOS 4K</span><div><Link href="/k4k-app/credits">{tr('Pricing','Preços','Precios')}</Link><Link href="/affiliates">{tr('Affiliates','Afiliados','Afiliados')}</Link><Link href="/privacy">{tr('Privacy','Privacidade','Privacidad')}</Link><Link href="/k4k-app/support">{tr('Support','Suporte','Soporte')}</Link></div></footer>
 </div>
}
