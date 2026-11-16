'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Play,Pause,Volume2,VolumeX,Menu,X,Globe2} from 'lucide-react';
import catalogue from './template-catalogue.json';
import LaunchAuthDialog from './LaunchAuthDialog';
import {useVerifiedAccount} from './useVerifiedAccount';
import AccountMenu from './AccountMenu';
import {useK4KLocale} from './locale';
import {LAUNCH_MONTHLY_CREDITS,LAUNCH_FIRST_MONTH_CREDITS} from '../../lib/k4k-launch-offer.mjs';
import {PLAN_PRICES,PLAN_CURRENCIES} from '../../lib/k4k-plan-prices.mjs';
import {planRegistration} from '../../lib/customer-routes.mjs';
const launchPlans=[{key:'starter',name:'Starter',credits:80},{key:'creator',name:'Creator',credits:160},{key:'pro',name:'Pro',credits:340},{key:'studio',name:'Studio',credits:700}];
const format=(key,currency)=>new Intl.NumberFormat(currency==='BRL'?'pt-BR':currency==='EUR'?'de-DE':currency==='USD'?'en-US':'en-GB',{style:'currency',currency}).format(PLAN_PRICES[key][currency]/100);
import './cinematic-launch.css';

const videos=(catalogue.discoveryPreviews||catalogue.trending).filter(item=>item.videoUrl).slice(0,10);
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
 function toggleSound(){const node=ref.current;if(!node)return;node.muted=!muted;setMuted(!muted);if(!paused)node.play().catch(()=>{});}
 return <article className="kc-video">
  <video ref={ref} src={item.videoUrl} poster={item.posterUrl||undefined} muted={muted} loop playsInline preload="none" aria-label={item.title+" — tap to toggle sound"} tabIndex={0} onClick={toggleSound} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggleSound();}}}/>
  <div className="kc-video-shade" aria-hidden="true"/>
  <span className="kc-video-number">{String(index+1).padStart(2,'0')} / K4K</span>
  <div className="kc-video-caption"><strong>{item.title}</strong></div>
 </article>;
}
export default function CinematicLaunch(){
 const {locale,changeLocale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [paused,setPaused]=useState(false);
 const feedRef=useRef(null);
 const [menuOpen,setMenuOpen]=useState(false);
 const [authOpen,setAuthOpen]=useState(false);
 const {user,ready}=useVerifiedAccount();
 const [currency,setCurrency]=useState('GBP');
 const [billing,setBilling]=useState(null);
 useEffect(()=>{let active=true;fetch('/api/k4k-region',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(active&&PLAN_CURRENCIES.includes(data?.currency))setCurrency(data.currency)}).catch(()=>{});fetch('/api/billing/readiness',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(active)setBilling(data)}).catch(()=>{});return()=>{active=false}},[]);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');if(media.matches)setPaused(true);},[]);
 return <div className="kc-launch kc-unified kc-three">
 <header className="kc-header"><div className="kc-nav-inner">
  <Link href="/" className="kc-logo" aria-label="K4K APP home"><img src="/k4k-mark.svg" alt="" width="34" height="34"/><span className="kc-brand-lockup"><span className="kc-wordmark">K4K<span> APP</span></span><span className="kc-brand-byline">by KreativeStudios4K</span></span></Link>
  <nav className="kc-desktop-nav" aria-label="Main navigation"><a href="#showcase">{tr('Trending','Em alta','Tendencias')}</a><a href="#plans">{tr('Prices','Preços','Precios')}</a><Link href="/affiliates">{tr('Affiliates','Afiliados','Afiliados')}</Link></nav>
  <div className="kc-header-right"><label className="kc-language"><Globe2 size={15}/><select aria-label={tr('Language','Idioma','Idioma')} value={locale} onChange={e=>changeLocale(e.target.value)}><option value="en">EN</option><option value="pt">PT</option><option value="es">ES</option></select></label>{user?<><Link className="kc-join" href="/k4k-app/creator">{tr('Open studio','Abrir estúdio','Abrir estudio')}<ArrowUpRight size={15}/></Link><AccountMenu user={user} landing/></>:<><button type="button" className="kc-login" onClick={()=>setAuthOpen(true)} disabled={!ready}>{tr('Log in','Entrar','Iniciar sesión')}</button><Link className="kc-join" href="/k4k-app/register?plan=starter">{tr('Join K4K','Junte-se ao K4K','Únete a K4K')}<ArrowUpRight size={15}/></Link></>}<button className="kc-menu-toggle" type="button" aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} aria-controls="kc-mobile-nav" onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X size={22}/>:<Menu size={22}/>}</button></div>
 </div>{menuOpen&&<nav id="kc-mobile-nav" className="kc-mobile-nav" aria-label="Mobile navigation"><a href="#showcase" onClick={()=>setMenuOpen(false)}>{tr('Trending','Em alta','Tendencias')}</a><a href="#plans" onClick={()=>setMenuOpen(false)}>{tr('Prices','Preços','Precios')}</a><Link href="/affiliates" onClick={()=>setMenuOpen(false)}>{tr('Affiliates','Afiliados','Afiliados')}</Link>{user?<><Link href="/k4k-app/creator" onClick={()=>setMenuOpen(false)}>{tr('Open studio','Abrir estúdio','Abrir estudio')}</Link><Link href="/k4k-app/account" onClick={()=>setMenuOpen(false)}>{tr('My profile','Meu perfil','Mi perfil')}</Link></>:<><button type="button" onClick={()=>{setMenuOpen(false);setAuthOpen(true)}} disabled={!ready}>{tr('Log in','Entrar','Iniciar sesión')}</button><Link href="/k4k-app/register?plan=starter" onClick={()=>setMenuOpen(false)}>{tr('Join K4K','Junte-se ao K4K','Únete a K4K')}</Link></>}</nav>}</header>
 <main>
 <section className="kc-hero kc-brand-hero" id="landing" aria-labelledby="kc-hero-title">
 <div className="kc-abstract-motion" aria-hidden="true"><i/><i/><i/></div>
 <div className="kc-abstract-logo" aria-hidden="true">K4K<span>APP</span></div><div className="kc-abstract-shade" aria-hidden="true"/>
 <div className="kc-brand-hero-content">
 <div className="kc-kicker"><i/> BY KREATIVESTUDIOS4K / {tr('THE NEXT CHAPTER','O PRÓXIMO CAPÍTULO','EL PRÓXIMO CAPÍTULO')}</div>
 <h1 id="kc-hero-title">{tr("DON’T FOLLOW","NÃO SIGA","NO SIGAS")}<br/>{tr("THE TREND.","A TENDÊNCIA.","LA TENDENCIA.")}<br/><em>{tr("CREATE IT.","CRIE A SUA.","CRÉALA.")}</em></h1>
 <p>{tr("The AI video creation studio for the next generation of creators.","O estúdio de criação de vídeos com IA para a próxima geração de criadores.","El estudio de creación de videos con IA para la próxima generación de creadores.")}</p>
 <div className="kc-hero-actions"><Link className="kc-join" href={user?"/k4k-app/creator":"/k4k-app/register?plan=starter"}>{tr("Start creating","Comece a criar","Empieza a crear")}<ArrowUpRight size={16}/></Link><a className="kc-hero-secondary" href="#showcase">{tr("Explore trending","Explore em alta","Explora tendencias")}</a></div>
 <a className="kc-scroll-link" href="#showcase">{tr("SCROLL TO DISCOVER","ROLE PARA DESCOBRIR","DESLIZA PARA DESCUBRIR")} ↓</a>
 </div></section>
  <section className="kc-showcase" id="showcase"><div className="kc-showcase-head"><div><span>K4K ORIGINALS</span><h2>{tr('TRENDING NOW.','EM ALTA AGORA.','EN TENDENCIA.')}</h2></div><button type="button" onClick={()=>setPaused(p=>!p)} aria-label={paused?'Play previews':'Pause previews'}>{paused?<Play size={17}/>:<Pause size={17}/>} {paused?tr('Play','Reproduzir','Reproducir'):tr('Pause','Pausar','Pausar')}</button></div>
 <div className="kc-trending-tools"><p>{tr("Discover viral creations. Make them your own.","Descubra criações virais. Faça do seu jeito.","Descubre creaciones virales. Hazlas tuyas.")}</p><div><button type="button" aria-label="Previous videos" onClick={()=>feedRef.current?.scrollBy({left:-320,behavior:"smooth"})}>←</button><button type="button" aria-label="Next videos" onClick={()=>feedRef.current?.scrollBy({left:320,behavior:"smooth"})}>→</button></div></div>
 <div className="kc-video-grid" ref={feedRef}>{videos.map((item,index)=><div className="kc-trending-card" key={item.id}><ShowcaseVideo item={item} index={index} paused={paused||authOpen}/><Link className="kc-trending-template" href="/k4k-app/explore">{tr("Explore template","Explorar template","Explorar plantilla")}<ArrowUpRight size={14}/></Link></div>)}</div>
 </section>
 <section id="plans" className="kc-plans" aria-labelledby="kc-plans-title"><div className="kc-plans-heading"><span>{tr("CHOOSE YOUR PLAN","ESCOLHA SEU PLANO","ELIGE TU PLAN")} · K4K APP / {tr('MONTHLY PLANS','PLANOS MENSAIS','PLANES MENSUALES')}</span><p>{tr("STARTING FROM ONLY","A PARTIR DE APENAS","DESDE SOLO")} {format('starter',currency)}/{tr("month","mês","mes")}</p><h2 id="kc-plans-title">{tr('YOUR NEXT VIRAL VIDEO.','SEU PRÓXIMO VÍDEO VIRAL.','TU PRÓXIMO VIDEO VIRAL.')} <em>{tr('STARTS HERE.','COMEÇA AQUI.','EMPIEZA AQUÍ.')}</em></h2><p>{tr('Choose a plan, create your account, complete secure checkout, then enter your studio.','Escolha um plano, crie sua conta, pague com segurança e acesse seu estúdio.','Elige un plan, crea tu cuenta, paga de forma segura y entra en tu estudio.')}</p></div>
 <div style={{margin:'24px 0',padding:'24px',border:'1px solid #faf9f6',borderRadius:16,textAlign:'center'}}><span style={{color:'#faf9f6',fontSize:12,fontWeight:800,letterSpacing:2}}>{tr('UPCOMING UK CREDIT OFFER','EM BREVE · OFERTA NO REINO UNIDO','PRÓXIMAMENTE · OFERTA EN REINO UNIDO')}</span><h3 style={{fontSize:'clamp(26px,4vw,48px)',lineHeight:1.1,margin:'12px 0',color:'#faf9f6'}}>{tr('+50% EXTRA CREDITS','+50% DE CRÉDITOS EXTRAS','+50% DE CRÉDITOS EXTRA')}</h3><p>{tr('Planned first-month bonus for new UK subscriptions. Not available yet. Current plans and checkout remain unchanged.','Bônus previsto para o primeiro mês de novas assinaturas no Reino Unido. Ainda indisponível. Os planos atuais permanecem inalterados.','Bono previsto para el primer mes de nuevas suscripciones en Reino Unido. Aún no disponible. Los planes actuales no cambian.')}</p></div>
 {process.env.NEXT_PUBLIC_K4K_LAUNCH_OFFER_PREVIEW==='true'&&<div style={{margin:'20px 0',padding:20,border:'1px solid #777',borderRadius:16}}><strong>{tr('FOUNDING CREATORS · PROPOSED OFFER','CRIADORES FUNDADORES · OFERTA PROPOSTA','CREADORES FUNDADORES · OFERTA PROPUESTA')}</strong><p>{tr('Preview only: not available for purchase yet.','Somente prévia: ainda não disponível para compra.','Solo vista previa: aún no disponible para comprar.')}</p><p>{tr('Planned: one free 5-second Lite video for the first 100 verified creators.','Planejado: um vídeo Lite de 5 segundos grátis para os primeiros 100 criadores verificados.','Previsto: un vídeo Lite de 5 segundos gratis para los primeros 100 creadores verificados.')}</p>{launchPlans.map(plan=><p key={plan.key}>{plan.name}: {LAUNCH_FIRST_MONTH_CREDITS[plan.key]} {tr('first month','primeiro mês','primer mes')} · {LAUNCH_MONTHLY_CREDITS[plan.key]} {tr('monthly credits thereafter','créditos mensais depois','créditos mensuales después')}</p>)}</div>}<div className="kc-plan-grid">{launchPlans.map(plan=><article key={plan.key} className={'kc-plan-card'+(plan.key==='starter'?' kc-plan-starter':'')}><div className="kc-plan-top"><h3>{plan.name}</h3>{plan.key==='starter'&&<span>{tr('LOWEST PRICE','MENOR PREÇO','PRECIO MÁS BAJO')}</span>}{plan.key==='creator'&&<span>{tr('POPULAR','POPULAR','POPULAR')}</span>}</div><div className="kc-plan-price">{format(plan.key,currency)}<small>/{tr('month','mês','mes')}</small></div><div className="kc-plan-credits"><strong>{plan.credits}</strong> {tr('monthly credits','créditos mensais','créditos mensuales')}</div><p>{tr('Creator workspace · Templates · Private library & downloads','Estúdio · Templates · Biblioteca privada e downloads','Estudio · Plantillas · Biblioteca privada y descargas')}</p><Link className="kc-plan-cta" href={planRegistration(plan.key)}>{tr('Choose','Escolher','Elegir')} {plan.name}<ArrowUpRight size={17}/></Link></article>)}</div>
 <p className="kc-plan-note">{tr('Prices include applicable tax. Credits activate after verified payment.','Preços incluem impostos aplicáveis. Créditos após pagamento confirmado.','Precios con impuestos aplicables incluidos. Créditos tras pago verificado.')}{billing?.checkoutReady!==true?' '+tr('Create your account now; paid checkout is not open yet.','Crie sua conta agora; o pagamento ainda não está disponível.','Crea tu cuenta ahora; el pago aún no está disponible.'):''}</p></section>
 <details className="kc-responsible kc-footer-responsible"><summary>{tr("Responsible AI and platform information","IA responsável e informações da plataforma","IA responsable e información de la plataforma")}</summary><p className="kc-purpose">{tr("K4K APP is an AI video creation studio for original creative projects, social media videos and licensed character-based storytelling. Google Sign-In is used only to authenticate users; video generation uses a separate AI provider.","K4K APP é um estúdio de criação de vídeos com IA para projetos criativos originais, redes sociais e narrativas com personagens autorizados. O Login com Google serve apenas para autenticar utilizadores; a geração de vídeos utiliza um fornecedor de IA separado.","K4K APP es un estudio de creación de vídeos con IA para proyectos originales, redes sociales y narrativas con personajes autorizados. Google Sign-In solo autentica usuarios; la generación utiliza un proveedor de IA independiente.")}</p><span>K4K APP / {tr("RESPONSIBLE AI","IA RESPONSÁVEL","IA RESPONSABLE")}</span><h2 id="kc-responsible-title">{tr("Create responsibly.","Crie com responsabilidade.","Crea con responsabilidad.")}</h2><p>{tr("K4K APP prohibits non-consensual intimate imagery (NCII), including AI-generated sexual deepfakes, sexualized depictions of real people without consent, and any sexual exploitation of minors. Google APIs are used for authentication, not to create or edit intimate imagery. Video generation uses a separate provider with input and output safety checks enabled. Use only media you have the right and consent to use.","O K4K APP proíbe imagens íntimas não consensuais (NCII), incluindo deepfakes sexuais gerados por IA, representações sexualizadas de pessoas reais sem consentimento e qualquer exploração sexual de menores. As APIs do Google são utilizadas para autenticação, não para criar ou editar imagens íntimas. A geração utiliza um fornecedor separado com verificações de segurança de entradas e resultados ativadas. Utilize apenas conteúdo para o qual tem direitos e consentimento.","K4K APP prohíbe imágenes íntimas no consentidas (NCII), incluidos deepfakes sexuales generados por IA, representaciones sexualizadas de personas reales sin consentimiento y toda explotación sexual de menores. Las API de Google se utilizan para autenticación, no para crear ni editar imágenes íntimas. La generación utiliza un proveedor independiente con controles de seguridad de entrada y salida activados. Utiliza únicamente contenido para el que tengas derechos y consentimiento.")}</p><p><Link href="/terms">{tr("Read our acceptable-use rules","Leia as regras de utilização","Consulta las normas de uso")}</Link> · <a href="mailto:hello@kreativestudios4k.com?subject=K4K%20content%20safety%20report">{tr("Report abuse","Denunciar abuso","Denunciar abuso")}</a></p></details>
 </main><footer className="kc-footer"><strong>K4K™</strong><span>CREATED BY KREATIVESTUDIOS4K</span><div><Link href="/affiliates">Creator Partners</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/k4k-app/support">Support</Link></div></footer>
 <LaunchAuthDialog open={authOpen} onClose={()=>setAuthOpen(false)}/>
 </div>;
}
