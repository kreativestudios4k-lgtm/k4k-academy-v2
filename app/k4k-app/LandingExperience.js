'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import catalogue from './template-catalogue.json';
import {useK4KLocale} from './locale';

const allTemplates=[
 ...catalogue.topPerforming.map(item=>({...item,kind:'top'})),
 ...catalogue.trending.map(item=>({...item,kind:'trending'})),
];
const copy={
 en:{
  explore:'Explore',templates:'Templates',how:'How it works',pricing:'Plans',help:'Help',account:'My account',
  studio:'Open studio',eyebrow:'K4K APP / VIRAL CREATOR STUDIO',headlineA:'YOUR FACE.',headlineB:'YOUR MOMENT.',
  intro:'Discover a viral scene, upload your character references and make the story yours. One creative home for every project.',
  heroCta:'Explore viral templates',heroSecondary:'Open Creator Studio',mini:'THE ORIGINAL VIDEO. A NEW MAIN CHARACTER.',
  discoverLabel:'THE CREATOR EDIT',discoverTitle:'Trending right now',discoverText:'Start with a scene people recognise, then make it your own.',
  all:'All templates',top:'Top viewed',trending:'Trending',search:'Search a viral scene...',viewAll:'View all templates',showLess:'Show fewer',
  use:'Use template',tap:'Tap video for sound',views:'views',
  howLabel:'THE K4K METHOD',howTitle:'Three steps. One new story.',
  step1:'Find your moment',step1Text:'Pick a reference scene from our growing template library.',
  step2:'Add your cast',step2Text:'Upload the people or products you want in the scene. Your private workspace supports multiple images.',
  step3:'Build your project',step3Text:'Review your choices and save a draft in your creator account. Video generation is still in preview.',
  crewLabel:'CREATE TOGETHER',crewTitle:'Bring the whole crew.',crewText:'Group scenes, dance trends and unexpected moments. Recast the video with friends, teammates or your own characters.',
  crewCta:'Browse group-ready scenes',productLabel:'GO BEYOND TEMPLATES',productTitle:'Your own reference. Your own rules.',
  productText:'Bring your own reference video, collect up to 30 character images and describe the result. Everything lives inside the K4K creator workflow.',
  productCta:'Open the creator workspace',accountLabel:'ONE ACCOUNT. ALL YOUR WORK.',accountTitle:'A studio that remembers your projects.',
  accountText:'Access drafts, account details, credit plans and support in one place. Existing Academy students keep a dedicated route to their courses.',
  projects:'My projects',academy:'My Academy',planCta:'See plans and credits',
  faqLabel:'GOOD TO KNOW',faqTitle:'Your questions, answered.',
  q1:'Can I generate AI videos today?',a1:'The K4K website, template previews and project drafts are available in preview. Paid AI generation is disabled until provider and credit checks are complete.',
  q2:'How many character images can I use?',a2:'The Creator Studio can prepare up to 30 image references per project. Extra images remain in the browser until secure multi-file storage is connected.',
  q3:'Will my Academy membership be affected?',a3:'No. K4K APP preview work does not remove or replace existing Academy subscriptions.',
  footer:'Original ideas. Familiar moments. Your next viral story.',preview:'CREATOR PREVIEW — GENERATION NOT YET ENABLED',legal:'Policies',
 },
 pt:{
  explore:'Explorar',templates:'Templates',how:'Como funciona',pricing:'Planos',help:'Ajuda',account:'Minha conta',
  studio:'Abrir estúdio',eyebrow:'K4K APP / ESTÚDIO DE VÍDEOS VIRAIS',headlineA:'SEU ROSTO.',headlineB:'SEU MOMENTO.',
  intro:'Escolha uma cena viral, envie as fotos dos personagens e crie uma nova história. Tudo em um só lugar.',
  heroCta:'Explorar templates',heroSecondary:'Abrir estúdio de criação',mini:'O VÍDEO ORIGINAL. UM NOVO PROTAGONISTA.',
  discoverLabel:'ESCOLHAS DOS CRIADORES',discoverTitle:'Em alta agora',discoverText:'Comece com uma cena conhecida e dê o seu próprio toque.',
  all:'Todos',top:'Mais vistos',trending:'Em alta',search:'Busque um vídeo viral...',viewAll:'Ver todos os templates',showLess:'Mostrar menos',
  use:'Usar template',tap:'Toque no vídeo para ouvir',views:'visualizações',
  howLabel:'O MÉTODO K4K',howTitle:'Três passos. Outra história.',
  step1:'Escolha a cena',step1Text:'Selecione um vídeo da nossa biblioteca de referências.',
  step2:'Monte o elenco',step2Text:'Envie imagens dos personagens ou produtos que quer usar.',
  step3:'Prepare o projeto',step3Text:'Revise suas escolhas e salve um rascunho. A geração de vídeos continua em prévia.',
  crewLabel:'CRIE EM GRUPO',crewTitle:'Traga a sua galera.',crewText:'Cenas em grupo, danças e momentos inesperados com seus personagens.',
  crewCta:'Ver cenas em grupo',productLabel:'ALÉM DOS TEMPLATES',productTitle:'Sua referência. Suas regras.',
  productText:'Envie seu próprio vídeo e organize até 30 fotos de referência em um só fluxo de criação.',
  productCta:'Abrir área de criação',accountLabel:'UMA CONTA. SEUS PROJETOS.',accountTitle:'O estúdio que acompanha você.',
  accountText:'Rascunhos, planos, conta e suporte no mesmo lugar. Alunos da Academy continuam com seu acesso.',
  projects:'Meus projetos',academy:'Minha Academy',planCta:'Ver planos e créditos',
  faqLabel:'DÚVIDAS FREQUENTES',faqTitle:'Tudo que precisa saber.',
  q1:'Já posso gerar vídeos?',a1:'Os templates, a prévia do estúdio e os rascunhos estão disponíveis. A geração paga será habilitada depois dos testes.',
  q2:'Quantas fotos posso usar?',a2:'O estúdio prepara até 30 imagens por projeto. Fotos adicionais ficam no navegador até o armazenamento seguro estar pronto.',
  q3:'Minha Academy continua funcionando?',a3:'Sim. Suas assinaturas atuais da Academy não são alteradas pela prévia.',
  footer:'Ideias originais. Momentos conhecidos. Sua próxima história viral.',preview:'PRÉVIA DO ESTÚDIO — GERAÇÃO AINDA DESATIVADA',legal:'Políticas',
 },
 es:{
  explore:'Explorar',templates:'Plantillas',how:'Cómo funciona',pricing:'Planes',help:'Ayuda',account:'Mi cuenta',
  studio:'Abrir estudio',eyebrow:'K4K APP / ESTUDIO VIRAL',headlineA:'TU ROSTRO.',headlineB:'TU MOMENTO.',
  intro:'Elige un vídeo viral, añade tus personajes y crea una nueva historia. Todo en un mismo lugar.',
  heroCta:'Explorar plantillas',heroSecondary:'Abrir estudio',mini:'EL VÍDEO ORIGINAL. UN NUEVO PROTAGONISTA.',
  discoverLabel:'SELECCIÓN CREATIVA',discoverTitle:'Tendencias de hoy',discoverText:'Empieza con un vídeo conocido y hazlo tuyo.',
  all:'Todas',top:'Más vistos',trending:'Tendencias',search:'Buscar una escena...',viewAll:'Ver todas las plantillas',showLess:'Ver menos',
  use:'Usar plantilla',tap:'Toca el vídeo para escuchar',views:'vistas',
  howLabel:'EL MÉTODO K4K',howTitle:'Tres pasos. Una historia.',
  step1:'Elige tu escena',step1Text:'Busca un vídeo en nuestra biblioteca.',
  step2:'Añade personajes',step2Text:'Sube referencias de las personas o productos que necesitas.',
  step3:'Prepara tu proyecto',step3Text:'Guarda un borrador en tu cuenta. La generación de vídeo sigue desactivada.',
  crewLabel:'CREA CON AMIGOS',crewTitle:'Reúne a tu equipo.',crewText:'Escenas de grupo, bailes y momentos especiales con tus personajes.',
  crewCta:'Ver escenas de grupo',productLabel:'MÁS QUE PLANTILLAS',productTitle:'Tu referencia. Tus reglas.',
  productText:'Sube tu propio vídeo y organiza hasta 30 fotos de referencia en un único espacio.',
  productCta:'Abrir el estudio',accountLabel:'UNA CUENTA. TUS PROYECTOS.',accountTitle:'Un estudio que te acompaña.',
  accountText:'Borradores, planes, cuenta y soporte en un solo lugar. Los alumnos de Academy mantienen su acceso.',
  projects:'Mis proyectos',academy:'Mi Academy',planCta:'Ver planes y créditos',
  faqLabel:'PREGUNTAS',faqTitle:'Resolvemos tus dudas.',
  q1:'¿Ya puedo generar vídeos?',a1:'Las plantillas y borradores están en preview. La generación de pago sigue desactivada hasta terminar las pruebas.',
  q2:'¿Cuántas fotos puedo usar?',a2:'El estudio admite hasta 30 referencias. Las fotos extra permanecen en tu navegador hasta activar el almacenamiento seguro.',
  q3:'¿Pierdo el acceso a Academy?',a3:'No. Las suscripciones existentes de Academy permanecen intactas.',
  footer:'Ideas originales. Momentos conocidos. Tu próxima historia viral.',preview:'VISTA PREVIA — GENERACIÓN DESACTIVADA',legal:'Políticas',
 }
};
function shortViews(n){return n>=1000000?(n/1000000).toFixed(1).replace(/\.0$/,'')+'M':(n||0).toLocaleString('en-GB');}
function PreviewVideo({item,featured=false,register}){
 const ref=useRef(null);
 function startMuted(){if(ref.current){ref.current.muted=true;ref.current.play().catch(()=>{});}}
 function pause(){if(ref.current&&ref.current.muted)ref.current.pause();}
 return <video
  ref={el=>{ref.current=el;register?.(item.id,el)}}
  src={item.videoUrl}
  className={featured?'k4k-videoframe-video k4k-videoframe-featured':'k4k-videoframe-video'}
  poster={item.posterUrl||undefined}
  muted loop playsInline preload={featured?'metadata':'none'}
  onMouseEnter={startMuted} onMouseLeave={pause}
  onClick={event=>{
   const current=event.currentTarget;
   if(current.muted){current.muted=false;current.volume=1;current.play().catch(()=>{});}
   else if(current.paused)current.play().catch(()=>{});else current.pause();
  }}
  aria-label={item.title+' video preview — tap to enable sound'}
 />;
}
export default function LandingExperience(){
 const {locale}=useK4KLocale();
 const t=copy[locale]||copy.en;
 const [filter,setFilter]=useState('all');
 const [search,setSearch]=useState('');
 const [expanded,setExpanded]=useState(false);
 const videoRefs=useRef(new Map());
 const register=(id,element)=>{if(element)videoRefs.current.set(id,element);else videoRefs.current.delete(id);};
 const filtered=allTemplates.filter(item=>(filter==='all'||item.kind===filter)&&item.title.toLowerCase().includes(search.toLowerCase().trim()));
 const visible=expanded||search?filtered:filtered.slice(0,8);
 const hero=allTemplates[0];
 return <div className="k4k-landing">
  <div className="k4k-launch-note"><span className="k4k-live-dot" aria-hidden="true"/>{t.preview}</div>
  <header className="k4k-landing-header">
   <Link href="/k4k-app" className="k4k-landing-logo" aria-label="K4K APP home"><span className="k4k-mark">✦</span>K4K<span>APP</span></Link>
   <nav className="k4k-header-links" aria-label="Main navigation"><a href="#templates">{t.templates}</a><a href="#how">{t.how}</a><Link href="/k4k-app/credits">{t.pricing}</Link><Link href="/k4k-app/support">{t.help}</Link></nav>
   <div className="k4k-header-actions"><Link className="k4k-header-account" href="/k4k-app/account">{t.account}</Link><Link className="k4k-header-create" href="/k4k-app/creator">{t.studio}<span aria-hidden="true">↗</span></Link></div>
  </header>
  <main>
   <section className="k4k-landing-hero">
    <div className="k4k-hero-copy">
     <span className="k4k-overline"><i aria-hidden="true"/> {t.eyebrow}</span>
     <h1>{t.headlineA}<br/><em>{t.headlineB}</em></h1>
     <p>{t.intro}</p>
     <div className="k4k-hero-buttons"><a className="k4k-button-primary" href="#templates">{t.heroCta}<span aria-hidden="true">↗</span></a><Link className="k4k-button-ghost" href="/k4k-app/creator">{t.heroSecondary}</Link></div>
     <div className="k4k-hero-micro"><span className="k4k-micro-symbol">✦</span><span>{t.mini}</span></div>
    </div>
    <div className="k4k-hero-media">
     <div className="k4k-hero-video-wrap"><PreviewVideo item={hero} featured register={register}/><div className="k4k-hero-media-top"><span>01 / K4K ORIGINALS</span><span className="k4k-media-dot">● PREVIEW</span></div><div className="k4k-hero-media-bottom"><div><small>TRENDING SCENE</small><strong>{hero.title}</strong></div><Link href={'/k4k-app/template/'+hero.id} aria-label={'Open '+hero.title}>↗</Link></div></div>
     <div className="k4k-hero-vertical-text" aria-hidden="true">RECREATE / REIMAGINE / REPEAT</div>
    </div>
   </section>
   <section id="templates" className="k4k-landing-section k4k-template-section">
    <div className="k4k-section-heading"><div><span className="k4k-overline">{t.discoverLabel}</span><h2>{t.discoverTitle}<span>.</span></h2><p>{t.discoverText}</p></div><Link href="/k4k-app/creator" className="k4k-section-link">{t.studio} ↗</Link></div>
    <div className="k4k-filter-row"><div className="k4k-filters" role="group" aria-label="Filter templates">{[['all',t.all],['trending',t.trending],['top',t.top]].map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} className={filter===key?'selected':''} onClick={()=>{setFilter(key);setExpanded(false)}}>{label}</button>)}</div><label className="k4k-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search} aria-label={t.search}/></label></div>
    <div className="k4k-template-grid">{visible.map((item,index)=><article className="k4k-template-card" key={item.id}><div className="k4k-template-frame"><PreviewVideo item={item} register={register}/><span className="k4k-template-badge">{item.kind==='top'?t.top:t.trending}</span><span className="k4k-template-index">{String(index+1).padStart(2,'0')}</span></div><div className="k4k-template-card-body"><div><h3>{item.title}</h3><p>{item.views?shortViews(item.views)+' '+t.views:(item.durationSeconds?Math.round(item.durationSeconds)+'s video reference':'K4K APP template')}</p></div><Link href={'/k4k-app/template/'+item.id} aria-label={t.use+': '+item.title}>↗</Link></div><Link className="k4k-template-use" href={'/k4k-app/template/'+item.id}>{t.use} <span aria-hidden="true">↗</span></Link></article>)}</div>
    {filtered.length===0?<p className="k4k-empty-results">No matching templates. Try another search.</p>:null}
    {!search&&filtered.length>8?<div className="k4k-showmore"><button type="button" onClick={()=>setExpanded(v=>!v)}>{expanded?t.showLess:t.viewAll} <span aria-hidden="true">{expanded?'↑':'↓'}</span></button></div>:null}
   </section>
   <section id="how" className="k4k-landing-section k4k-method-section"><div className="k4k-section-heading"><div><span className="k4k-overline">{t.howLabel}</span><h2>{t.howTitle}</h2></div></div><div className="k4k-method-grid">{[[t.step1,t.step1Text,'01','◇'],[t.step2,t.step2Text,'02','▣'],[t.step3,t.step3Text,'03','✦']].map(([title,body,num,symbol])=><div className="k4k-method-card" key={num}><span className="k4k-step-number">{num}</span><span className="k4k-step-icon" aria-hidden="true">{symbol}</span><h3>{title}</h3><p>{body}</p></div>)}</div></section>
   <section className="k4k-landing-section k4k-crew-section"><div className="k4k-crew-copy"><span className="k4k-overline">{t.crewLabel}</span><h2>{t.crewTitle}</h2><p>{t.crewText}</p><a className="k4k-button-primary" href="#templates">{t.crewCta} ↗</a></div><div className="k4k-crew-scenes">{allTemplates.slice(1,4).map(item=><Link key={item.id} href={'/k4k-app/template/'+item.id} className="k4k-crew-tile"><video src={item.videoUrl} muted loop playsInline preload="none"/><span>{item.title} ↗</span></Link>)}</div></section>
   <section className="k4k-landing-section k4k-studio-feature"><div><span className="k4k-overline">{t.productLabel}</span><h2>{t.productTitle}</h2><p>{t.productText}</p><Link href="/k4k-app/creator" className="k4k-button-primary">{t.productCta} ↗</Link></div><div className="k4k-workspace-sim" aria-hidden="true"><div className="k4k-sim-top"><span>✦ K4K CREATOR</span><span>● PREVIEW</span></div><div className="k4k-sim-canvas"><span>▶</span><strong>YOUR REFERENCE</strong><small>9:16 VIDEO</small></div><div className="k4k-sim-options"><span>▣ VIDEO</span><span>✧ CHARACTERS</span><span>◎ PROMPT</span></div><div className="k4k-sim-action">✦ CREATE PROJECT</div></div></section>
   <section className="k4k-landing-section k4k-account-section"><div><span className="k4k-overline">{t.accountLabel}</span><h2>{t.accountTitle}</h2><p>{t.accountText}</p></div><div className="k4k-account-links"><Link href="/k4k-app/videos">▦ {t.projects} ↗</Link><Link href="/k4k-app/credits">◎ {t.planCta} ↗</Link><Link href="/academy">▧ {t.academy} ↗</Link></div></section>
   <section className="k4k-landing-section k4k-faq-section"><div className="k4k-section-heading"><div><span className="k4k-overline">{t.faqLabel}</span><h2>{t.faqTitle}</h2></div></div>{[[t.q1,t.a1],[t.q2,t.a2],[t.q3,t.a3]].map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</section>
  </main>
  <footer className="k4k-landing-footer"><div><Link href="/k4k-app" className="k4k-landing-logo"><span className="k4k-mark">✦</span>K4K<span>APP</span></Link><p>{t.footer}</p></div><nav aria-label="Footer links"><Link href="/k4k-app/account">{t.account}</Link><Link href="/k4k-app/support">{t.help}</Link><Link href="/academy">Academy</Link><Link href="/terms">{t.legal}</Link><Link href="/privacy">Privacy</Link></nav><small>© K4K APP · KreativeStudios4K</small></footer>
  <nav className="k4k-landing-mobile-nav" aria-label="Quick navigation"><a href="#templates"><span aria-hidden="true">⌕</span>{t.explore}</a><Link href="/k4k-app/videos"><span aria-hidden="true">▦</span>{t.projects}</Link><Link href="/k4k-app/creator" className="k4k-mobile-create"><span aria-hidden="true">✦</span>{t.studio}</Link><Link href="/k4k-app/account"><span aria-hidden="true">♙</span>{t.account}</Link></nav>
 </div>;
}
