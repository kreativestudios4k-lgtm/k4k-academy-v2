'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import PreviewShell from '../PreviewShell';
import {createClient} from '../../../lib/supabase/client';
import {useK4KLocale} from '../locale';
import {PLAN_PRICES} from '../../../lib/k4k-plan-prices.mjs';
import './credits.css';

const plans=[
 {key:'starter',name:'Starter',credits:80,description:'For first-time creators'},
 {key:'creator',name:'Creator',credits:160,description:'For consistent creators'},
 {key:'pro',name:'Pro',credits:340,description:'For serious storytelling'},
 {key:'studio',name:'Studio',credits:700,description:'For creative teams'},
];
const supportedCurrencies=new Set(['GBP','EUR','USD','BRL']);
const formatPrice=(plan,currency)=>new Intl.NumberFormat(currency==='BRL'?'pt-BR':currency==='EUR'?'de-DE':currency==='USD'?'en-US':'en-GB',{style:'currency',currency}).format(PLAN_PRICES[plan.key][currency]/100);
export default function Credits(){
 const {locale}=useK4KLocale();
 const pt=locale==='pt',es=locale==='es';
 const tr=(en,br,spa)=>pt?br:es?spa:en;
 const [selected,setSelected]=useState('creator'),[currency,setCurrency]=useState(null);
 const [checkoutBusy,setCheckoutBusy]=useState(false),[checkoutError,setCheckoutError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/k4k-region',{cache:'no-store'})
  .then(response=>response.ok?response.json():null)
  .then(data=>{if(active)setCurrency(supportedCurrencies.has(data?.currency)?data.currency:'GBP')})
  .catch(()=>{if(active)setCurrency('GBP')});
  return()=>{active=false};
 },[]);
 const current=plans.find(plan=>plan.key===selected)||plans[1];
 const amount=plan=>!currency?'—':formatPrice(plan,currency);
 async function startTestCheckout(){
  if(checkoutBusy)return;
  setCheckoutBusy(true);setCheckoutError('');
  try{
   const {data:{session},error:authError}=await createClient().auth.getSession();
   if(authError||!session?.access_token){window.location.assign('/login?next=%2Fk4k-app%2Fcredits');return;}
   const response=await fetch('/api/billing/checkout',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
    body:JSON.stringify({plan:selected,currency}),
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.url){
    const reason=result.error||'HTTP_'+response.status;
    const message={
     ALREADY_SUBSCRIBED:'Your account already has an active subscription.',
     UNAVAILABLE:'Test checkout is not configured. No payment was taken.',
     LIVE_CHECKOUT_DISABLED:'Live checkout is disabled; no payment was taken.',
     MEMBERSHIP_CHECK_UNAVAILABLE:'We cannot confirm your subscription status right now. No payment was taken.',
     STRIPE_UNREACHABLE:'Stripe test checkout is temporarily unavailable. No payment was taken.',
     INVALID_PLAN:'Selected plan is not configured. No payment was taken.',
     UNAUTHENTICATED:'Your session expired. Please log in again.',
    }[reason];
    setCheckoutError(message||(reason==='CHECKOUT_FAILED'?'Stripe rejected test checkout ('+(result.stripeCode||result.stripeType||'unknown')+'). No payment was taken.':'Checkout could not be started ('+String(reason).replace(/[^A-Z0-9_]/gi,'').slice(0,48)+'). No payment was taken.'));
    return;
   }
   const target=new URL(result.url);
   if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com'){setCheckoutError('Unexpected checkout destination. No payment was taken.');return;}
   window.location.assign(target.href);
  }catch{setCheckoutError('Unable to start Stripe test checkout. No payment was taken.');}
  finally{setCheckoutBusy(false);}
 }
 return <PreviewShell active="Credits">
  <div className="k4k-pricing-page">
   <section className="k4k-pricing-hero"><span className="k4k-workspace-eyebrow">✦ K4K APP / CREATOR PLANS</span><h1>{tr('Create more. Go further.','Crie mais. Vá além.','Crea más. Llega más lejos.')}<span>✦</span></h1><p>{tr('A simple home for templates, creative projects, your account and credits. Choose your future workflow.','Templates, projetos criativos, conta e créditos em um só lugar.','Plantillas, proyectos creativos, tu cuenta y tus créditos en un solo lugar.')}</p><div className="k4k-pricing-status"><span>● {tr('TEST MODE ONLY','SOMENTE MODO TESTE','SOLO MODO PRUEBA')}</span><span>{tr('Monthly plans · proposed generation allowances','Planos mensais · créditos de geração propostos','Planes mensuales · créditos de generación propuestos')}</span></div></section>
   <div className="k4k-pricing-grid" role="group" aria-label="Choose a monthly plan">{plans.map(plan=><button type="button" key={plan.key} onClick={()=>{setSelected(plan.key);setCheckoutError('')}} className={'k4k-pricing-plan'+(plan.key===selected?' selected':'')} aria-pressed={plan.key===selected}>
    <div className="k4k-pricing-plan-top"><span>{plan.name.toUpperCase()}</span>{plan.key==='creator'&&<strong>{tr('POPULAR','POPULAR','POPULAR')}</strong>}</div>
    <div className="k4k-pricing-price">{amount(plan)}<small>/{tr('month','mês','mes')}</small></div>
    <p>{plan.description}</p>
    <div className="k4k-pricing-credits"><strong>{plan.credits}</strong><span>{tr('planned monthly generation credits','créditos mensais previstos','créditos mensuales previstos')}</span></div>
    <ul><li>{tr('Template browsing and saved drafts','Templates e rascunhos','Plantillas y borradores')}</li><li>{tr('Creator workspace access','Acesso ao estúdio','Acceso al estudio')}</li><li>{tr('Academy included in planned plan','Academy incluída no plano previsto','Academy incluida en el plan previsto')}</li></ul>
    <span className="k4k-pricing-select">{plan.key===selected?tr('Selected ✓','Selecionado ✓','Seleccionado ✓'):tr('Select plan','Escolher plano','Elegir plan')} <span aria-hidden="true">↗</span></span>
   </button>)}</div>
   <section className="k4k-pricing-checkout"><div><span className="k4k-workspace-eyebrow">{tr('YOUR SELECTION','SUA ESCOLHA','TU SELECCIÓN')}</span><h2>{current.name} — {amount(current)} <small>/{tr('month','mês','mes')}</small></h2><p>{tr('Stripe test checkout only. Do not expect generation credits until the verified webhook and ledger are activated.','Checkout Stripe somente em modo de teste. Os créditos só serão liberados após a validação do webhook e do extrato.','Checkout de Stripe solo en modo de prueba. Los créditos dependen de validar el webhook y el registro.')}</p></div><button type="button" disabled={!currency||checkoutBusy} onClick={startTestCheckout}>{checkoutBusy?'Opening…':tr('Continue to TEST checkout','Continuar para checkout de TESTE','Continuar a checkout de PRUEBA')} ↗</button></section>
   {checkoutError&&<p className="k4k-pricing-error" role="alert">{checkoutError}</p>}
   <div className="k4k-pricing-links"><Link href="/k4k-app/register">{tr('New creator? Create an account','Novo criador? Criar conta','¿Nuevo creador? Crear cuenta')}</Link><Link href="/login?next=%2Fk4k-app%2Fcredits">{tr('Already registered? Sign in','Já tem conta? Entrar','¿Tienes cuenta? Entrar')}</Link><Link href="/academy">{tr('Existing student? My Academy','Aluno atual? Minha Academy','¿Alumno actual? Mi Academy')}</Link></div>
   <section className="k4k-pricing-note"><h2>{tr('Before you choose a plan','Antes de escolher um plano','Antes de elegir un plan')}</h2><p>{tr('AI generation is currently disabled. Credits per video will depend on validated provider rates, model, duration and resolution. Test checkout does not activate a paid service. Existing Academy subscriptions remain unchanged.','A geração de IA está desativada. O custo por vídeo dependerá do provedor, modelo, duração e resolução. O checkout de teste não ativa um serviço pago. Assinaturas atuais da Academy são preservadas.','La generación de IA está desactivada. El costo por vídeo depende del proveedor, modelo, duración y resolución. El checkout de prueba no activa un servicio pagado. Las suscripciones de Academy no cambian.')}</p><Link href="/k4k-app/support">{tr('Questions? Contact K4K support ↗','Dúvidas? Fale com o suporte ↗','¿Dudas? Contacta con soporte ↗')}</Link></section>
  </div>
 </PreviewShell>;
}
