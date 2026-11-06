'use client';
import {useState} from 'react';
import Link from 'next/link';
import PreviewShell from '../PreviewShell';
import {useK4KLocale} from '../locale';

const milestones=[{views:100000,usd:10},{views:500000,usd:30},{views:1000000,usd:60}];
export default function RewardsPreview(){
 const {locale}=useK4KLocale();
 const [views,setViews]=useState('100000');
 const [referrals,setReferrals]=useState('5');
 const [monthlyPrice,setMonthlyPrice]=useState('14.99');
 const [submitted,setSubmitted]=useState(false);
 const n=Math.max(0,Number(views)||0),r=Math.max(0,Math.floor(Number(referrals)||0)),p=Math.max(0,Number(monthlyPrice)||0);
 const bonus=[...milestones].reverse().find(m=>n>=m.views)?.usd||0;
 const commission=r*p*.15;
 const pt=locale==='pt',es=locale==='es';
 const label=(en,br,esText)=>pt?br:es?esText:en;
 return <PreviewShell active="Rewards">
 <div className="k4k-visual" aria-hidden="true">★</div>
 <h1>{label('Creator Rewards','Recompensas para criadores','Recompensas para creadores')}</h1>
 <p>{label('Preview-only programme simulator. Figures are examples, not earnings or approved payouts.','Simulador de prévia. Valores ilustrativos, não são ganhos ou pagamentos aprovados.','Simulador de vista previa. Importes ilustrativos, no son pagos aprobados.')}</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,margin:'24px 0'}}>
 <section className="k4k-card"><h2>15% {label('affiliate commission','comissão de afiliado','comisión de afiliado')}</h2><p>{label('On qualifying net subscription revenue for up to 12 months.','Sobre receita líquida elegível por até 12 meses.','Sobre ingresos netos elegibles hasta 12 meses.')}</p></section>
 <section className="k4k-card"><h2>$10 / $30 / $60</h2><p>{label('Highest verified milestone within 30 days: 100K / 500K / 1M views. Not cumulative.','Maior meta verificada em 30 dias: 100 mil / 500 mil / 1 milhão. Não cumulativo.','Mayor meta verificada en 30 días: 100 mil / 500 mil / 1 millón. No acumulativo.')}</p></section>
 <section className="k4k-card"><h2>{label('Monthly challenge','Desafio mensal','Reto mensual')}</h2><p>{label('At least 5 verified paying referrals to qualify. Prize: one plan month with normal credit limits.','Mínimo de 5 indicações pagas verificadas. Prêmio: um mês de plano com créditos normais.','Mínimo de 5 referidos de pago verificados. Premio: un mes con créditos normales.')}</p></section>
 </div>
 <section className="k4k-card"><h2>{label('Estimate potential rewards','Simule recompensas','Simula recompensas')}</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14}}>
 <label>{label('Verified video views','Visualizações verificadas','Visualizaciones verificadas')}<input type="number" min="0" step="1000" value={views} onChange={e=>setViews(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:8,borderRadius:10}}/></label>
 <label>{label('Eligible paid referrals','Indicações pagas elegíveis','Referidos de pago elegibles')}<input type="number" min="0" step="1" value={referrals} onChange={e=>setReferrals(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:8,borderRadius:10}}/></label>
 <label>{label('Example net monthly subscription (£)','Exemplo de assinatura líquida mensal (£)','Ejemplo de suscripción neta mensual (£)')}<input type="number" min="0" step=".01" value={monthlyPrice} onChange={e=>setMonthlyPrice(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:8,borderRadius:10}}/></label>
 </div>
 <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:20}}>
 <div><strong style={{fontSize:30}}>$ {Math.min(bonus,60).toFixed(2)}</strong><p>{label('Illustrative video bonus','Bônus ilustrativo por vídeo','Bono ilustrativo por vídeo')}</p></div>
 <div><strong style={{fontSize:30}}>£ {commission.toFixed(2)}</strong><p>{label('Illustrative monthly referral commission','Comissão mensal ilustrativa','Comisión mensual ilustrativa')}</p></div>
 </div><p><small>{label('Actual commissions exclude taxes, discounts, refunds and chargebacks. Monthly pilot caps: $150 per creator and $500 total; admin approval required.','Comissões reais excluem impostos, descontos, reembolsos e estornos. Limites: US$150 por criador e US$500 no total por mês; aprovação manual.','Las comisiones reales excluyen impuestos, descuentos y reembolsos. Límites: $150 por creador y $500 en total al mes; aprobación manual.')}</small></p>
 </section>
 <section className="k4k-card"><h2>{label('Programme access','Acesso ao programa','Acceso al programa')}</h2><p>{label('Referral links, submissions, leaderboard, and payouts are not yet connected. No video analytics are collected on this page.','Links, envios, ranking e pagamentos ainda não estão conectados. Nenhuma análise de vídeo é coletada nesta página.','Enlaces, envíos, clasificación y pagos aún no están conectados. No se recogen estadísticas de vídeo.')}</p>
 <button type="button" disabled style={{padding:14,borderRadius:12,opacity:.6,cursor:'not-allowed'}}>{label('Apply — coming soon','Inscrições em breve','Solicitudes próximamente')}</button>
 </section>
 <Link className="k4k-black" href="/k4k-app">{label('Back to K4K APP','Voltar ao K4K APP','Volver a K4K APP')}</Link>
 </PreviewShell>;
}