'use client';
// K4K landing, rebuilt with no media at all: no video files, no images, no CDN
// assets. Every moving element is CSS or inline SVG, so the page carries no
// third-party media dependency and nothing that can be taken down.
// It reads no secrets and calls only the existing public region endpoint.
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Play,Layers,Sparkles} from 'lucide-react';
import {PLAN_PRICES,PLAN_CURRENCIES} from '../../../lib/k4k-plan-prices.mjs';
import {useK4KLocale} from '../locale';
import './home-v2.css';

const PLANS=[
 {key:'starter',name:'STARTER',credits:80},
 {key:'creator',name:'CREATOR',credits:160,popular:true},
 {key:'pro',name:'PRO',credits:340},
 {key:'studio',name:'STUDIO',credits:700},
];
const CELLS=Array.from({length:120},(x,i)=>i);
const locales={GBP:'en-GB',USD:'en-US',EUR:'de-DE',BRL:'pt-BR'};

function useReveal(){
 const ref=useRef(null);
 useEffect(()=>{
  const nodes=ref.current?.querySelectorAll('.kv2-reveal,.kv2-step');
  if(!nodes?.length)return;
  if(!('IntersectionObserver'in window)){nodes.forEach(n=>n.classList.add('in'));return}
  const io=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in');io.unobserve(entry.target)}});
  },{threshold:.18});
  nodes.forEach(node=>io.observe(node));
  return()=>io.disconnect();
 },[]);
 return ref;
}

export default function HomeV2(){
 const {locale}=useK4KLocale();
 const pt=locale==='pt',es=locale==='es';
 const tr=(en,br,spa)=>pt?br:es?spa:en;
 // Price renders immediately in the prerendered HTML, then corrects once the
 // visitor's billing region is known. Never a placeholder where a price goes.
 const [currency,setCurrency]=useState('GBP');
 useEffect(()=>{let live=true;fetch('/api/k4k-region',{cache:'no-store'})
  .then(r=>r.ok?r.json():null)
  .then(data=>{if(live&&PLAN_CURRENCIES.includes(data?.currency))setCurrency(data.currency)})
  .catch(()=>{});return()=>{live=false}},[]);
 const money=key=>new Intl.NumberFormat(locales[currency]||'en-GB',{style:'currency',currency}).format(PLAN_PRICES[key][currency]/100);
 const page=useReveal();

 const marquee=[tr('MOTION TRANSFER','TRANSFERÊNCIA DE MOVIMENTO','TRANSFERENCIA DE MOVIMIENTO'),tr('TEXT TO VIDEO','TEXTO PARA VÍDEO','TEXTO A VÍDEO'),tr('IMAGE TO VIDEO','IMAGEM PARA VÍDEO','IMAGEN A VÍDEO'),tr('CHARACTER LOCK','CHARACTER LOCK','CHARACTER LOCK'),tr('TEXT TO IMAGE','TEXTO PARA IMAGEM','TEXTO A IMAGEN'),tr('IMAGE EDIT','EDIÇÃO DE IMAGEM','EDICIÓN DE IMAGEN'),tr('PRIVATE LIBRARY','BIBLIOTECA PRIVADA','BIBLIOTECA PRIVADA')];

 const steps=[
  {n:'01',t:tr('Bring your reference','Traga sua referência','Trae tu referencia'),d:tr('Upload a clip you have the right to use, or start from a K4K template.','Envie um clipe que você tem direito de usar, ou comece de um template K4K.','Sube un clip que tengas derecho a usar, o empieza desde una plantilla K4K.'),
   svg:<svg width="100%" height="46" viewBox="0 0 220 46" aria-hidden="true"><path className="kv2-draw" d="M4 38 L58 12 L112 30 L166 8 L216 24"/></svg>},
  {n:'02',t:tr('Add your cast','Adicione seu elenco','Añade tu reparto'),d:tr('Drop in the photos of the characters you want on screen. Faces, hair and wardrobe stay locked.','Adicione as fotos dos personagens. Rostos, cabelo e roupas são preservados.','Añade las fotos de tus personajes. Rostros, pelo y ropa se mantienen.'),
   svg:<svg width="100%" height="46" viewBox="0 0 220 46" aria-hidden="true"><circle className="kv2-draw" cx="40" cy="23" r="15"/><circle className="kv2-draw" cx="110" cy="23" r="15"/><circle className="kv2-draw" cx="180" cy="23" r="15"/></svg>},
  {n:'03',t:tr('Create and own it','Crie e publique','Crea y publícalo'),d:tr('Review the credit cost, generate, then download from your private library.','Confira o custo em créditos, gere e baixe da sua biblioteca privada.','Revisa el coste en créditos, genera y descárgalo de tu biblioteca privada.'),
   svg:<svg width="100%" height="46" viewBox="0 0 220 46" aria-hidden="true"><rect className="kv2-draw" x="6" y="8" width="60" height="30" rx="5"/><rect className="kv2-draw" x="80" y="8" width="60" height="30" rx="5"/><rect className="kv2-draw" x="154" y="8" width="60" height="30" rx="5"/></svg>},
 ];

 return <div className="kv2" ref={page}>
  <header className="kv2-head">
   <div className="kv2-head-in">
    <Link href="/" className="kv2-logo" aria-label="K4K APP"><i/>K4K<span>APP</span></Link>
    <nav className="kv2-nav" aria-label={tr('Sections','Seções','Secciones')}>
     <a href="#how">{tr('How it works','Como funciona','Cómo funciona')}</a>
     <a href="#tools">{tr('Tools','Ferramentas','Herramientas')}</a>
     <a href="#plans">{tr('Plans','Planos','Planes')}</a>
    </nav>
    <div className="kv2-head-cta">
     <Link className="kv2-ghost" href="/login?next=%2Fk4k-app%2Fstudio">{tr('Log in','Entrar','Entrar')}</Link>
     <Link className="kv2-solid" href="/k4k-app/register?plan=starter">{tr('Start creating','Comece a criar','Empieza a crear')}<ArrowUpRight size={14}/></Link>
    </div>
   </div>
  </header>

  <section className="kv2-hero">
   <div className="kv2-aura" aria-hidden="true"/>
   <span className="kv2-kicker"><i/>{tr('AI VIDEO STUDIO · BY KREATIVESTUDIOS4K','ESTÚDIO DE VÍDEO IA · KREATIVESTUDIOS4K','ESTUDIO DE VÍDEO IA · KREATIVESTUDIOS4K')}</span>
   <h1>
    <span><b>{tr("DON'T FOLLOW",'NÃO SIGA','NO SIGAS')}</b></span>
    <span><b>{tr('THE TREND.','A TENDÊNCIA.','LA TENDENCIA.')}</b></span>
    <span><b>{tr('CREATE IT.','CRIE A SUA.','CRÉALA.')}</b></span>
   </h1>
   <p className="kv2-sub">{tr('A creator studio for AI video and image. Bring a reference, cast your own characters, and keep every frame you make.','Um estúdio de criação com IA para vídeo e imagem. Traga uma referência, escolha seus personagens e guarde tudo o que criar.','Un estudio de creación con IA para vídeo e imagen. Trae una referencia, elige tus personajes y conserva todo lo que crees.')}</p>
   <div className="kv2-acts">
    <Link className="kv2-solid" href="/k4k-app/register?plan=starter"><Sparkles size={15}/>{tr('Start creating','Comece a criar','Empieza a crear')}</Link>
    <a className="kv2-ghost" href="#how"><Play size={13} style={{marginRight:6,verticalAlign:'-2px'}}/>{tr('See how it works','Veja como funciona','Mira cómo funciona')}</a>
   </div>

   <div className="kv2-frame" aria-hidden="true">
    <div className="kv2-frame-bar"><i/><i/><i/><small>K4K / RENDER</small></div>
    <div className="kv2-cells">{CELLS.map(i=><span key={i} className="kv2-cell" style={{animationDelay:((i%24)*0.055+Math.floor(i/24)*0.14).toFixed(2)+'s'}}/>)}</div>
    <span className="kv2-scan"/>
   </div>
  </section>

  <div className="kv2-strip" aria-hidden="true">
   <div className="kv2-track">{[...marquee,...marquee].map((item,i)=><span key={i}>{item}</span>)}</div>
  </div>

  <section className="kv2-sec" id="how">
   <p className="kv2-eye kv2-reveal">{tr('HOW IT WORKS','COMO FUNCIONA','CÓMO FUNCIONA')}</p>
   <h2 className="kv2-reveal">{tr('Three steps from an idea to','Três passos da ideia até','Tres pasos de la idea a')} <em>{tr('your own footage.','sua cena.','tu escena.')}</em></h2>
   <div className="kv2-steps">
    {steps.map(step=><article className="kv2-step" key={step.n}>
     <b>{step.n}</b><h3>{step.t}</h3><p>{step.d}</p>{step.svg}
    </article>)}
   </div>
  </section>

  <section className="kv2-sec" id="tools">
   <p className="kv2-eye kv2-reveal">{tr('THE TOOLSET','AS FERRAMENTAS','LAS HERRAMIENTAS')}</p>
   <h2 className="kv2-reveal">{tr('One studio.','Um estúdio.','Un estudio.')} <em>{tr('Every model you need.','Todos os modelos.','Todos los modelos.')}</em></h2>
   <p className="kv2-lead kv2-reveal">{tr('Switch between video and image models inside a single workspace, with the credit cost shown before anything runs. Your library, your credits and your drafts stay in one place.','Alterne entre modelos de vídeo e imagem em um único espaço, com o custo em créditos sempre visível antes de gerar. Sua biblioteca, seus créditos e seus rascunhos ficam juntos.','Cambia entre modelos de vídeo e imagen en un solo espacio, con el coste en créditos visible antes de generar. Tu biblioteca, tus créditos y tus borradores en un solo sitio.')}</p>
   <div className="kv2-acts" style={{justifyContent:'flex-start',marginTop:26}}>
    <Link className="kv2-ghost" href="/k4k-app/studio"><Layers size={13} style={{marginRight:6,verticalAlign:'-2px'}}/>{tr('Open the studio','Abrir o estúdio','Abrir el estudio')}</Link>
   </div>
  </section>

  <section className="kv2-sec" id="plans">
   <p className="kv2-eye kv2-reveal">{tr('MONTHLY PLANS','PLANOS MENSAIS','PLANES MENSUALES')}</p>
   <h2 className="kv2-reveal">{tr('Pick the pace','Escolha o ritmo','Elige el ritmo')} <em>{tr('you create at.','que você cria.','al que creas.')}</em></h2>
   <div className="kv2-plans">
    {PLANS.map(plan=><article className={'kv2-plan kv2-reveal'+(plan.popular?' pop':'')} key={plan.key}>
     <div className="kv2-plan-top"><b>{plan.name}</b>{plan.popular&&<span className="kv2-tag">{tr('POPULAR','POPULAR','POPULAR')}</span>}</div>
     <div className="kv2-price">{money(plan.key)}<small>/{tr('month','mês','mes')}</small></div>
     <div className="kv2-credits"><b>{plan.credits}</b> {tr('monthly credits','créditos mensais','créditos mensuales')}</div>
     <p>{tr('Creator workspace · private library · downloads','Estúdio · biblioteca privada · downloads','Estudio · biblioteca privada · descargas')}</p>
     <Link href={'/k4k-app/register?plan='+plan.key}>{tr('Choose','Escolher','Elegir')} {plan.name}</Link>
    </article>)}
   </div>
   <p className="kv2-lead kv2-reveal" style={{fontSize:12}}>{tr('Prices include applicable tax. Credits are added after payment is confirmed, and the exact cost of a generation is shown before it runs.','Os preços incluem impostos aplicáveis. Os créditos entram após a confirmação do pagamento, e o custo exato aparece antes de gerar.','Los precios incluyen impuestos aplicables. Los créditos se añaden tras confirmar el pago, y el coste exacto se muestra antes de generar.')}</p>
  </section>

  <section className="kv2-close">
   <div className="kv2-close-in kv2-reveal">
    <h2>{tr('Your next scene','Sua próxima cena','Tu próxima escena')} <em>{tr('starts here.','começa aqui.','empieza aquí.')}</em></h2>
    <p>{tr('Create a free account, then add credits when you are ready to generate.','Crie uma conta gratuita e adicione créditos quando quiser gerar.','Crea una cuenta gratis y añade créditos cuando quieras generar.')}</p>
    <Link className="kv2-solid" href="/k4k-app/register?plan=starter">{tr('Start creating','Comece a criar','Empieza a crear')}<ArrowUpRight size={14}/></Link>
   </div>
  </section>

  <footer className="kv2-foot">
   <strong style={{color:'#9a9a96'}}>K4K&trade;</strong><span>{tr('Created by KreativeStudios4K','Criado por KreativeStudios4K','Creado por KreativeStudios4K')}</span>
   <nav><Link href="/privacy">{tr('Privacy','Privacidade','Privacidad')}</Link><Link href="/terms">{tr('Terms','Termos','Términos')}</Link><Link href="/k4k-app/support">{tr('Support','Suporte','Soporte')}</Link></nav>
  </footer>
 </div>;
}
