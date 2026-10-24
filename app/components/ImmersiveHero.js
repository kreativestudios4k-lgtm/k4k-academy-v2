'use client';

import {useRef,useState} from 'react';
import AuthNavLogout from './AuthNavLogout';
import {ArrowUpRight,Check,Copy,Clapperboard,Layers3,ScanFace,TrendingUp,ShieldCheck,Sparkles,MousePointer2} from 'lucide-react';

const image='/images/k4k-academy-carousel-sprite.webp';
const content={
 eu:{
  lang:'en',eyebrow:'AI CREATIVE PRODUCTION / K4K ACADEMY',
  first:'YOUR',second:'AI STYLE',third:'NEEDS A',fourth:'SYSTEM.',
  description:'Learn to create original AI videos with real workflows, stronger prompts and consistent character references. Build the skill, not just the effect.',
  features:['AI WORKFLOWS','PROMPT SYSTEMS','CHARACTER SHEETS','CREATOR STRATEGY'],
  highlight:'INTRODUCTORY OFFER',saving:'70% OFF',period:'YOUR FIRST MONTH',
  regularLabel:'CREATOR MEMBERSHIP',
  code:'PROMO CODE',button:'JOIN K4K ACADEMY',
  account:'Already a member? Sign in',
  expiry:'New paying customers only · Ends 28 October 2026',
  note:'Secure Stripe checkout. Enter K4K70 before paying. Final pricing, currency and renewal terms appear at checkout.',
  noPromoNote:'Secure Stripe checkout. Final pricing, currency and renewal terms appear at checkout.',
  hint:'A creative process you can repeat',copied:'COPIED',visualLabel:'CREATIVE DIRECTION / IN MOTION'
 },
 br:{
  lang:'pt-BR',eyebrow:'PRODUÇÃO CRIATIVA COM IA / K4K ACADEMY',
  first:'SEU',second:'ESTILO IA',third:'PRECISA DE',fourth:'UM SISTEMA.',
  description:'Aprenda a criar vídeos com IA usando workflows, prompts mais eficazes e referências consistentes de personagens. Desenvolva a técnica, não apenas o efeito.',
  features:['WORKFLOWS DE IA','SISTEMAS DE PROMPTS','FICHAS DE PERSONAGEM','ESTRATÉGIA CRIATIVA'],
  highlight:'OFERTA DE BOAS-VINDAS',saving:'70% OFF',period:'NO PRIMEIRO MÊS',
  regularLabel:'ASSINATURA MENSAL',
  code:'CÓDIGO PROMOCIONAL',button:'ENTRE PARA A ACADEMY',
  account:'Já é aluno? Entre na sua conta',
  expiry:'Somente novos clientes · Até 28 de outubro de 2026',
  note:'Pagamento seguro pelo Stripe. Digite K4K70 antes de pagar. Confira preço, moeda e renovação no checkout.',
  noPromoNote:'Pagamento seguro pelo Stripe. Confira preço, moeda e renovação no checkout.',
  hint:'Um processo criativo que você pode repetir',copied:'COPIADO',visualLabel:'DIREÇÃO CRIATIVA / EM MOVIMENTO'
 }
};

function CreatorArt({features,t}){
 return <div className="k4k3d-scene">
  <div className="k4k3d-ring k4k3d-ring-a" aria-hidden="true"/>
  <div className="k4k3d-ring k4k3d-ring-b" aria-hidden="true"/>
  <div className="k4k3d-orb" aria-hidden="true"/>
  <div className="k4k3d-scanline" aria-hidden="true"/>
  <div className="k4k3d-aura" aria-hidden="true"/>
  <svg className="k4k3d-person" viewBox="0 165 580 480" role="img" aria-labelledby="k4k3d-visual-description" preserveAspectRatio="xMidYMid meet">
   <title id="k4k3d-visual-description">K4K Academy masked creator in a football jersey reaching towards the viewer</title>
   <defs>
    <clipPath id="k4k3d-person-clip">
     <path d="M9 557 C-5 512 13 444 49 413 C87 371 144 337 204 337 C231 333 254 344 276 356 C274 319 276 270 287 235 C298 195 335 177 388 176 C451 171 481 211 484 281 C489 319 480 351 468 369 C509 379 535 415 547 467 L556 572 C516 617 451 626 347 625 L172 627 C96 630 35 604 9 557 Z"/>
    </clipPath>
    <linearGradient id="k4k3d-bottom-fade" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0" stopColor="white"/>
     <stop offset=".79" stopColor="white"/>
     <stop offset="1" stopColor="black"/>
    </linearGradient>
    <mask id="k4k3d-subject-fade" maskUnits="userSpaceOnUse" x="0" y="165" width="580" height="480">
     <rect x="0" y="165" width="580" height="480" fill="url(#k4k3d-bottom-fade)"/>
    </mask>
   </defs>
   <image href={image} x="0" y="0" width="1280" height="1600" clipPath="url(#k4k3d-person-clip)" mask="url(#k4k3d-subject-fade)"/>
  </svg>
  <div className="k4k3d-orbit-tag k4k3d-tag-top" aria-hidden="true"><Sparkles size={15}/> K4K · 4K</div>
  <div className="k4k3d-floating-card k4k3d-float-one"><Clapperboard size={19}/><span>{features[0]}</span><span className="k4k3d-card-indicator"/></div>
  <div className="k4k3d-floating-card k4k3d-float-two"><Layers3 size={19}/><span>{features[1]}</span><span className="k4k3d-card-indicator"/></div>
  <div className="k4k3d-floating-card k4k3d-float-three"><ScanFace size={19}/><span>{features[2]}</span><span className="k4k3d-card-indicator"/></div>
  <div className="k4k3d-floating-card k4k3d-float-four"><TrendingUp size={19}/><span>{features[3]}</span><span className="k4k3d-card-indicator"/></div>
  <div className="k4k3d-visual-bottom" aria-hidden="true"><div className="k4k3d-meter"><i/><i/><i/><i/><i/><i/><i/><i/></div><span>{t.visualLabel}</span></div>
 </div>
}

export default function ImmersiveHero({locale='en',pricing,checkout,promotionActive=true}){
 const [copied,setCopied]=useState(false);
 const sceneRef=useRef(null);
 const isBrazil=locale==='pt-BR';
 const t=content[isBrazil?'br':'eu'];
 function tilt(event){
  const area=sceneRef.current;if(!area||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const rect=area.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width-.5;
  const y=(event.clientY-rect.top)/rect.height-.5;
  area.style.setProperty('--k4k-tilt-x',String((-y*6).toFixed(2))+'deg');
  area.style.setProperty('--k4k-tilt-y',String((x*7).toFixed(2))+'deg');
 }
 function resetTilt(){
  const area=sceneRef.current;if(!area)return;
  area.style.setProperty('--k4k-tilt-x','0deg');
  area.style.setProperty('--k4k-tilt-y','0deg');
 }
 async function copyCode(){
  try{await navigator.clipboard.writeText('K4K70');setCopied(true)}
  catch{setCopied(false)}
 }
 return <section className="k4k3d" aria-label={isBrazil?"K4K Academy: criação de vídeos com IA":"K4K Academy AI video creative education"} lang={t.lang}>
  <div className="k4k3d-grid" aria-hidden="true"/>
  <div className="k4k3d-shell">
   <div className="k4k3d-topline">
    <span className="k4k3d-eyebrow"><span className="k4k3d-live-dot"/>{t.eyebrow}</span>
   </div>
   <div className="k4k3d-layout">
    <div className="k4k3d-copy">
     <div className="k4k3d-overline"><span>01 / 01</span><span className="k4k3d-overline-rule"/><span>{isBrazil?'CRIE COM PROPÓSITO':'CREATE WITH INTENTION'}</span></div>
     <h1 className="k4k3d-title">
      <span>{t.first}</span>
      <strong>{t.second}</strong>
      <span>{t.third}</span>
      <span className="k4k3d-title-end">{t.fourth}</span>
     </h1>
     <p className="k4k3d-description">{t.description}</p>
     <div className="k4k3d-offer">
      {promotionActive?<div className="k4k3d-offer-grid">
       <div className="k4k3d-offer-left">
        <span className="k4k3d-offer-eyebrow">{t.highlight}</span>
        <strong className="k4k3d-percent">{t.saving}</strong>
        <span className="k4k3d-period">{t.period}</span>
       </div>
       <div className="k4k3d-offer-right">
        <span className={pricing.verifiedPrice?"k4k3d-now":"k4k3d-now k4k3d-now-local"}>{pricing.firstPrice}</span>
        <span className="k4k3d-strike">{pricing.regularPrice} {pricing.perMonth}</span>
        <span className="k4k3d-renew">{pricing.renewText}</span>
       </div>
      </div>:<div className="k4k3d-regular"><span>{t.regularLabel}</span><strong className={pricing.verifiedPrice?"":"k4k3d-regular-local"}>{pricing.regularPrice}<small> {pricing.perMonth}</small></strong></div>}
      <div className="k4k3d-offer-controls">
       <a className="k4k3d-primary" href={checkout}>{t.button}<ArrowUpRight size={20}/></a>
       {promotionActive&&<button type="button" className="k4k3d-code" onClick={copyCode} aria-label="Copy promotion code K4K70"><span>{copied?t.copied:t.code}</span><strong>{copied?<Check size={16}/>:<Copy size={16}/>} K4K70</strong></button>}
      </div>
      <p className="k4k3d-disclaimer"><ShieldCheck size={15}/>{promotionActive?t.note:t.noPromoNote}</p>
      {promotionActive&&<small className="k4k3d-expires">{t.expiry}</small>}
     </div>
     <AuthNavLogout hero heroLoginText={t.account} heroStudioText={isBrazil?"Acessar a área do aluno":"Go to your studio"}/>
    </div>
    <div className="k4k3d-visual-shell" ref={sceneRef} onPointerMove={tilt} onPointerLeave={resetTilt}>
     <CreatorArt features={t.features} t={t}/>
    </div>
   </div>
   <div className="k4k3d-endline"><span className="k4k3d-end-mark">✳</span><span>{t.hint}</span><span className="k4k3d-end-spacer"/><span>KREATIVESTUDIOS4K.COM</span><MousePointer2 size={14}/></div>
  </div>
 </section>;
}
