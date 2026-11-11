'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../../lib/supabase/client';
import {stripeCheckoutDestination} from '../../../lib/stripe-checkout-destination.mjs';
import {CREDIT_PACKS,proposedGenerationCredits} from '../../../lib/k4k-credit-proposal.mjs';
import {useK4KLocale} from '../locale';
export default function CreditProposal({currency='GBP'}){
 const {locale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [model,setModel]=useState('lite'),[seconds,setSeconds]=useState(5),[resolution,setResolution]=useState('720p');
 const [readiness,setReadiness]=useState(null),[buying,setBuying]=useState(null),[purchaseError,setPurchaseError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/billing/readiness',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(active)setReadiness(data)}).catch(()=>{});return()=>{active=false}},[]);
 async function buy(pack){
  if(buying)return;setBuying(pack.id);setPurchaseError('');
  try{
   const {data:{session}}=await createClient().auth.getSession();
   if(!session?.access_token){window.location.assign('/login?next=%2Fk4k-app%2Fcredits');return;}
   const response=await fetch('/api/billing/topup',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({pack:pack.id,currency:currency||'GBP'})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error==='CURRENCY_REGION_MISMATCH'?'Your region changed. Reload this page to review the current price.':'Purchases are temporarily unavailable. No payment was taken.');
   window.location.assign(stripeCheckoutDestination(result.url));
  }catch(error){setPurchaseError(error.message)}finally{setBuying(null)}
 }
 const quote=proposedGenerationCredits({provider:'fal',model,resolution,seconds});
 const money=minor=>new Intl.NumberFormat(locale==='pt'?'pt-BR':locale==='es'?'es-ES':'en-GB',{style:'currency',currency:currency||'GBP'}).format(minor/100);
 return <section className="k4k-credit-proposal" aria-label="Generation pricing and extra credits">
  <span className="k4k-workspace-eyebrow">{tr('CREDIT PRICING · TEST MODE','PREÇOS DOS CRÉDITOS · MODO TESTE','PRECIOS DE CRÉDITOS · MODO PRUEBA')}</span>
  <h2>{tr('Know your credits before you create.','Confira os créditos antes de criar.','Conoce los créditos antes de crear.')}</h2>
  <p>{tr('Compare models, duration and quality. This calculator is illustrative; the server verifies your uploaded video and confirms the final cost before generation.','Compare modelos, duração e qualidade. Esta simulação é ilustrativa; o servidor verifica seu vídeo e confirma o custo antes da geração.','Compara modelos, duración y calidad. Esta simulación es orientativa; el servidor verifica tu vídeo y confirma el coste antes de generar.')}</p>
  <div className="k4k-credit-calculator">
   <label>{tr('Model','Modelo','Modelo')}<select value={model} onChange={e=>{setModel(e.target.value);setResolution(e.target.value==='lite'?'720p':'1080p')}}><option value="lite">Motion Lite · 720p</option><option value="pro">Motion Pro · 1080p</option></select></label>
   <label>{tr('Duration','Duração','Duración')}<select value={seconds} onChange={e=>setSeconds(Number(e.target.value))}>{[5,10,15].map(n=><option key={n} value={n}>{n}s</option>)}</select></label>
   <label>{tr('Quality','Qualidade','Calidad')}<select value={resolution} disabled><option>{resolution}</option></select></label>
   <output aria-live="polite"><strong>{quote.credits}</strong> {tr('credits / video','créditos / vídeo','créditos / vídeo')}</output>
  </div>
  <h2>{tr('Need more? Top up once.','Precisa de mais? Adicione créditos.','¿Necesitas más? Recarga una vez.')}</h2>
  <p>{tr('One-time packs. Keep your current plan. No new subscription. Prices exclude applicable VAT, calculated at checkout.','Pacotes avulsos. Sem nova assinatura. Impostos aplicáveis adicionados no checkout.','Paquetes de pago único. Sin nueva suscripción. Impuestos aplicables añadidos en el checkout.')}</p>
  <div className="k4k-topup-grid">{CREDIT_PACKS.map(pack=><article key={pack.id}><h3>{pack.credits} {tr('extra credits','créditos extras','créditos extra')}</h3><strong>{money(pack[currency||'GBP'])}</strong><p>{tr('One-time purchase','Compra única','Pago único')}</p><button type="button" disabled={!readiness?.topupsReady||!!buying} onClick={()=>buy(pack)}>{buying===pack.id?tr('Opening…','Abrindo…','Abriendo…'):readiness?.topupsReady?tr('Buy extra credits · TEST','Comprar créditos · TESTE','Comprar créditos · PRUEBA'):tr('Purchases temporarily unavailable','Compras temporariamente indisponíveis','Compras temporalmente no disponibles')}</button></article>)}</div>
  {purchaseError&&<p role="alert">{purchaseError}</p>}
  <p><small>{tr('Credits are added after verified payment, once per purchase. Top-ups do not expire. A success page alone never adds credits.','Créditos adicionados após pagamento verificado, uma vez por compra. Créditos extras não expiram.','Créditos añadidos tras verificar el pago, una vez por compra. Las recargas no caducan.')}</small></p>
  <Link href="/k4k-app/credit-terms">{tr('Credit and refund terms','Termos de créditos e reembolso','Condiciones de créditos y reembolsos')}</Link>
 </section>;
}
