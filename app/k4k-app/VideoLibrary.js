'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Search,Grid2X2,List,RefreshCw,Play,Download,Film,X,ArrowUpRight,Clock} from 'lucide-react';
import {createClient} from '../../lib/supabase/client';
import {useK4KLocale} from './locale';
import './video-library.css';
const pending=new Set(['queued','processing']);
export default function VideoLibrary({embedded=false,onReuse}){
 const {locale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [jobs,setJobs]=useState([]),[loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[error,setError]=useState(''),[pageSize,setPageSize]=useState(60);
 const [filter,setFilter]=useState('all'),[search,setSearch]=useState(''),[view,setView]=useState('grid');
 const [urls,setUrls]=useState({}),[busy,setBusy]=useState(null),[selected,setSelected]=useState(null),[actionError,setActionError]=useState('');
 const dialog=useRef(null),refreshLock=useRef(false),alive=useRef(true);
 const refresh=useCallback(async()=>{
  if(refreshLock.current)return;
  refreshLock.current=true;
  try{
   const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();
   if(!alive.current)return;
   if(authError||!user){setSignedIn(false);setJobs([]);return;}
   setSignedIn(true);
   const {data,error}=await client.from('studio_generation_jobs').select('id,status,model,template_id,prompt,created_at,credits_reserved').eq('user_id',user.id).order('created_at',{ascending:false}).limit(pageSize);
   if(error)throw Error('Unable to load your library.');
   if(alive.current){setJobs(data||[]);setError('');}
  }catch{if(alive.current)setError('Unable to load your library. Please try again.')}
  finally{refreshLock.current=false;if(alive.current)setLoading(false)}
 },[pageSize]);
 useEffect(()=>{alive.current=true;refresh();return()=>{alive.current=false}},[refresh]);
 useEffect(()=>{
  let stopped=false;
  const ready=jobs.filter(job=>job.status==='completed'&&(!urls[job.id]||urls[job.id].until<Date.now()+10000)).slice(0,12);
  if(ready.length)(async()=>{
   const {data:{session}}=await createClient().auth.getSession();
   if(!session?.access_token||stopped)return;
   for(const job of ready){
    if(stopped)break;
    try{
     const response=await fetch('/api/generation/jobs/download?jobId='+encodeURIComponent(job.id),{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
     const result=await response.json();
     if(!stopped&&response.ok&&typeof result.url==='string'&&result.url.startsWith('https://'))setUrls(old=>({...old,[job.id]:{url:result.url,until:Date.now()+(result.expiresIn||120)*1000}}));
    }catch{}
   }
  })();
  return()=>{stopped=true};
 },[jobs]);
 const checkJob=useCallback(async(jobId,quiet=false)=>{
  if(!quiet){setBusy(jobId);setActionError('');}
  try{
   const {data:{session}}=await createClient().auth.getSession();
   if(!session?.access_token)throw Error('Please sign in again.');
   const response=await fetch('/api/generation/jobs/refresh',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({jobId})});
   const result=await response.json();
   if(!response.ok)throw Error('Unable to update this video. Your project is saved; try again shortly.');
   await refresh();
  }catch(error){if(!quiet&&alive.current)setActionError(error.message)}finally{if(!quiet&&alive.current)setBusy(null)}
 },[refresh]);
 useEffect(()=>{
  if(!jobs.some(job=>pending.has(job.status)))return;
  let polling=false;
  const timer=setInterval(async()=>{
   if(document.visibilityState!=='visible'||polling)return;
   polling=true;
   try{for(const job of jobs.filter(item=>pending.has(item.status)).slice(0,3))await checkJob(job.id,true)}finally{polling=false}
  },15000);
  return()=>clearInterval(timer);
 },[jobs,checkJob]);
 useEffect(()=>{if(selected&&!dialog.current?.open)dialog.current?.showModal();if(!selected&&dialog.current?.open)dialog.current.close()},[selected]);
 async function openVideo(job,force=false){
  setSelected(job);setActionError('');setBusy(job.id);
  try{
   const cached=urls[job.id];if(!force&&cached&&cached.until>Date.now()+10000)return;
   const {data:{session}}=await createClient().auth.getSession();
   if(!session?.access_token)throw Error('Please sign in again.');
   const response=await fetch('/api/generation/jobs/download?jobId='+encodeURIComponent(job.id),{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
   const result=await response.json();
   if(!response.ok||typeof result.url!=='string'||!result.url.startsWith('https://'))throw Error('The video could not be opened. Please retry.');
   if(alive.current)setUrls(old=>({...old,[job.id]:{url:result.url,until:Date.now()+(result.expiresIn||120)*1000}}));
  }catch(error){if(alive.current)setActionError(error.message)}finally{if(alive.current)setBusy(null)}
 }
 useEffect(()=>{setSelected(current=>current?jobs.find(job=>job.id===current.id)||current:null)},[jobs]);
 const counts={all:jobs.length,completed:jobs.filter(j=>j.status==='completed').length,processing:jobs.filter(j=>pending.has(j.status)).length,draft:jobs.filter(j=>j.status==='draft').length};
 const filtered=jobs.filter(job=>(filter==='all'||(filter==='processing'?pending.has(job.status):job.status===filter))&&[job.template_id,job.model,job.prompt].join(' ').toLowerCase().includes(search.toLowerCase()));
 const title=job=>job.template_id==='operator-smoke-20261110'?tr('Your first K4K generation','Sua primeira geração K4K','Tu primera generación K4K'):job.template_id==='creator-upload-preview'?tr('Original creation','Criação original','Creación original'):job.template_id;
 const statusText=status=>({completed:tr('Ready to play','Pronto para assistir','Listo para ver'),processing:tr('Generating','Gerando','Generando'),queued:tr('In queue','Na fila','En cola'),draft:tr('Draft','Rascunho','Borrador'),failed:tr('Failed','Falhou','Fallido'),cancelled:tr('Cancelled','Cancelado','Cancelado')})[status]||status;
 return <section className={'kl-library'+(embedded?' kl-embedded':'')}>
  <header className="kl-heading"><div><span>K4K / {tr('YOUR PRIVATE LIBRARY','SUA BIBLIOTECA PRIVADA','TU BIBLIOTECA PRIVADA')}</span><h1>{tr('Your videos. Your world.','Seus vídeos. Seu mundo.','Tus vídeos. Tu mundo.')}</h1><p>{tr('Every scene you create, saved in one place.','Todas as suas criações em um só lugar.','Todas tus creaciones en un solo lugar.')}</p></div><Link href="/k4k-app/creator">{tr('Create video','Criar vídeo','Crear vídeo')}<ArrowUpRight size={15}/></Link></header>
  <div className="kl-toolbar"><div className="kl-filters" role="group" aria-label="Filter your videos">{[['all',tr('All','Todos','Todos')],['completed',tr('Completed','Concluídos','Completados')],['processing',tr('In progress','Em andamento','En curso')],['draft',tr('Drafts','Rascunhos','Borradores')],['failed',tr('Failed','Falhas','Fallidos')]].map(([id,label])=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}{counts[id]!==undefined&&<small>{counts[id]}</small>}</button>)}</div><div className="kl-tools"><label><Search size={15}/><input aria-label="Search your videos" placeholder={tr('Search videos…','Buscar vídeos…','Buscar vídeos…')} value={search} onChange={e=>setSearch(e.target.value)}/></label><button type="button" onClick={refresh} aria-label="Refresh library" disabled={loading}><RefreshCw size={15}/></button><button type="button" aria-label="Grid view" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><Grid2X2 size={15}/></button><button type="button" aria-label="List view" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={15}/></button></div></div>
  {error&&<p role="alert" className="kl-error">{error}</p>}
  {actionError&&!selected&&<p role="alert" className="kl-error">{actionError}</p>}
  {loading?<div className="kl-empty" role="status"><RefreshCw size={24}/><h2>{tr('Opening your library…','Abrindo sua biblioteca…','Abriendo tu biblioteca…')}</h2></div>:!signedIn?<div className="kl-empty"><Film size={32}/><h2>{tr('Your creations live here.','Suas criações ficam aqui.','Tus creaciones viven aquí.')}</h2><p>{tr('Sign in to see your private videos and saved drafts.','Entre para ver seus vídeos privados e rascunhos.','Inicia sesión para ver tus vídeos privados y borradores.')}</p><Link href={'/login?next='+encodeURIComponent(embedded?'/k4k-app/creator?view=history':'/k4k-app/videos')}>{tr('Sign in to your library','Entrar na biblioteca','Entrar a tu biblioteca')}<ArrowUpRight size={15}/></Link></div>:!filtered.length?<div className="kl-empty"><Film size={32}/><h2>{tr('Make room for your next scene.','Abra espaço para sua próxima cena.','Haz espacio para tu próxima escena.')}</h2><p>{search?tr('No videos match your search.','Nenhum vídeo encontrado.','No hay resultados.'):tr('Your saved drafts and generated videos appear here.','Seus rascunhos e vídeos gerados aparecem aqui.','Tus borradores y vídeos generados aparecerán aquí.')}</p><Link href="/k4k-app/creator">{tr('Start creating','Começar a criar','Empieza a crear')}<ArrowUpRight size={15}/></Link></div>:<div className={'kl-grid kl-'+view}>{filtered.map(job=><article className="kl-card" key={job.id}><button type="button" className={'kl-preview kl-status-'+job.status} onClick={()=>job.status==='completed'?openVideo(job):setSelected(job)} aria-label={tr('Open ','Abrir ','Abrir ')+title(job)}>{urls[job.id]?<video src={urls[job.id].url} muted playsInline preload="metadata"/>:<div className="kl-card-mark"><img src="/k4k-mark.svg" alt=""/><span>{job.model==='lite'?'MOTION LITE':'MOTION PRO'}</span></div>}<span className="kl-state">{pending.has(job.status)?<Clock size={12}/>:null}{statusText(job.status)}</span><span className="kl-play">{job.status==='completed'?<Play size={22}/>:<Film size={22}/>}</span></button><div className="kl-card-info"><h2>{title(job)}</h2><p>{job.model==='lite'?'Motion Lite':'Motion Pro'} · {new Date(job.created_at).toLocaleDateString(locale==='pt'?'pt-BR':locale==='es'?'es-ES':'en-GB')}</p><div>{job.status==='completed'?<button type="button" onClick={()=>openVideo(job)}><Play size={13}/>{tr('Play & download','Assistir e baixar','Ver y descargar')}</button>:pending.has(job.status)?<button type="button" disabled={busy===job.id} onClick={()=>checkJob(job.id)}><RefreshCw size={13}/>{tr('Check status','Verificar status','Comprobar estado')}</button>:<button type="button" onClick={()=>setSelected(job)}>{tr('View details','Ver detalhes','Ver detalles')}</button>}</div></div></article>)}</div>}
  {signedIn&&jobs.length===pageSize&&<button type="button" className="kl-load-more" onClick={()=>setPageSize(size=>size+60)}>{tr('Load more videos','Carregar mais vídeos','Cargar más vídeos')}</button>}
  <dialog ref={dialog} className="kl-dialog" onCancel={()=>setSelected(null)} onClick={e=>{if(e.target===dialog.current)setSelected(null)}} aria-label="Video details">{selected&&<><header><div><span>K4K ORIGINAL</span><h2>{title(selected)}</h2></div><button type="button" onClick={()=>setSelected(null)} aria-label="Close video"><X size={20}/></button></header><div className="kl-dialog-body"><div className="kl-player">{selected.status==='completed'&&urls[selected.id]?<video key={urls[selected.id].url} controls autoPlay playsInline src={urls[selected.id].url} onError={()=>setActionError('Video link expired or unavailable. Use Refresh video link to try again.')} aria-label="Your generated video"/>:<div><Film size={40}/><p>{busy===selected.id?tr('Opening video…','Abrindo vídeo…','Abriendo vídeo…'):statusText(selected.status)}</p></div>}</div><aside><span className="kl-detail-label">{tr('MODEL','MODELO','MODELO')}</span><p>{selected.model==='lite'?'Motion Lite':'Motion Pro'}</p><span className="kl-detail-label">{tr('CREATIVE DIRECTION','DIREÇÃO CRIATIVA','DIRECCIÓN CREATIVA')}</span><p className="kl-prompt-text">{selected.prompt||tr('No additional prompt.','Sem instruções adicionais.','Sin instrucciones adicionales.')}</p><p>{statusText(selected.status)}</p>{selected.status==='completed'&&<><button type="button" onClick={()=>{setUrls(old=>({...old,[selected.id]:null}));openVideo({...selected},true)}}>{tr('Refresh video link','Atualizar link do vídeo','Actualizar enlace')}</button>{urls[selected.id]&&<a href={urls[selected.id].url} target="_blank" rel="noopener noreferrer"><Download size={15}/>{tr('Open / download MP4','Abrir / baixar MP4','Abrir / descargar MP4')}</a>}</>}{pending.has(selected.status)&&<button type="button" disabled={busy===selected.id} onClick={()=>checkJob(selected.id)}>{tr('Check status','Verificar status','Comprobar estado')}</button>}{onReuse&&<button type="button" onClick={()=>{onReuse(selected);setSelected(null)}}>{tr('Use these creative settings','Usar estas configurações','Usar estos ajustes')}</button>}{!onReuse&&<Link href="/k4k-app/creator">{tr('Create another video','Criar outro vídeo','Crear otro vídeo')}</Link>}{actionError&&<p role="alert" className="kl-error">{actionError}</p>}<small>{tr('Private video. Download links expire for security; refresh them here whenever you need.','Vídeo privado. Links de download expiram por segurança; atualize aqui quando precisar.','Vídeo privado. Los enlaces caducan por seguridad; actualízalos aquí cuando necesites.')}</small></aside></div></>}</dialog>
 </section>;
}
