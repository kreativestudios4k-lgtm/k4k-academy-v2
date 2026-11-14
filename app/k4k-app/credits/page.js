'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import PreviewShell from '../PreviewShell';
import {createClient} from '../../../lib/supabase/client';
import {loadCheckoutState} from '../../../lib/checkout-state.mjs';
import {useK4KLocale} from '../locale';
import {PLAN_PRICES} from '../../../lib/k4k-plan-prices.mjs';
import './credits.css';
import {STUDENT_CODE,studentCode,discountedMinorUnits} from '../../../lib/k4k-student-discount.mjs';
import CreditProposal from './CreditProposal';
import {validPlan,planDestination,planRegistration} from '../../../lib/customer-routes.mjs';

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
 const [signedIn,setSignedIn]=useState(null);
 const checkoutLock=useRef(false);
 const [cancelled,setCancelled]=useState(false);
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const selectedPlan=validPlan(params.get('plan'));setCancelled(params.get('checkout')==='cancelled');if(selectedPlan)setSelected(selectedPlan);},[]);
 const [billing,setBilling]=useState(null),[readinessError,setReadinessError]=useState(false);
 const refreshSequence=useRef(0);
 const [discountCode,setDiscountCode]=useState('');
 const refreshCheckout=useCallback(async()=>{
  const sequence=++refreshSequence.current;
  const result=await loadCheckoutState({auth:createClient().auth});
  if(sequence!==refreshSequence.current)return;
  setSignedIn(result.signedIn);setBilling(result.billing);setReadinessError(result.readinessError);
  if(result.billing?.ownerPilot)setSelected('starter');
 },[]);
 useEffect(()=>{
  const client=createClient();let alive=true;
  const refresh=()=>{if(alive)void refreshCheckout()};
  refresh();
  const {data:{subscription}}=client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
  const visibility=()=>{if(document.visibilityState==='visible')refresh()};
  window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;refreshSequence.current++;subscription.unsubscribe();window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',visibility)};
 },[refreshCheckout]);
 const checkoutReady=billing?.checkoutReady===true&&(!billing?.ownerPilot||selected==='starter');
 const live=billing?.mode==='live';
 const [checkoutBusy,setCheckoutBusy]=useState(false),[checkoutError,setCheckoutError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/k4k-region',{cache:'no-store'})
  .then(response=>response.ok?response.json():null)
  .then(data=>{if(active)setCurrency(supportedCurrencies.has(data?.currency)?data.currency:'GBP')})
  .catch(()=>{if(active)setCurrency('GBP')});
  return()=>{active=false};
 },[]);
 const current=plans.find(plan=>plan.key===selected)||plans[1];
 const amount=plan=>!currency?'—':formatPrice(plan,currency);
 const discounted=currency&&studentCode(discountCode)?new Intl.NumberFormat(currency==='BRL'?'pt-BR':currency==='EUR'?'de-DE':currency==='USD'?'en-US':'en-GB',{style:'currency',currency}).format(discountedMinorUnits(PLAN_PRICES[current.key][currency])/100):null;
 async function startTestCheckout(){
  if(checkoutLock.current||checkoutBusy||!checkoutReady||signedIn!==true)return;
  checkoutLock.current=true;
  setCheckoutBusy(true);setCheckoutError('');
  try{
   const {data:{session},error:authError}=await createClient().auth.getSession();
   if(authError||!session?.access_token){window.location.assign('/login?next='+encodeURIComponent(planDestination(selected)));return;}
   const response=await fetch('/api/billing/checkout',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
    body:JSON.stringify({plan:selected,currency,discountCode:discountCode.trim()||undefined}),
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.url){
    const reason=result.error||'HTTP_'+response.status;
    if(reason==='UNAUTHENTICATED'){window.location.assign('/login?next='+encodeURIComponent(planDestination(selected)));return;}
    if(reason==='OWNER_LIVE_PILOT_ONLY'||reason==='BILLING_SETUP_REQUIRED'||reason==='LAUNCH_NOT_OPEN')void refreshCheckout();
    if(reason==='CURRENCY_REGION_MISMATCH'&&supportedCurrencies.has(result.currency)){setCurrency(result.currency);setCheckoutError(tr('Your billing currency changed. Review the updated price and try again.','Sua moeda mudou. Confira o preço atualizado e tente novamente.','Tu moneda cambió. Revisa el precio actualizado e inténtalo de nuevo.'));return;}
    const message={
     INVALID_DISCOUNT_CODE:tr('Invalid discount code.','Código de desconto inválido.','Código de descuento no válido.'),
     STUDENT_DISCOUNT_UNAVAILABLE:tr('This student discount is not available for your account yet.','O desconto de aluno ainda não está disponível para sua conta.','El descuento de estudiante aún no está disponible para tu cuenta.'),
     ALREADY_SUBSCRIBED:'Your account already has an active subscription.',
     LAUNCH_SOLD_OUT:tr('Our initial funded launch is full. No payment was taken.','As vagas iniciais estão completas. Nenhum pagamento foi feito.','Las plazas iniciales están completas. No se cobró nada.'),
     LAUNCH_CREDIT_CAPACITY:tr('This plan exceeds remaining launch capacity. Select a smaller plan or contact support. No payment was taken.','Este plano excede a capacidade disponível. Escolha um plano menor ou fale com o suporte. Nenhum pagamento foi feito.','Este plan excede la capacidad disponible. Elige un plan menor o contacta con soporte. No se cobró nada.'),
     UNAVAILABLE:'Checkout is not configured. No payment was taken.',
     LIVE_CHECKOUT_DISABLED:'Live checkout is disabled; no payment was taken.',
     MEMBERSHIP_CHECK_UNAVAILABLE:'We cannot confirm your subscription status right now. No payment was taken.',
     STRIPE_UNREACHABLE:'Stripe checkout is temporarily unavailable. No payment was taken.',
     INVALID_PLAN:'Selected plan is not configured. No payment was taken.',
     UNAUTHENTICATED:'Your session expired. Please log in again.',
    }[reason];
    setCheckoutError(message||(reason==='CHECKOUT_FAILED'?'Stripe rejected checkout ('+(result.stripeCode||result.stripeType||'unknown')+'). No payment was taken.':'Checkout could not be started ('+String(reason).replace(/[^A-Z0-9_]/gi,'').slice(0,48)+'). No payment was taken.'));
    return;
   }
   const target=new URL(result.url);
   if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com'){setCheckoutError('Unexpected checkout destination. No payment was taken.');return;}
   window.location.assign(target.href);
  }catch{setCheckoutError('Unable to start Stripe checkout. No payment was taken.');}
  finally{checkoutLock.current=false;setCheckoutBusy(false);}
 }
 return <PreviewShell active="Credits">
  <div className="k4k-pricing-page">
   <section className="k4k-pricing-hero"><span className="k4k-workspace-eyebrow">✦ K4K APP / CREATOR PLANS</span><h1>{tr('Create more. Go further.','Crie mais. Vá além.','Crea más. Llega más lejos.')}<span>✦</span></h1><p>{tr('Choose your monthly plan and continue to secure checkout.','Templates, projetos criativos, conta e créditos em um só lugar.','Plantillas, proyectos creativos, tu cuenta y tus créditos en un solo lugar.')}</p><div className="k4k-pricing-status"><span>● {checkoutReady?(live?tr('LIVE CHECKOUT','PAGAMENTO DISPONÍVEL','PAGO DISPONIBLE'):tr('TEST MODE ONLY','SOMENTE MODO TESTE','SOLO MODO PRUEBA')):!billing&&!readinessError?tr('CHECKING CHECKOUT','VERIFICANDO PAGAMENTO','COMPROBANDO PAGO'):readinessError?tr('CHECKOUT STATUS UNAVAILABLE','STATUS INDISPONÍVEL','ESTADO NO DISPONIBLE'):tr('EARLY ACCESS · CHECKOUT CLOSED','ACESSO ANTECIPADO · PAGAMENTO FECHADO','ACCESO ANTICIPADO · PAGO CERRADO')}</span><span>{tr('Monthly plans · generation credits','Planos mensais · créditos de geração','Planes mensuales · créditos de generación')}</span></div></section>
   {readinessError&&<p role="alert" className="k4k-pricing-note">{tr('Could not check checkout availability. No payment was taken.','Não foi possível verificar o pagamento. Nenhuma cobrança foi feita.','No se pudo comprobar el pago. No se cobró nada.')} <button type="button" onClick={refreshCheckout}>{tr('Try again','Tentar novamente','Reintentar')}</button></p>}
   {billing?.ownerPilot&&<p role="status" className="k4k-pricing-note">Owner live verification: Starter only, real recurring payment. Public checkout remains closed.</p>}
   {signedIn&&billing?.reason==='OWNER_LIVE_PILOT_ONLY'&&<p role="status" className="k4k-pricing-note">Live checkout is currently restricted to the authorized owner account. Sign out and sign in with the account approved for the payment verification. No payment has been taken.</p>}
   {signedIn&&billing?.mode==='live'&&!billing.checkoutReady&&billing.reason!=='OWNER_LIVE_PILOT_ONLY'&&<p role="alert" className="k4k-pricing-note">Checkout setup: {billing.reason||'Unavailable'}. No payment has been taken.</p>}
   {billing?.ownerPilot&&selected!=='starter'&&<p role="status" className="k4k-pricing-note">Select Starter to complete the live payment verification.</p>}
   {live&&checkoutReady&&!billing?.ownerPilot&&<p role="status" className="k4k-pricing-note">{tr('Your first month is charged now. Future renewal invoices are held until generation capacity is funded. New monthly credits are added only after a paid renewal. Unused credits carry over.','O primeiro mês é cobrado agora. As próximas renovações ficam em espera até haver capacidade financiada. Novos créditos mensais são liberados após o pagamento da renovação. Créditos não utilizados acumulam.','El primer mes se cobra ahora. Las renovaciones futuras se mantienen pendientes hasta que haya capacidad financiada. Los nuevos créditos se añaden tras el pago de la renovación. Los créditos no utilizados se acumulan.')} <Link href="/k4k-app/credit-terms">{tr('Payment terms','Termos de pagamento','Condiciones de pago')}</Link></p>}
   <div className="k4k-pricing-grid" role="group" aria-label="Choose a monthly plan">{plans.map(plan=><button type="button" key={plan.key} onClick={()=>{setSelected(plan.key);window.history.replaceState(null,'',planDestination(plan.key));setCheckoutError('')}} className={'k4k-pricing-plan'+(plan.key===selected?' selected':'')} aria-pressed={plan.key===selected}>
    <div className="k4k-pricing-plan-top"><span>{plan.name.toUpperCase()}</span>{plan.key==='creator'&&<strong>{tr('POPULAR','POPULAR','POPULAR')}</strong>}</div>
    <div className="k4k-pricing-price">{amount(plan)}<small>/{tr('month','mês','mes')}</small></div>
    <p>{plan.description}</p>
    <div className="k4k-pricing-credits"><strong>{plan.credits}</strong><span>{tr('monthly generation credits','créditos mensais de geração','créditos mensuales de generación')}</span></div>
    <ul><li>{tr('Template browsing and saved drafts','Templates e rascunhos','Plantillas y borradores')}</li><li>{tr('Creator workspace access','Acesso ao estúdio','Acceso al estudio')}</li><li>{tr('Private video library & downloads','Biblioteca privada e downloads','Biblioteca privada y descargas')}</li></ul>
    <span className="k4k-pricing-select">{plan.key===selected?tr('Selected ✓','Selecionado ✓','Seleccionado ✓'):tr('Select plan','Escolher plano','Elegir plan')} <span aria-hidden="true">↗</span></span>
   </button>)}</div>
   <section className="k4k-pricing-note"><h2>{tr('Student discount','Desconto de aluno','Descuento de estudiante')}</h2><label htmlFor="k4k-student-code">{tr('Have a discount code?','Tem um código de desconto?','¿Tienes un código de descuento?')}</label><input id="k4k-student-code" value={discountCode} onChange={e=>{setDiscountCode(e.target.value);setCheckoutError('')}} placeholder={tr('Enter your code','Digite seu código','Introduce tu código')} autoComplete="off" maxLength={40} style={{maxWidth:300,textTransform:'uppercase'}}/><p>{tr('Eligible student discounts apply to the first month only. The regular monthly price resumes afterwards.','Descontos elegíveis de alunos valem apenas no primeiro mês. Depois, volta o preço mensal normal.','Los descuentos elegibles se aplican solo al primer mes. Después se cobra el precio mensual normal.')}</p>{discounted&&<p role="status"><strong>{STUDENT_CODE} · 10% — {discounted}</strong> {tr('first month, subject to eligibility at checkout.','no primeiro mês, sujeito à elegibilidade no checkout.','el primer mes, sujeto a elegibilidad al pagar.')}</p>}</section>
   <section className="k4k-pricing-checkout"><div><span className="k4k-workspace-eyebrow">{tr('YOUR SELECTION','SUA ESCOLHA','TU SELECCIÓN')}</span><h2>{current.name} — {amount(current)} <small>/{tr('month','mês','mes')}</small></h2><p>{tr('Published prices include applicable tax. Credits appear after verified payment.','Os preços publicados incluem os impostos aplicáveis. Os créditos são liberados após a confirmação do pagamento.','Los precios publicados incluyen los impuestos aplicables. Los créditos se acreditan tras confirmar el pago.')}</p></div>{signedIn===false?<Link className="k4k-plan-account-cta" href={planRegistration(selected)}>{tr('Create account to continue','Crie sua conta para continuar','Crea una cuenta para continuar')} ↗</Link>:<button type="button" disabled={!currency||checkoutBusy||!checkoutReady||signedIn!==true} onClick={startTestCheckout}>{checkoutBusy?'Opening…':!billing&&!readinessError?tr('Checking checkout…','Verificando pagamento…','Comprobando pago…'):!checkoutReady?(billing?.ownerPilot?tr('Select Starter','Selecione Starter','Selecciona Starter'):billing?.reason==='OWNER_LIVE_PILOT_ONLY'?tr('Owner checkout only','Pagamento apenas para o titular','Pago solo para el titular'):tr('Checkout not open yet','Pagamento ainda não disponível','Pago aún no disponible')):live?tr('Continue to secure checkout','Continuar para pagamento seguro','Continuar al pago seguro'):tr('Continue to TEST checkout','Continuar para checkout de TESTE','Continuar a checkout de PRUEBA')} ↗</button>}</section>
   {cancelled&&<p role="status" className="k4k-pricing-note">{tr('Checkout cancelled. No payment was taken by this attempt. Your selected plan is still here.','Pagamento cancelado. Nenhum pagamento foi feito nesta tentativa. Seu plano continua selecionado.','Pago cancelado. No se cobró nada en este intento. Tu plan sigue seleccionado.')}</p>}
   {checkoutError&&<p className="k4k-pricing-error" role="alert">{checkoutError}</p>}
   <CreditProposal currency={currency}/>
   <div className="k4k-pricing-links"><Link href={planRegistration(selected)}>{tr('New creator? Create an account','Novo criador? Criar conta','¿Nuevo creador? Crear cuenta')}</Link><Link href={'/login?next='+encodeURIComponent(planDestination(selected))}>{tr('Already registered? Sign in','Já tem conta? Entrar','¿Tienes cuenta? Entrar')}</Link><Link href="/k4k-app/creator">{tr('Back to studio','Voltar ao estúdio','Volver al estudio')}</Link></div>
   <section className="k4k-pricing-note"><h2>{tr('Before you choose a plan','Antes de escolher um plano','Antes de elegir un plan')}</h2><p>{tr('Credits per video depend on model, duration and resolution. Paid checkout is subject to launch availability. Test checkout does not activate a paid service. Existing Academy subscriptions remain unchanged.','O custo por vídeo depende do modelo, duração e resolução. O acesso antecipado depende da disponibilidade de vagas. O checkout de teste não ativa um serviço pago. Assinaturas atuais da Academy são preservadas.','El costo por vídeo depende del modelo, duración y resolución. El acceso anticipado está sujeto a plazas disponibles. El checkout de prueba no activa un servicio pagado. Las suscripciones de Academy no cambian.')}</p><Link href="/k4k-app/support">{tr('Questions? Contact K4K support ↗','Dúvidas? Fale com o suporte ↗','¿Dudas? Contacta con soporte ↗')}</Link></section>
  </div>
 </PreviewShell>;
}
