'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Home,Image as ImageIcon,Film,Clapperboard,Compass,Library,Coins,Settings,LogOut,Plus,ArrowUpRight,ArrowRight,Search,PanelLeftClose,PanelLeftOpen,Bell,Play,Clock3,FolderOpen,RefreshCw,Sparkles,LoaderCircle,UserRound,ShieldCheck,Menu,X} from 'lucide-react';
import {useVerifiedAccount,signOutK4K} from '../useVerifiedAccount';
import {createClient} from '../../../lib/supabase/client';
import {creativeLibraryJobs} from '../../../lib/creative-library.mjs';
import catalogue from '../template-catalogue.json';
import './dashboard.css';
const templates=[...catalogue.discoveryPreviews,...catalogue.trending].filter(t=>t.videoUrl).slice(0,5);
const labels={'seedance-25-t2v':'Seedance 2.5','kling-4-t2v':'Kling 4.0','nano-banana-21-t2i':'Nano Banana 2.1','flux3-t2i':'FLUX 3'};
const categories=[
 {label:'Image',detail:'Create and transform images',href:'/k4k-app/image',icon:ImageIcon},
 {label:'Video',detail:'Turn ideas into motion',href:'/k4k-app/video',icon:Film},
 {label:'K4K Motion',detail:'Recreate with your cast',href:'/k4k-app/motion',icon:Clapperboard},
 {label:'Explore templates',detail:'Start with a viral idea',href:'/k4k-app/motion/explore',icon:Compass}
];
export default function K4KDashboard(){
 const {user,ready,error:authError}=useVerifiedAccount();
 const [menu,setMenu]=useState(false),[collapsed,setCollapsed]=useState(false),[prompt,setPrompt]=useState(''),[kind,setKind]=useState('video'),[projects,setProjects]=useState([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[search,setSearch]=useState('');
 const router=useRouter();
 useEffect(()=>{if(ready&&!user&&!authError)router.replace('/login?next=%2Fk4k-app%2Fdashboard')},[ready,user,authError,router]);
 useEffect(()=>{
  if(!user?.id){setProjects([]);setLoading(false);return}
  let mounted=true;const client=createClient();
  async function load(){
   setLoading(true);setLoadError('');
   try{
    const {data:{session}}=await client.auth.getSession();
    if(!session||session.user.id!==user.id)throw Error('Please sign in again.');
    const response=await fetch('/api/creative/customer',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({action:'list'}),cache:'no-store'});
    const data=await response.json();
    if(!response.ok||data.error)throw Error('Could not load recent generations.');
    if(mounted)setProjects(creativeLibraryJobs(data.jobs).slice(0,8));
   }catch(e){if(mounted)setLoadError(e.message||'Could not load your projects.')}
   finally{if(mounted)setLoading(false)}
  }
  load();const onFocus=()=>{if(document.visibilityState==='visible')load()};document.addEventListener('visibilitychange',onFocus);
  return()=>{mounted=false;document.removeEventListener('visibilitychange',onFocus)}
 },[user?.id]);
 function create(){const p=prompt.trim();const href=kind==='image'?'/k4k-app/create?kind=image&from=dashboard':kind==='motion'?'/k4k-app/motion':'/k4k-app/create?kind=video&from=dashboard';if(p&&kind!=='motion'){try{sessionStorage.setItem('k4k-dashboard-draft',JSON.stringify({prompt:p,kind,createdAt:Date.now()}))}catch{}}router.push(href)}
 const name=(user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Creator').split(' ')[0];
 const active=projects.filter(p=>p.status==='processing'||p.status==='queued');
 const visible=projects.filter(p=>(labels[p.model]||'K4K creation').toLowerCase().includes(search.toLowerCase()));
 if(!ready||(!user&&!authError))return <main className="kd-loading" role="status"><LoaderCircle className="kd-spinner"/>Opening K4K Studio…</main>;
 if(authError)return <main className="kd-loading">We could not verify your account. <Link href="/login">Try signing in</Link></main>;
 return <div className={'kd-shell'+(collapsed?' kd-collapsed':'')}>
  <aside className={'kd-sidebar'+(menu?' kd-sidebar-open':'')} aria-label="Studio navigation">
   <div className="kd-sidebar-brand"><Link href="/k4k-app/dashboard"><img src="/k4k-mark.svg" width="28" height="28" alt=""/><span>K4K <small>STUDIO</small></span></Link><button type="button" className="kd-collapse" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'Expand navigation':'Collapse navigation'}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button></div>
   <Link className="kd-new-project" href="/k4k-app/create"><Plus size={16}/><span>New project</span></Link>
   <div className="kd-menu-label">WORKSPACE</div>
   <nav className="kd-sidebar-nav" aria-label="Primary">
    <Link className="kd-active" href="/k4k-app/dashboard"><Home size={17}/><span>Home</span></Link>
    <Link href="/k4k-app/motion/explore"><Compass size={17}/><span>Explore</span></Link>
    <Link href="/k4k-app/image"><ImageIcon size={17}/><span>Image</span></Link>
    <Link href="/k4k-app/video"><Film size={17}/><span>Video</span></Link>
    <Link href="/k4k-app/motion"><Clapperboard size={17}/><span>K4K Motion</span></Link>
   </nav>
   <div className="kd-menu-label">LIBRARY</div>
   <nav className="kd-sidebar-nav" aria-label="Your library">
    <Link href="/k4k-app/videos"><Library size={17}/><span>My generations</span></Link>
    <Link href="/k4k-app/credits"><Coins size={17}/><span>Credits & plans</span></Link>
   </nav>
   <div className="kd-sidebar-spacer"/>
   <div className="kd-menu-label">ACCOUNT</div>
   <nav className="kd-sidebar-nav" aria-label="Account">
    <Link href="/k4k-app/account"><Settings size={17}/><span>Settings</span></Link>
    <button type="button" onClick={()=>signOutK4K()}><LogOut size={17}/><span>Sign out</span></button>
   </nav>
   <div className="kd-user"><div className="kd-avatar">{name.substring(0,1).toUpperCase()}</div><span><strong>{name}</strong><small>Creator account</small></span></div>
  </aside>
  {menu&&<button className="kd-backdrop" type="button" aria-label="Close navigation" onClick={()=>setMenu(false)}/>}
  <div className="kd-body">
   <header className="kd-topbar"><div className="kd-breadcrumb"><button type="button" className="kd-mobile-menu" onClick={()=>setMenu(v=>!v)} aria-label="Open navigation">{menu?<X size={19}/>:<Menu size={19}/>}</button><span>K4K Studio</span><span className="kd-breadcrumb-sep">/</span><strong>Home</strong></div><div className="kd-top-right"><Link href="/k4k-app/credits" className="kd-credit-link"><Coins size={15}/> Credits</Link><Link href="/k4k-app/account" className="kd-top-avatar" aria-label="Account settings">{name.substring(0,1).toUpperCase()}</Link></div></header>
   <div className="kd-content">
    <section className="kd-left">
     <div className="kd-eyebrow">GOOD {new Date().getHours()<12?'MORNING':new Date().getHours()<18?'AFTERNOON':'EVENING'}, {name.toUpperCase()} <span>✦</span></div>
     <h1>What will you<br/>create <em>today?</em></h1>
     <form className="kd-composer" onSubmit={e=>{e.preventDefault();create()}}>
      <label htmlFor="kd-prompt" className="kd-sr-only">Describe your creative idea</label>
      <textarea id="kd-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe a scene, a mood, or a creative idea…" rows={3}/>
      <div className="kd-compose-bottom">
       <div className="kd-kind" role="group" aria-label="Creation type"><button type="button" className={kind==='image'?'selected':''} onClick={()=>setKind('image')}><ImageIcon size={14}/> Image</button><button type="button" className={kind==='video'?'selected':''} onClick={()=>setKind('video')}><Film size={14}/> Video</button><button type="button" className={kind==='motion'?'selected':''} onClick={()=>setKind('motion')}><Clapperboard size={14}/> Motion</button></div>
       <button className="kd-generate" type="submit"><Plus size={15}/> Open studio <ArrowUpRight size={15}/></button>
      </div>
     </form>
     <div className="kd-quick-grid">{categories.map(({label,detail,href,icon:Icon})=><Link href={href} className="kd-quick-card" key={label}><Icon size={19}/><strong>{label}</strong><small>{detail}</small><ArrowUpRight className="kd-quick-arrow" size={15}/></Link>)}</div>
     <div className="kd-section-head"><div><h2>Recent projects</h2><p>Your private image and video creations</p></div><Link href="/k4k-app/videos">View all <ArrowRight size={15}/></Link></div>
     <div className="kd-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your projects" aria-label="Search recent projects"/></div>
     {loading?<div className="kd-empty"><LoaderCircle className="kd-spinner"/>Loading your projects…</div>:loadError?<div className="kd-empty" role="alert">{loadError} <button onClick={()=>window.location.reload()} type="button">Retry</button></div>:visible.length?<div className="kd-project-grid">{visible.map((job,i)=><article className={'kd-project kd-project-'+(i%4)} key={job.id}><div className="kd-project-art"><span>{job.media_kind==='image'?'IMAGE':'VIDEO'}</span>{job.status==='completed'?<ImageIcon size={30}/>:<Clock3 size={30}/>}</div><div className="kd-project-info"><strong>{labels[job.model]||'K4K creation'}</strong><small>{new Date(job.created_at).toLocaleDateString()} · {job.credits_quoted} credits</small><span className="kd-project-status">{job.status==='completed'?'Completed':job.status==='processing'||job.status==='queued'?'Processing':job.status==='failed'?'Failed':job.status}</span></div></article>)}</div>:<div className="kd-empty"><FolderOpen size={25}/><strong>No projects yet</strong><span>Your generated projects will appear here after your first creation.</span><Link href="/k4k-app/create">Create your first project <ArrowUpRight size={14}/></Link></div>}
     <div className="kd-section-head kd-template-title"><div><h2>Trending templates</h2><p>Explore ready-to-recreate video ideas</p></div><Link href="/k4k-app/motion/explore">Browse all <ArrowRight size={15}/></Link></div>
     <div className="kd-template-grid">{templates.slice(0,4).map(t=><Link key={t.id} href={'/k4k-app/motion?template='+encodeURIComponent(t.id)} className="kd-template"><video src={t.videoUrl} poster={t.posterUrl||undefined} muted playsInline preload="metadata"/><div><strong>{t.title}</strong><span>{Math.round(t.durationSeconds)}s · K4K Motion</span></div><Play size={15}/></Link>)}</div>
    </section>
    <aside className="kd-right" aria-label="Studio activity">
     <div className="kd-panel"><div className="kd-panel-head"><h2>Render queue</h2><Link href="/k4k-app/videos">Open library <ArrowUpRight size={14}/></Link></div>
      {loading?<p className="kd-muted">Checking your generations…</p>:active.length?<div className="kd-queue">{active.slice(0,4).map(job=><div key={job.id} className="kd-queue-item"><div className="kd-queue-icon"><LoaderCircle size={18} className="kd-spinner"/></div><div><strong>{labels[job.model]||'K4K generation'}</strong><small>Processing · {job.credits_quoted} credits</small></div></div>)}</div>:<div className="kd-queue-empty"><ShieldCheck size={24}/><strong>Queue clear</strong><span>No active image or video generations.</span></div>}
      <Link className="kd-panel-button" href="/k4k-app/videos">View generations <ArrowUpRight size={14}/></Link></div>
     <div className="kd-panel kd-summary"><div className="kd-panel-head"><h2>Your workspace</h2><span>ACCOUNT</span></div><div className="kd-stat"><strong>{loading?'—':projects.length}</strong><span>Recent generations</span></div><div className="kd-stat"><strong>{loading?'—':projects.filter(p=>p.status==='completed').length}</strong><span>Completed</span></div><p>Counts reflect the private image and video jobs returned by your account. Motion projects are available in the video library.</p></div>
     <div className="kd-panel"><div className="kd-panel-head"><h2>Start creating</h2><Sparkles size={17}/></div><p className="kd-muted">Choose the right tool for your next creative project.</p><div className="kd-right-links"><Link href="/k4k-app/image">Image Studio <ArrowUpRight size={16}/></Link><Link href="/k4k-app/video">Video Studio <ArrowUpRight size={16}/></Link><Link href="/k4k-app/motion">K4K Motion <ArrowUpRight size={16}/></Link></div></div>
    </aside>
   </div>
  </div>
 </div>;
}
