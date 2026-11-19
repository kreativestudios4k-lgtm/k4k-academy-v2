'use client';
import Link from 'next/link';
import PreviewShell from '../PreviewShell';
import {useK4KLocale} from '../locale';
import {BR_BLACK_FRIDAY_OFFER,formatBlackFridayBRL} from '../../../lib/k4k-br-black-friday-offer.mjs';
import PricingModelDetails from './PricingModelDetails';
import './black-friday-preview.css';

const translations={
 pt:{
  eyebrow:'STRIPE K4K · INTEGRAÇÃO EXISTENTE',
  status:'Preços preparados em teste · Checkout em validação',
  intro:'Novos preços e créditos em preparação para o lançamento. As assinaturas existentes continuam sem alteração.',
  headline:'Black Friday para criadores.',
  subheadline:'Crie imagens, vídeos, trends e campanhas em um só estúdio.',
  badge:'BLACK FRIDAY BRASIL · 27 A 30 NOV',
  monthly:'ASSINATURA MENSAL',
  popular:'MAIS POPULAR · ASSINATURA MENSAL',
  first:'por mês nos primeiros 3 meses',
  after:'Depois:',
  credits:'créditos mensais previstos no novo catálogo',
  video:'Até {count} vídeos de 30s com Motion Saver*',
  cta:'Ver planos atuais',
  included:'O que o plano oferece',
  items:['Modelos de imagem e vídeo no mesmo estúdio','Biblioteca privada, downloads e templates','K4K Motion para recriar tendências e movimentos'],
  info:'* Estimativa apenas: vídeos de 30 segundos com o modelo Kling Motion Saver a 140 créditos cada. Modelos, duração, qualidade, custos e limites estão sujeitos à verificação técnica antes do lançamento. Alguns modelos permitem vídeos mais curtos ou têm preço superior.',
  terms:'Oferta proposta exclusivamente para novos clientes elegíveis no Brasil, de 27 a 30 de novembro de 2026. Valores em reais brasileiros, por mês. Os valores Black Friday e as novas franquias de créditos ainda NÃO estão ativos; nenhuma cobrança com estes preços está disponível. Checkout, renovação após 3 meses e créditos precisam passar na validação antes da ativação.',
  current:'Ver planos atualmente configurados',
  prep:'Prévia da oferta · pagamento não disponível'
 },
 en:{
  eyebrow:'K4K STRIPE · EXISTING INTEGRATION',
  status:'Prices prepared for testing · Checkout under validation',
  intro:'New prices and credits are being prepared for launch. Existing subscriptions stay unchanged.',
  headline:'Black Friday for creators.',
  subheadline:'Create images, videos, trends and campaigns in one studio.',
  badge:'BRAZIL BLACK FRIDAY · 27–30 NOV',
  monthly:'MONTHLY SUBSCRIPTION',
  popular:'MOST POPULAR · MONTHLY',
  first:'per month for the first 3 months',
  after:'Then:',
  credits:'proposed monthly credits in the new catalogue',
  video:'Up to {count} 30-second Motion Saver videos*',
  cta:'View current plans',
  included:'What you get',
  items:['Image and video model selector in one studio','Private library, downloads and templates','K4K Motion workflows for viral recreations'],
  info:'* Estimate only: 30-second Kling Motion Saver videos at 140 credits each. Model availability, duration, quality, costs and limits require verification before launch. Other models may cost more or allow shorter videos.',
  terms:'Proposed offer for eligible new customers in Brazil, 27–30 November 2026. Prices are BRL per month. The Black Friday prices and increased credits are NOT active; checkout at these prices is unavailable. Billing, three-month renewal transition and credits must be tested before activation.',
  current:'View currently configured plans',
  prep:'Offer preview · Checkout unavailable'
 },
 es:{
  eyebrow:'STRIPE K4K · INTEGRACIÓN EXISTENTE',
  status:'Precios preparados para pruebas · Pago en validación',
  intro:'Preparamos los nuevos precios y créditos. Las suscripciones existentes no se modifican.',
  headline:'Black Friday para creadores.',
  subheadline:'Crea imágenes, vídeos, tendencias y campañas en un estudio.',
  badge:'BLACK FRIDAY BRASIL · 27–30 NOV',
  monthly:'SUSCRIPCIÓN MENSUAL',
  popular:'MÁS POPULAR · MENSUAL',
  first:'al mes durante los primeros 3 meses',
  after:'Después:',
  credits:'créditos mensuales propuestos para el nuevo catálogo',
  video:'Hasta {count} vídeos de 30 segundos con Motion Saver*',
  cta:'Ver planes actuales',
  included:'Qué incluye',
  items:['Modelos de imagen y vídeo en un estudio','Biblioteca privada, descargas y plantillas','K4K Motion para recrear movimientos y tendencias'],
  info:'* Solo estimación: vídeos de 30 segundos con Kling Motion Saver a 140 créditos cada uno. Modelos, duración, calidad, costes y límites deben verificarse antes del lanzamiento.',
  terms:'Oferta propuesta para nuevos clientes elegibles en Brasil, del 27 al 30 de noviembre de 2026. Precios mensuales en BRL. Los nuevos precios y créditos NO están activos ni disponibles en el pago. Deben validarse la facturación, renovación y los créditos.',
  current:'Ver planes configurados actualmente',
  prep:'Vista previa · Pago no disponible'
 }
};
export default function BrazilBlackFridayOffer(){
 const {locale}=useK4KLocale(),t=translations[locale]||translations.pt;
 return <PreviewShell active="Credits">
  <div className="k4k-bf-page">
   <header className="k4k-bf-header">
    <div className="k4k-bf-eyebrow">{t.badge}</div>
    <h1>{t.headline}</h1>
    <p>{t.subheadline}</p>
   </header>
   <section className="k4k-bf-status" aria-label={t.status}>
    <span>{t.eyebrow}</span>
    <h2>{t.status}</h2>
    <p>{t.intro}</p>
   </section>
   <div className="k4k-bf-grid" aria-label="K4K Brazil Black Friday proposed plans">
    {BR_BLACK_FRIDAY_OFFER.plans.map(plan=><article className={'k4k-bf-card'+(plan.id==='creator'?' is-popular':'')} key={plan.id}>
     <div className="k4k-bf-planlabel">{plan.id==='creator'?t.popular:t.monthly}</div>
     <h2>{plan.name}</h2>
     <p className="k4k-bf-purpose">{plan.description}</p>
     <div className="k4k-bf-regular"><s>{formatBlackFridayBRL(plan.regularMinor)}/mês</s></div>
     <div className="k4k-bf-price">{formatBlackFridayBRL(plan.promoMinor)}</div>
     <p className="k4k-bf-first">{t.first}</p>
     <p className="k4k-bf-after">{t.after} <strong>{formatBlackFridayBRL(plan.regularMinor)}/mês</strong></p>
     <div className="k4k-bf-divider"/>
     <div className="k4k-bf-credits">{new Intl.NumberFormat('pt-BR').format(plan.monthlyCredits)}</div>
     <p className="k4k-bf-credit-description">{t.credits}</p>
     <p className="k4k-bf-video">{t.video.replace('{count}',plan.estimatedSaverVideos)}</p>
     <div className="k4k-bf-benefits">
      <strong>{t.included}</strong>
      <ul>{t.items.map(item=><li key={item}>{item}</li>)}</ul>
     </div>
     <Link href="/k4k-app/credits" className="k4k-bf-signup">{t.cta}<span aria-hidden="true">↗</span></Link>
    </article>)}
   </div>
   <div className="k4k-bf-disclaimer">
    <p>{t.info}</p>
    <p>{t.terms}</p>
    <div className="k4k-bf-actions"><span>{t.prep}</span><Link href="/k4k-app/credits">{t.current} ↗</Link></div>
   </div>
   <PricingModelDetails locale={locale}/>
  </div>
 </PreviewShell>;
}
