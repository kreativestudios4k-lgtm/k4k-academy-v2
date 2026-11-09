'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import PreviewShell from '../PreviewShell';
import {createClient} from '../../../lib/supabase/client';
import {useK4KLocale} from '../locale';

const DATE_LOCALES={en:'en-GB',pt:'pt-BR',es:'es-ES'};
export default function Videos(){
 const {locale}=useK4KLocale();
 const [jobs,setJobs]=useState([]);
 const [loading,setLoading]=useState(true);
 const [signedIn,setSignedIn]=useState(false);
 const [error,setError]=useState('');
 const refresh=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const client=createClient();
   const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user){setSignedIn(false);setJobs([]);return;}
   setSignedIn(true);
   const {data,error:queryError}=await client.from('studio_generation_jobs')
    .select('id,status,model,provider,template_id,created_at,updated_at,credits_reserved')
    .eq('user_id',user.id).order('created_at',{ascending:false}).limit(30);
   if(queryError)throw queryError;
   setJobs(data||[]);
  }catch{
   setError('We could not load your projects. Please try again.');
  }finally{setLoading(false);}
 },[]);
 useEffect(()=>{refresh();},[refresh]);
 const isPt=locale==='pt',isEs=locale==='es';
 const title=isPt?'Seus projetos':isEs?'Tus proyectos':'Your projects';
 return <PreviewShell active="Videos">
  <div className="k4k-workspace-heading"><div><span className="k4k-workspace-eyebrow">K4K APP / WORKSPACE</span><h1>{title}</h1><p>{isPt?'Rascunhos e histórico de criação vinculados à sua conta.':isEs?'Borradores e trabajos vinculados a tu cuenta.':'Your saved drafts and creation activity, connected to your account.'}</p></div><button type="button" className="k4k-workspace-refresh" onClick={refresh} disabled={loading}>{loading?'Loading…':'Refresh'}</button></div>
  {!loading&&!signedIn?<section className="k4k-card"><h2>Sign in to access your work</h2><p>Your projects are private to your K4K account.</p><Link href="/login?next=%2Fk4k-app%2Fvideos" className="k4k-black">Sign in</Link><p>New here? <Link href="/k4k-app/register">Create an account</Link></p></section>:null}
  {error&&<p role="alert" className="k4k-workspace-error">{error}</p>}
  {loading?<section className="k4k-card" role="status">Loading your projects…</section>:signedIn&&!error&&jobs.length===0?<section className="k4k-card"><h2>No projects yet</h2><p>Choose a template or prepare your first draft. Saved jobs will appear here.</p><Link href="/k4k-app/creator" className="k4k-black">Open Creator Studio</Link></section>:null}
  {signedIn&&!loading&&jobs.length>0?<section aria-label="Your creation history">{jobs.map(job=><article className="k4k-card k4k-project" key={job.id}><div><span className="k4k-workspace-eyebrow">{job.template_id||'CREATOR WORKSPACE'}</span><h2>{job.model||'Video project'}</h2><p>Created {new Date(job.created_at).toLocaleDateString(DATE_LOCALES[locale]||'en-GB',{year:'numeric',month:'short',day:'numeric'})}</p></div><div className="k4k-project-state"><span>{job.status||'Unknown status'}</span><small>{job.credits_reserved?job.credits_reserved+' credits reserved':'No credits reserved'}</small></div></article>)}</section>:null}
  <section className="k4k-card"><h2>Keep creating</h2><p>Start a new video, explore templates or manage your account without losing your place.</p><div className="k4k-workspace-actions"><Link href="/k4k-app/creator">Open Creator</Link><Link href="/k4k-app">Explore templates</Link><Link href="/k4k-app/support">Get help</Link></div><p><small>Projects display saved job records. Downloadable videos will appear only when storage and generation have been verified. No charges are triggered here.</small></p></section>
 </PreviewShell>;
}
