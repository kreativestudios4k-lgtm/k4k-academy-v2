'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {UserRound,Coins,Film,ArrowUpRight,LogOut} from 'lucide-react';
import PreviewShell from '../PreviewShell';
import {useK4KLocale} from '../locale';
import {createClient} from '../../../lib/supabase/client';
export default function Account(){
 const {locale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [user,setUser]=useState(null),[ready,setReady]=useState(false),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [balance,setBalance]=useState(null),[jobs,setJobs]=useState([]),[membership,setMembership]=useState(null),[bonus,setBonus]=useState(null);
 useEffect(()=>{
  let alive=true;const client=createClient();
  client.auth.getUser().then(({data,error})=>{if(alive){setUser(error?null:data.user);setReady(true)}}).catch(()=>{if(alive){setMessage('Unable to load your account. Please retry.');setReady(true)}});
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(alive){setUser(session?.user||null);setReady(true)}});
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);
 useEffect(()=>{
  let alive=true;setBalance(null);setJobs([]);setMembership(null);setBonus(null);
  if(!user?.id)return;
  const client=createClient();setLoading(true);setMessage('');
  Promise.all([
   client.from('studio_credit_accounts').select('balance').eq('user_id',user.id).maybeSingle(),
   client.from('studio_generation_jobs').select('id,status,model,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(6),
   client.auth.getSession().then(({data})=>fetch('/api/billing/account',{headers:{Authorization:'Bearer '+data.session?.access_token},cache:'no-store'})).then(async response=>({data:response.ok?await response.json():null,error:!response.ok})),
   client.from('k4k_academy_migration_bonuses').select('status').eq('user_id',user.id).maybeSingle()
  ]).then(([wallet,history,plan,gift])=>{
   if(!alive)return;
   if(wallet.error||history.error||plan.error){setMessage('Some account details are unavailable. Please retry or contact support.');return;}
   setBalance(wallet.data?.balance??0);setJobs(history.data||[]);setMembership(plan.data);if(!gift.error)setBonus(gift.data?.status||null);
  }).catch(()=>{if(alive)setMessage('Unable to load account activity. Please retry.');}).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[user?.id]);
 async function signOut(){setBusy(true);try{const {error}=await createClient().auth.signOut();if(error)throw error;window.location.assign('/login');}catch{setMessage('Sign-out failed. Please retry.');setBusy(false)}}

 return <PreviewShell active="Account"><div className="k4k-account-page">
  <header className="k4k-account-heading"><span>K4K APP / {tr('YOUR WORKSPACE','SEU ESPAÇO','TU ESPACIO')}</span><h1>{tr('Your account. Your creations.','Sua conta. Suas criações.','Tu cuenta. Tus creaciones.')}</h1><p>{tr('Manage your profile, credits and private videos in one place.','Perfil, créditos e vídeos privados em um só lugar.','Perfil, créditos y vídeos privados en un solo lugar.')}</p></header>
  {!ready?<p role="status">{tr('Opening your account…','Abrindo sua conta…','Abriendo tu cuenta…')}</p>:!user?<section className="k4k-account-panel"><UserRound size={32}/><h2>{tr('Welcome to K4K APP','Bem-vindo ao K4K APP','Bienvenido a K4K APP')}</h2><p>{tr('Use your existing account. Your email, password and subscription records are preserved.','Use sua conta existente. Seu e-mail, senha e registros de assinatura são preservados.','Usa tu cuenta existente. Tu correo, contraseña y registros de suscripción se conservan.')}</p><div className="k4k-account-actions"><Link href="/login?next=%2Fk4k-app%2Fcreator">{tr('Sign in to studio','Entrar no estúdio','Entrar al estudio')} <ArrowUpRight size={16}/></Link><Link href="/k4k-app/register">{tr('Create account','Criar conta','Crear cuenta')}</Link></div></section>:<>
   <div className="k4k-account-summary"><section className="k4k-account-panel"><UserRound size={24}/><span>{tr('PROFILE','PERFIL','PERFIL')}</span><h2>{user.user_metadata?.full_name||tr('Creator','Criador','Creador')}</h2><p>{user.email}</p><Link href="/update-password">{tr('Change password','Alterar senha','Cambiar contraseña')} →</Link></section><section className="k4k-account-panel"><Coins size={24}/><span>{tr('AVAILABLE CREDITS','CRÉDITOS DISPONÍVEIS','CRÉDITOS DISPONIBLES')}</span><strong className="k4k-account-balance">{loading?'…':balance??'—'}</strong><Link href="/k4k-app/credits">{tr('Plans & credits','Planos e créditos','Planes y créditos')} →</Link></section><section className="k4k-account-panel"><Film size={24}/><span>{tr('SUBSCRIPTION','ASSINATURA','SUSCRIPCIÓN')}</span><h2>{loading?'…':membership?.app?.status||tr('No linked plan','Sem plano vinculado','Sin plan vinculado')}</h2>{membership?.academy&&<p>{tr('Existing Academy subscription: ','Assinatura da Academia: ','Suscripción de Academy: ')}{membership.academy.status}</p>}{membership?.legacy&&<p>{tr('Existing legacy account: ','Conta anterior: ','Cuenta anterior: ')}{membership.legacy.status}</p>}<p>{tr('Already paid but missing access? Contact support before purchasing again.','Já pagou e não tem acesso? Fale com o suporte antes de comprar novamente.','¿Ya pagaste y falta acceso? Contacta con soporte antes de comprar otra vez.')}</p><Link href="/k4k-app/support">{tr('Billing support','Suporte de pagamentos','Ayuda de facturación')} →</Link></section></div>
   {bonus&&<p className="k4k-account-gift">{tr('Existing-member gift status: ','Status do presente de membro: ','Estado del regalo de miembro: ')}{bonus}</p>}
   <section className="k4k-account-panel"><div className="k4k-account-section-heading"><h2>{tr('Recent creations','Criações recentes','Creaciones recientes')}</h2><Link href="/k4k-app/videos">{tr('Open library','Abrir biblioteca','Abrir biblioteca')} →</Link></div>{!jobs.length?<p>{loading?'…':tr('Your videos will appear here.','Seus vídeos aparecerão aqui.','Tus vídeos aparecerán aquí.')}</p>:<ul className="k4k-account-jobs">{jobs.map(job=><li key={job.id}><Film size={18}/><div><strong>{job.model==='lite'?'Motion Lite · 720p':'Motion Pro · 1080p'}</strong><small>{new Date(job.created_at).toLocaleDateString(locale==='pt'?'pt-BR':locale==='es'?'es-ES':'en-GB')}</small></div><span>{job.status}</span><Link href="/k4k-app/videos" aria-label="Open video library"><ArrowUpRight size={19}/></Link></li>)}</ul>}</section>
   <div className="k4k-account-actions"><Link href="/k4k-app/creator">{tr('Create video','Criar vídeo','Crear vídeo')} <ArrowUpRight size={16}/></Link><button type="button" disabled={busy} onClick={signOut}><LogOut size={16}/>{tr('Sign out','Sair','Cerrar sesión')}</button></div>
  </>}{message&&<p role="alert">{message}</p>}
 </div></PreviewShell>;
}
