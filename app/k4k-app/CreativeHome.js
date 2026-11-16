'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Play,Film,Images,Sparkles,Clapperboard,Layers3,Menu,X,Globe2,CheckCircle2,ChevronRight,MoveUpRight} from 'lucide-react';
import catalogue from './template-catalogue.json';
import {useK4KLocale} from './locale';
import {useVerifiedAccount} from './useVerifiedAccount';
import AccountMenu from './AccountMenu';
import './creative-home.css';

const featured=[...new Map([...catalogue.trending,...catalogue.discoveryPreviews,...catalogue.topPerforming].filter(item=>item.videoUrl&&item.posterUrl).map(item=>[item.id,item])).values()];
const models=[
 {name:'K4K Motion',tag:'PREMIUM · SWAP',detail:'Premium character replacement · preview access',path:'/k4k-app/create',symbol:'motion'},
 {name:'K4K Remix',tag:'WAN-POWERED · AVAILABLE',detail:'Reference-led video creation with your own characters',path:'/k4k-app/creator',symbol:'video'},
 {name:'Seedance 2.5',tag:'PREVIEW',detail:'Cinematic video and visual references',path:'/k4k-app/create',symbol:'video'},
 {name:'Kling 4.0',tag:'PREVIEW',detail:'Create from text, images and keyframes',path:'/k4k-app/create',symbol:'video'},
 {name:'Image Studio',tag:'PREVIEW',detail:'Images and visual edits, in one studio',path:'/k4k-app/create',symbol:'image'}
];
export default function CreativeHome(){
 const {locale,changeLocale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const {user}=useVerifiedAccount();
 const [menu,setMenu]=useState(false),[heroIndex,setHeroIndex]=useState(0),[sound,setSound]=useState(false);
 const heroRef=useRef(null);
 const first=featured[heroIndex]||featured[0];
 useEffect(()=>{const video=heroRef.current;if(!video)return;video.muted=!sound;video.play().catch(()=>{});},[heroIndex,sound]);
 const videoCount=featured.length;
 return <div className="k4k-hf-home">
   <header className="khf-topbar">
     <div className="khf-nav-inner">
       <Link className="khf-brand" href="/k4k-app" aria-label="K4K APP Home"><img src="/k4k-mark.svg" width="36" height="36" alt=""/><strong>K4K<span> APP</span></strong></Link>
       <nav className="khf-desktop-links" aria-label={tr('Main menu','Menu principal','Menú principal')}>
         <Link href="/k4k-app/explore">{tr('Explore','Explorar','Explorar')}</Link>
         <Link href="/k4k-app/create">{tr('Image','Imagem','Imagen')}</Link>
         <Link href="/k4k-app/create">{tr('Video','Vídeo','Vídeo')}</Link>
         <Link href="/k4k-app/creator">K4K Remix</Link>
         <Link href="/k4k-app/create">K4K Motion</Link>
         <Link href="/k4k-app/credits">{tr('Pricing','Preços','Precios')}</Link>
       </nav>
       <div className="khf-header-actions">
         <label className="khf-locale"><Globe2 size={15}/><select value={locale} onChange={e=>changeLocale(e.target.value)} aria-label="Language"><option value="en">EN</option><option value="pt">PT</option><option value="es">ES</option></select></label>
         {user?<AccountMenu user={user}/>:<Link className="khf-signin" href="/login?next=%2Fk4k-app%2Fcreate">{tr('Log in','Entrar','Iniciar sesión')}</Link>}
         <Link className="khf-header-cta" href="/k4k-app/create">{tr('Start creating','Começar a criar','Empezar a crear')}<ArrowUpRight size={15}/></Link>
         <button className="khf-menu-button" type="button" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>{menu?<X size={20}/>:<Menu size={20}/>}</button>
       </div>
     </div>
     {menu&&<nav className="khf-mobile-menu" aria-label="Mobile menu"><Link onClick={()=>setMenu(false)} href="/k4k-app/create">{tr('Creative Studio','Estúdio criativo','Estudio creativo')}</Link><Link onClick={()=>setMenu(false)} href="/k4k-app/explore">{tr('Explore templates','Explorar templates','Explorar plantillas')}</Link><Link onClick={()=>setMenu(false)} href="/k4k-app/creator">K4K Remix</Link><Link onClick={()=>setMenu(false)} href="/k4k-app/credits">{tr('Pricing','Preços','Precios')}</Link><Link onClick={()=>setMenu(false)} href="/affiliates">{tr('Affiliates','Afiliados','Afiliados')}</Link></nav>}
   </header>
   <main>
     <section className="khf-hero" aria-labelledby="khf-hero-title">
       <div className="khf-hero-inner">
         <div className="khf-hero-copy">
           <span className="khf-eyebrow"><span className="khf-dot"/> K4K CREATIVE STUDIO <span className="khf-eyebrow-line"/></span>
           <h1 id="khf-hero-title">{tr("DON’T FOLLOW","NÃO SIGA","NO SIGAS")}<br/><em>{tr("THE TREND.","A TENDÊNCIA.","LA TENDENCIA.")}</em><br/>{tr("CREATE IT.","CRIE A SUA.","CRÉALA.")}</h1>
           <p>{tr('Transform ideas, images and reference videos into your next creative project. One studio, multiple AI models, your direction.','Transforme ideias, imagens e vídeos de referência no seu próximo projeto. Um estúdio, vários modelos de IA e a sua direção.','Convierte ideas, imágenes y vídeos de referencia en tu próximo proyecto. Un estudio, varios modelos de IA y tu dirección.')}</p>
           <div className="khf-hero-buttons"><Link className="khf-primary" href="/k4k-app/create">{tr('Start creating','Começar a criar','Empieza a crear')}<ArrowUpRight size={18}/></Link><Link className="khf-secondary" href="#discover"><Play size={17}/>{tr('Explore creations','Explorar criações','Explorar creaciones')}</Link></div>
           <div className="khf-trust"><span><CheckCircle2 size={15}/>{tr('Image & video tools','Ferramentas de imagem e vídeo','Herramientas de imagen y vídeo')}</span><span><CheckCircle2 size={15}/>{tr('Real creator templates','Templates reais de criadores','Plantillas reales')}</span></div>
         </div>
         <div className="khf-hero-visual">
           <div className="khf-glow" aria-hidden="true"/>
           <div className="khf-display-main">
             {first&&<video ref={heroRef} key={first.id} src={first.videoUrl} poster={first.posterUrl} muted={!sound} autoPlay loop playsInline preload="metadata" aria-label={first.title}/>}
             <div className="khf-display-top"><span className="khf-live"><span/> K4K ORIGINAL</span><button type="button" onClick={()=>setSound(v=>!v)}>{sound?tr('Sound on','Som ligado','Sonido activo'):tr('Sound off','Sem som','Sin sonido')}</button></div>
             <div className="khf-display-bottom"><div><small>{tr('CREATOR SHOWCASE','VITRINE CRIATIVA','MUESTRA CREATIVA')}</small><strong>{first?.title||'K4K Motion'}</strong></div><div className="khf-feature-step">{String(heroIndex+1).padStart(2,'0')} / {String(videoCount).padStart(2,'0')}</div></div>
           </div>
           <div className="khf-thumb-strip" aria-label={tr('Featured videos','Vídeos em destaque','Vídeos destacados')}>{featured.slice(0,4).map((entry,i)=><button type="button" className={heroIndex===i?'khf-thumb selected':'khf-thumb'} aria-label={'Preview '+entry.title} onClick={()=>setHeroIndex(i)} key={entry.id}><img loading="lazy" src={entry.posterUrl} alt=""/>{heroIndex===i&&<span><Play size={13}/></span>}</button>)}</div>
           <div className="khf-floating-note"><Sparkles size={18}/><span>{tr('Your idea. Your characters.','Sua ideia. Seus personagens.','Tu idea. Tus personajes.')}</span></div>
         </div>
       </div>
     </section>
     <section className="khf-toolband" aria-label={tr('Creation shortcuts','Acesso rápido','Accesos rápidos')}>
       <div className="khf-toolband-inner">
         <div className="khf-toolband-heading"><span>{tr('WHAT WILL YOU CREATE?','O QUE VAI CRIAR?','¿QUÉ VAS A CREAR?')}</span><strong>{tr('Your next project starts here.','Seu próximo projeto começa aqui.','Tu próximo proyecto comienza aquí.')}</strong></div>
         <Link href="/k4k-app/create"><Images size={25}/><div><strong>{tr('Create image','Criar imagem','Crear imagen')}</strong><small>{tr('Generate & edit','Gerar e editar','Generar y editar')}</small></div><ArrowUpRight size={19}/></Link>
         <Link href="/k4k-app/create"><Film size={25}/><div><strong>{tr('Create video','Criar vídeo','Crear vídeo')}</strong><small>{tr('Explore video models','Explorar modelos','Explorar modelos')}</small></div><ArrowUpRight size={19}/></Link>
         <Link href="/k4k-app/creator"><Layers3 size={25}/><div><strong>K4K Remix</strong><small>{tr('Wan-powered video production','Produção de vídeo com Wan','Vídeo con tecnología Wan')}</small></div><ArrowUpRight size={19}/></Link>
       </div>
     </section>
     <section className="khf-section khf-discover" id="discover">
       <div className="khf-section-heading"><div><span className="khf-overline">{tr('MADE TO BE REIMAGINED','FEITO PARA RECRIAR','HECHO PARA RECREAR')}</span><h2>{tr('Discover the projects.','Explore os projetos.','Descubre los proyectos.')}<br/><em>{tr('Create your own version.','Crie a sua versão.','Crea tu propia versión.')}</em></h2></div><Link className="khf-viewall" href="/k4k-app/explore">{tr('Explore all templates','Ver todos os templates','Ver todas las plantillas')}<ArrowUpRight size={18}/></Link></div>
       <div className="khf-project-grid">{featured.slice(0,8).map((entry,i)=><Link href={'/k4k-app/template/'+encodeURIComponent(entry.id)} className="khf-project" key={entry.id}><div className="khf-project-media"><img src={entry.posterUrl} alt={entry.title} loading="lazy"/><span className="khf-project-play"><Play size={17}/></span><span className="khf-project-length">{Math.round(entry.durationSeconds)}s</span></div><div className="khf-project-caption"><div><strong>{entry.title}</strong><small>{entry.requiredImages||1} {tr('reference images','imagens de referência','imágenes de referencia')}</small></div><ArrowUpRight size={19}/></div></Link>)}</div>
     </section>
     <section className="khf-model-section">
       <div className="khf-section khf-model-inner"><div className="khf-section-heading"><div><span className="khf-overline">{tr('ONE WORKSPACE. MORE POSSIBILITIES.','UM ESTÚDIO. MAIS POSSIBILIDADES.','UN ESTUDIO. MÁS POSIBILIDADES.')}</span><h2>{tr('Explore our AI studio.','Explore nosso estúdio de IA.','Explora nuestro estudio IA.')}</h2></div><Link className="khf-viewall" href="/k4k-app/create">{tr('View all tools','Ver ferramentas','Ver herramientas')}<ArrowUpRight size={18}/></Link></div>
       <div className="khf-model-grid">{models.map((m,i)=><Link className={'khf-model-card khf-model-'+i} href={m.path} key={m.name}><div className="khf-model-over"><span>{m.tag}</span><ArrowUpRight size={18}/></div><div className="khf-model-visual">{m.symbol==='image'?<Images size={50}/>:m.symbol==='motion'?<Clapperboard size={50}/>:<Film size={50}/>}<i/><i/><i/></div><div className="khf-model-text"><strong>{m.name}</strong><small>{m.detail}</small></div></Link>)}</div>
       <p className="khf-availability">{tr('K4K Remix (Wan-powered) uses our existing generation flow. Premium K4K Motion character swap and other new models remain preview-only until verified.','K4K Remix usa a geração atual via Wan. K4K Motion premium e os novos modelos ainda estão em prévia.','K4K Remix usa el generador Wan existente. K4K Motion premium y otros modelos siguen en vista previa.')}</p>
       </div>
     </section>
     <section className="khf-section khf-last"><span className="khf-overline">K4K APP · KREATIVE STUDIOS 4K</span><h2>{tr('Your next viral idea','Sua próxima ideia viral','Tu próxima idea viral')}<br/><em>{tr('starts with you.','começa com você.','empieza contigo.')}</em></h2><p>{tr('Make something people haven’t seen before.','Crie algo que ninguém viu antes.','Crea algo que nadie haya visto antes.')}</p><Link className="khf-primary" href="/k4k-app/create">{tr('Enter Creative Studio','Entrar no Estúdio Criativo','Entrar al Estudio Creativo')}<ArrowRight size={20}/></Link></section>
   </main>
   <footer className="khf-footer"><Link href="/k4k-app" className="khf-brand"><img src="/k4k-mark.svg" width="28" height="28" alt=""/><strong>K4K APP</strong></Link><span>© K4K APP · KREATIVE STUDIOS 4K</span><div><Link href="/k4k-app/credits">{tr('Pricing','Preços','Precios')}</Link><Link href="/affiliates">{tr('Affiliates','Afiliados','Afiliados')}</Link><Link href="/privacy">{tr('Privacy','Privacidade','Privacidad')}</Link><Link href="/k4k-app/support">{tr('Support','Suporte','Soporte')}</Link></div></footer>
 </div>
}
