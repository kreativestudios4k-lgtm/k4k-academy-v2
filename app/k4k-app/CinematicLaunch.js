'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Play,Pause,Volume2,VolumeX,Menu,X,Globe2} from 'lucide-react';
import catalogue from './template-catalogue.json';
import LaunchAuthDialog from './LaunchAuthDialog';
import {useK4KLocale} from './locale';
import {PLAN_PRICES,PLAN_CURRENCIES} from '../../lib/k4k-plan-prices.mjs';
import {planRegistration} from '../../lib/customer-routes.mjs';
const launchPlans=[{key:'starter',name:'Starter',credits:80},{key:'creator',name:'Creator',credits:160},{key:'pro',name:'Pro',credits:340},{key:'studio',name:'Studio',credits:700}];
const format=(key,currency)=>new Intl.NumberFormat(currency==='BRL'?'pt-BR':currency==='EUR'?'de-DE':currency==='USD'?'en-US':'en-GB',{style:'currency',currency}).format(PLAN_PRICES[key][currency]/100);
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
 const [authOpen,setAuthOpen]=useState(false);
 const [currency,setCurrency]=useState('GBP');
 const [billing,setBilling]=useState(null);
 useEffect(()=>{let active=true;fetch('/api/k4k-region',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(active&&PLAN_CURRENCIES.includes(data?.currency))setCurrency(data.currency)}).catch(()=>{});fetch('/api/billing/readiness',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(active)setBilling(data)}).catch(()=>{});return()=>{active=false}},[]);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');if(media.matches)setPaused(true);},[]);
 return <div className="kc-launch">
 <header className="kc-header"><div className="kc-nav-inner">
  <Link href="/" className="kc-logo" aria-label="K4K APP home"><img src="/k4k-mark.svg" alt="" width="34" height="34"/><span className="kc-brand-lockup"><span className="kc-wordmark">K4K<span> APP</span></span><span className="kc-brand-byline">by KreativeStudios4K</span></span></Link>
  <nav className="kc-desktop-nav" aria-label="Main navigation"><a href="#showcase">{tr('Showcase','Vitrine','Galería')}</a><a href="#plans">{tr('Plans','Planos','Planes')}</a></nav>
  <div className="kc-header-right"><label className="kc-language"><Globe2 size={15}/><select aria-label={tr('Language','Idioma','Idioma')} value={locale} onChange={e=>changeLocale(e.target.value)}><option value="en">EN</option><option value="pt">PT</option><option value="es">ES</option></select></label><button type="button" className="kc-login" onClick={()=>setAuthOpen(true)}>{tr('Log in','Entrar','Iniciar sesión')}</button><Link className="kc-join" href="/k4k-app/register?plan=starter">{tr('Join K4K','Junte-se ao K4K','Únete a K4K')}<ArrowUpRight size={15}/></Link><button className="kc-menu-toggle" type="button" aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} aria-controls="kc-mobile-nav" onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X size={22}/>:<Menu size={22}/>}</button></div>
 </div>{menuOpen&&<nav id="kc-mobile-nav" className="kc-mobile-nav" aria-label="Mobile navigation"><a href="#showcase" onClick={()=>setMenuOpen(false)}>{tr('Showcase','Vitrine','Galería')}</a><a href="#plans" onClick={()=>setMenuOpen(false)}>{tr('Plans','Planos','Planes')}</a><button type="button" onClick={()=>{setMenuOpen(false);setAuthOpen(true)}}>{tr('Log in','Entrar','Iniciar sesión')}</button><Link href="/k4k-app/register?plan=starter" onClick={()=>setMenuOpen(false)}>{tr('Join K4K','Junte-se ao K4K','Únete a K4K')}</Link></nav>}</header>
 <main>
 <section className="kc-hero">
 <div className="kc-kicker"><i/> BY KREATIVESTUDIOS4K / {tr('THE NEXT CHAPTER','O PRÓXIMO CAPÍTULO','EL PRÓXIMO CAPÍTULO')}</div>
 <h1><span>{tr("DON’T FOLLOW","NÃO SIGA","NO SIGAS")}</span><span>{tr('THE TREND.','A TENDÊNCIA.','LA TENDENCIA.')}</span><em>{tr('CREATE IT.','CRIE A SUA.','CRÉALA.')}</em></h1>
 <p>{tr('Your imagination. Your characters. Your next viral video.','Sua imaginação. Seus personagens. Seu próximo vídeo viral.','Tu imaginación. Tus personajes. Tu próximo vídeo viral.')}</p>
 <div className="kc-price-offer"><span>{tr('STARTING FROM ONLY','A PARTIR DE APENAS','DESDE SOLO')}</span><strong>{format('starter',currency)}<small>/{tr('month','mês','mes')}</small></strong><p>{tr('80 monthly generation credits · applicable tax included','80 créditos mensais · impostos aplicáveis incluídos','80 créditos mensuales · impuestos aplicables incluidos')}</p><a className="kc-release kc-primary-cta" href="#plans"><strong>{tr('CHOOSE YOUR PLAN','ESCOLHA SEU PLANO','ELIGE TU PLAN')}</strong><ArrowUpRight size={22}/></a></div>
 </section>
 <section id="plans" className="kc-plans" aria-labelledby="kc-plans-title"><div className="kc-plans-heading"><span>K4K APP / {tr('MONTHLY PLANS','PLANOS MENSAIS','PLANES MENSUALES')}</span><h2 id="kc-plans-title">{tr('YOUR NEXT VIRAL VIDEO.','SEU PRÓXIMO VÍDEO VIRAL.','TU PRÓXIMO VIDEO VIRAL.')} <em>{tr('STARTS HERE.','COMEÇA AQUI.','EMPIEZA AQUÍ.')}</em></h2><p>{tr('Choose a plan, create your account, complete secure checkout, then enter your studio.','Escolha um plano, crie sua conta, pague com segurança e acesse seu estúdio.','Elige un plan, crea tu cuenta, paga de forma segura y entra en tu estudio.')}</p></div>
 <div className="kc-plan-grid">{launchPlans.map(plan=><article key={plan.key} className={'kc-plan-card'+(plan.key==='starter'?' kc-plan-starter':'')}><div className="kc-plan-top"><h3>{plan.name}</h3>{plan.key==='starter'&&<span>{tr('LOWEST PRICE','MENOR PREÇO','PRECIO MÁS BAJO')}</span>}{plan.key==='creator'&&<span>{tr('POPULAR','POPULAR','POPULAR')}</span>}</div><div className="kc-plan-price">{format(plan.key,currency)}<small>/{tr('month','mês','mes')}</small></div><div className="kc-plan-credits"><strong>{plan.credits}</strong> {tr('monthly credits','créditos mensais','créditos mensuales')}</div><p>{tr('Creator workspace · Templates · Private library & downloads','Estúdio · Templates · Biblioteca privada e downloads','Estudio · Plantillas · Biblioteca privada y descargas')}</p><Link className="kc-plan-cta" href={planRegistration(plan.key)}>{tr('Choose','Escolher','Elegir')} {plan.name}<ArrowUpRight size={17}/></Link></article>)}</div>
 <p className="kc-plan-note">{tr('Prices include applicable tax. Credits activate after verified payment.','Preços incluem impostos aplicáveis. Créditos após pagamento confirmado.','Precios con impuestos aplicables incluidos. Créditos tras pago verificado.')}{billing?.checkoutReady!==true?' '+tr('Create your account now; paid checkout is not open yet.','Crie sua conta agora; o pagamento ainda não está disponível.','Crea tu cuenta ahora; el pago aún no está disponible.'):''}</p></section>
 <section className="kc-showcase" id="showcase"><div className="kc-showcase-head"><div><span>K4K ORIGINALS</span><h2>{tr('THE WORLD IS WATCHING.','O MUNDO ESTÁ ASSISTINDO.','EL MUNDO ESTÁ MIRANDO.')}</h2></div><button type="button" onClick={()=>setPaused(p=>!p)} aria-label={paused?'Play previews':'Pause previews'}>{paused?<Play size={17}/>:<Pause size={17}/>} {paused?tr('Play','Reproduzir','Reproducir'):tr('Pause','Pausar','Pausar')}</button></div>
 <div className="kc-video-grid">{videos.map((item,index)=><ShowcaseVideo key={item.id} item={item} index={index} paused={paused||authOpen}/>)}</div>
 </section>
 <section id="release" className="kc-final"><span>K4K APP / {tr('CREATE YOUR NEXT SCENE','CRIE SUA PRÓXIMA CENA','CREA TU PRÓXIMA ESCENA')}</span><h2><span>{tr('THE NEXT ERA','A NOVA ERA','LA NUEVA ERA')}</span><em>{tr('OF CREATORS.','DOS CRIADORES.','DE LOS CREADORES.')}</em></h2><p>{tr('Choose the plan that fits your creative workflow. Start with a free account and unlock credits after verified payment.','Escolha seu plano. Crie uma conta gratuita e libere créditos após o pagamento confirmado.','Elige tu plan. Crea una cuenta gratuita y desbloquea créditos tras confirmar el pago.')}</p><a className="kc-release kc-early-cta" href="#plans"><strong>{tr('EXPLORE PLANS','VER PLANOS','VER PLANES')}</strong><ArrowUpRight size={20}/></a></section>
 </main><footer className="kc-footer"><strong>K4K™</strong><span>CREATED BY KREATIVESTUDIOS4K</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/k4k-app/support">Support</Link></div></footer>
 <LaunchAuthDialog open={authOpen} onClose={()=>setAuthOpen(false)}/>
 </div>;
}
