'use client';
import {useState} from 'react';
import {CREDIT_PACKS,proposedGenerationCredits} from '../../../lib/k4k-credit-proposal.mjs';
import {useK4KLocale} from '../locale';
export default function CreditProposal({currency='GBP'}){
 const {locale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [model,setModel]=useState('lite'),[seconds,setSeconds]=useState(5),[resolution,setResolution]=useState('720p');
 const quote=proposedGenerationCredits({model,resolution,seconds});
 const money=minor=>new Intl.NumberFormat(locale==='pt'?'pt-BR':locale==='es'?'es-ES':'en-GB',{style:'currency',currency:currency||'GBP'}).format(minor/100);
 return <section className="k4k-credit-proposal" aria-label="Proposed generation pricing and extra credits">
  <span className="k4k-workspace-eyebrow">{tr('PRICING PROPOSAL · NOT ACTIVATED','PROPOSTA DE PREÇOS · NÃO ATIVADA','PROPUESTA DE PRECIOS · SIN ACTIVAR')}</span>
  <h2>{tr('Know your credits before you create.','Confira os créditos antes de criar.','Conoce los créditos antes de crear.')}</h2>
  <p>{tr('Compare models, duration and quality. This calculator is illustrative; the server verifies your uploaded video and confirms the final cost before generation.','Compare modelos, duração e qualidade. Esta simulação é ilustrativa; o servidor verifica seu vídeo e confirma o custo antes da geração.','Compara modelos, duración y calidad. Esta simulación es orientativa; el servidor verifica tu vídeo y confirma el coste antes de generar.')}</p>
  <div className="k4k-credit-calculator">
   <label>{tr('Model','Modelo','Modelo')}<select value={model} onChange={e=>{setModel(e.target.value);if(e.target.value==='lite'&&seconds>15)setSeconds(15)}}><option value="lite">Motion Lite</option><option value="pro">Motion Pro</option></select></label>
   <label>{tr('Duration','Duração','Duración')}<select value={seconds} onChange={e=>setSeconds(Number(e.target.value))}>{[5,10,15,...(model==='pro'?[20,30]:[])].map(n=><option key={n} value={n}>{n}s</option>)}</select></label>
   <label>{tr('Quality','Qualidade','Calidad')}<select value={resolution} onChange={e=>setResolution(e.target.value)}>{['480p','720p','1080p'].map(r=><option key={r}>{r}</option>)}</select></label>
   <output aria-live="polite"><strong>{quote.credits}</strong> {tr('credits / video','créditos / vídeo','créditos / vídeo')}</output>
  </div>
  <h2>{tr('Need more? Top up once.','Precisa de mais? Adicione créditos.','¿Necesitas más? Recarga una vez.')}</h2>
  <p>{tr('Proposed one-time packs. Keep your current plan. No new subscription.','Pacotes avulsos propostos. Mantenha seu plano. Sem nova assinatura.','Paquetes de pago único propuestos. Conserva tu plan. Sin nueva suscripción.')}</p>
  <div className="k4k-topup-grid">{CREDIT_PACKS.map(pack=><article key={pack.id}><h3>{pack.credits} {tr('extra credits','créditos extras','créditos extra')}</h3><strong>{money(pack[currency||'GBP'])}</strong><p>{tr('One-time purchase','Compra única','Pago único')}</p><button type="button" disabled>{tr('Awaiting pricing approval','Aguardando aprovação','Pendiente de aprobación')}</button></article>)}</div>
  <p><small>{tr('No purchases are available yet. Credits are added only after verified payment, once per purchase. Top-up expiry and refund terms must be finalised before checkout opens.','As compras ainda não estão disponíveis. Créditos são adicionados após pagamento verificado, uma vez por compra. Validade e reembolso serão definidos antes da ativação.','Las compras aún no están disponibles. Los créditos se añaden tras verificar el pago, una vez por compra. La caducidad y los reembolsos se definirán antes de activar las compras.')}</small></p>
 </section>;
}
