'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {UserRound,Coins,Film,ArrowUpRight,LogOut,Copy} from 'lucide-react';
import PreviewShell from '../PreviewShell';
import EarlyFreeOffer from '../EarlyFreeOffer';
import {useK4KLocale} from '../locale';
import {createClient} from '../../../lib/supabase/client';
import {useVerifiedAccount,signOutK4K} from '../useVerifiedAccount';
import {k4kProfileId,profileName} from '../../../lib/k4k-profile-id.mjs';
import '../account-menu.css';
export default function Account(){
 const {locale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const {user,ready,error:accountError}=useVerifiedAccount();
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[copied,setCopied]=useState(false);
 const profileId=k4kProfileId(user?.id);
 const [details,setDetails]=useState({owner:null,balance:null,jobs:[],membership:null,bonus:null});
 const current=details.owner===user?.id?details:{balance:null,jobs:[],membership:null,bonus:null};
 const {balance,jobs,membership,bonus}=current;
 useEffect(()=>{
  let alive=true;setDetails({owner:null,balance:null,jobs:[],membership:null,bonus:null});setCopied(false);
  if(!user?.id)return;
  const client=createClient();setLoading(true);setMessage('');
  Promise.all([
   client.from('studio_generation_jobs').select('id,status,model,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(6),
   client.auth.getSession().then(async ({data})=>{if(!data.session||data.session.user.id!==user.id)return {data:null,error:true};const response=await fetch('/api/billing/account',{headers:{Authorization:'Bearer '+data.session.access_token},cache:'no-store'});return {data:response.ok?await response.json():null,error:!response.ok}}),
   client.from('k4k_academy_migration_bonuses').select('status').eq('user_id',user.id).maybeSingle()
  ]).then(([history,plan,gift])=>{
   if(!alive)return;
   if(history.error||plan.error){setMessage('Some account details are unavailable. Please retry or contact support.');return;}
   setDetails({owner:user.id,balance:plan.data?.creditBalance??0,jobs:history.data||[],membership:plan.data,bonus:gift.error?null:gift.data?.status||null});
  }).catch(()=>{if(alive)setMessage('Unable to load account activity. Please retry.');}).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[user?.id]);
 async function signOut(){if(busy)return;setBusy(true);setMessage('');try{await signOutK4K()}catch{setMessage('Sign-out failed. Please retry.');setBusy(false)}}
 async function copyId(){try{await navigator.clipboard.writeText(profileId);setCopied(true)}catch{setMessage('Select and copy your profile ID manually.')}}

 return <PreviewShell active="Account"><div className="k4k-account-page">
  <header className="k4k-account-heading"><span>K4K APP / {tr('YOUR WORKSPACE','SEU ESPAÇO','TU ESPACIO')}</span><h1>{tr('Your account. Your creations.','Sua conta. Suas criações.','Tu cuenta. Tus creaciones.')}</h1><p>{tr('Manage your profile, credits and private videos in one place.','Perfil, créditos e vídeos privados em um só lugar.','Perfil, créditos y vídeos privados en un solo lugar.')}</p></header>
  {!ready?<p role="status">{tr('Opening your account…','Abrindo sua conta…','Abriendo tu cuenta…')}</p>:!user?<section className="k4k-account-panel"><UserRound size={32}/><h2>{tr('Welcome to K4K APP','Bem-vindo ao K4K APP','Bienvenido a K4K APP')}</h2><p>{tr('Use your existing account. Your email, password and subscription records are preserved.','Use sua conta existente. Seu e-mail, senha e registros de assinatura são preservados.','Usa tu cuenta existente. Tu correo, contraseña y registros de suscripción se conservan.')}</p><div className="k4k-account-actions"><Link href="/login?next=%2Fk4k-app%2Faccount">{tr('Sign in to studio','Entrar no estúdio','Entrar al estudio')} <ArrowUpRight size={16}/></Link><Link href="/k4k-app/register">{tr('Create account','Criar conta','Crear cuenta')}</Link></div></section>:<>
   <EarlyFreeOffer/><div className="k4k-account-summary"><section className="k4k-account-panel"><UserRound size={24}/><span>{tr('PROFILE','PERFIL','PERFIL')}</span><h2>{profileName(user)}</h2><p>{user.email}</p>{profileId&&<div className="k4k-profile-id-inline"><small>{tr('PROFILE ID','ID DO PERFIL','ID DEL PERFIL')}</small><code>{profileId}</code><button type="button" onClick={copyId}><Copy size={14}/>{copied?tr('Copied','Copiado','Copiado'):tr('Copy ID','Copiar ID','Copiar ID')}</button></div>}<Link href="/update-password">{tr('Change password','Alterar senha','Cambiar contraseña')} →</Link></section><section className="k4k-account-panel"><Coins size={24}/><span>{tr('AVAILABLE CREDITS','CRÉDITOS DISPONÍVEIS','CRÉDITOS DISPONIBLES')}</span><strong className="k4k-account-balance">{loading?'…':balance??'—'}</strong><Link href="/k4k-app/credits">{tr('Plans & credits','Planos e créditos','Planes y créditos')} →</Link></section><section className="k4k-account-panel"><Film size={24}/><span>{tr('SUBSCRIPTION','ASSINATURA','SUSCRIPCIÓN')}</span><h2>{loading?'…':membership?.app?.status||tr('No linked plan','Sem plano vinculado','Sin plan vinculado')}</h2>{membership?.academy&&<p>{tr('Existing Academy subscription: ','Assinatura da Academia: ','Suscripción de Academy: ')}{membership.academy.status}</p>}{membership?.legacy&&<p>{tr('Existing legacy account: ','Conta anterior: ','Cuenta anterior: ')}{membership.legacy.status}</p>}<p>{tr('Already paid but missing access? Contact support before purchasing again.','Já pagou e não tem acesso? Fale com o suporte antes de comprar novamente.','¿Ya pagaste y falta acceso? Contacta con soporte antes de comprar otra vez.')}</p><Link href="/k4k-app/support">{tr('Billing support','Suporte de pagamentos','Ayuda de facturación')} →</Link></section></div>
   {membership?.manualPix&&<section className="k4k-account-panel"><h2>{tr('Pix — manual renewal','Pix — renovação manual','Pix — renovación manual')}</h2><p>{membership.manualPix.plan_key} · {tr('Paid period ends: ','Período pago termina em: ','El período pagado termina: ')}{new Date(membership.manualPix.period_end).toLocaleDateString(locale==='pt'?'pt-BR':locale==='es'?'es-ES':'en-GB')}</p><p>{membership.manualPix.renewalDue?tr('Your period has ended. Pay again if you want another month of credits. No automatic debit will be made.','Seu período terminou. Pague novamente se quiser mais um mês de créditos. Não haverá débito automático.','Tu período terminó. Paga de nuevo si quieres otro mes de créditos. No habrá cargo automático.'):tr('No automatic renewal. Return here when the period ends to pay again. Unused credits carry over.','Sem renovação automática. Volte quando o período terminar para pagar novamente. Créditos não utilizados acumulam.','Sin renovación automática. Vuelve al terminar el período para pagar de nuevo. Los créditos no utilizados se acumulan.')}</p>{membership.manualPix.renewalDue&&<Link href={'/k4k-app/credits?plan='+membership.manualPix.plan_key}>{tr('Renew with Pix','Renovar com Pix','Renovar con Pix')} →</Link>}</section>}
   {bonus&&<p className="k4k-account-gift">{tr('Existing-member gift status: ','Status do presente de membro: ','Estado del regalo de miembro: ')}{bonus}</p>}
   <section className="k4k-account-panel"><div className="k4k-account-section-heading"><h2>{tr('Recent creations','Criações recentes','Creaciones recientes')}</h2><Link href="/k4k-app/videos">{tr('Open library','Abrir biblioteca','Abrir biblioteca')} →</Link></div>{!jobs.length?<p>{loading?'…':tr('Your videos will appear here.','Seus vídeos aparecerão aqui.','Tus vídeos aparecerán aquí.')}</p>:<ul className="k4k-account-jobs">{jobs.map(job=><li key={job.id}><Film size={18}/><div><strong>{job.model==='lite'?'Motion Lite · 720p':'Motion Pro · 1080p'}</strong><small>{new Date(job.created_at).toLocaleDateString(locale==='pt'?'pt-BR':locale==='es'?'es-ES':'en-GB')}</small></div><span>{job.status}</span><Link href="/k4k-app/videos" aria-label="Open video library"><ArrowUpRight size={19}/></Link></li>)}</ul>}</section>
   <div className="k4k-account-actions"><Link href="/k4k-app/creator">{tr('Create video','Criar vídeo','Crear vídeo')} <ArrowUpRight size={16}/></Link><button type="button" disabled={busy} onClick={signOut}><LogOut size={16}/>{tr('Sign out','Sair','Cerrar sesión')}</button></div>
  </>}{(message||accountError)&&<p role="alert">{message||tr('Account information is temporarily unavailable.','Informações da conta temporariamente indisponíveis.','Información de la cuenta temporalmente no disponible.')}</p>}
 </div></PreviewShell>;
}
