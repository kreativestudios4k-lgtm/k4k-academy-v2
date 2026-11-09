'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import catalogue from './template-catalogue.json';
import {useK4KLocale} from './locale';

const library=[...catalogue.trending,...catalogue.topPerforming].filter(x=>x.videoUrl);
const words={
 en:{trending:'Trending',all:'View all',photos:'photo',tips:'Tips',use:'Use this template',home:'Home',videos:'Videos',creator:'Creator',credits:'Credits',account:'Account',exclusive:'K4K Original',how:'How it works',step1:'Upload one clear, front-facing photo per person.',step2:'Select Use this template to prepare your creation.',step3:'The output can vary from the reference. Only use photos you have permission to use.',notice:'AI generation is not enabled yet. No credits are charged for previewing templates.',close:'Close tips',people:'people'},
 pt:{trending:'Em alta',all:'Ver todos',photos:'foto',tips:'Dicas',use:'Usar este template',home:'Início',videos:'Vídeos',creator:'Criador',credits:'Créditos',account:'Entrar',exclusive:'Original K4K',how:'Como funciona',step1:'Envie uma foto nítida e de frente por pessoa.',step2:'Toque em Usar este template para preparar sua criação.',step3:'O resultado pode variar. Use apenas fotos autorizadas.',notice:'A geração de IA ainda não está ativa. Nenhum crédito é cobrado na prévia.',close:'Fechar dicas',people:'pessoas'},
 es:{trending:'Tendencias',all:'Ver todos',photos:'foto',tips:'Consejos',use:'Usar esta plantilla',home:'Inicio',videos:'Vídeos',creator:'Creador',credits:'Créditos',account:'Cuenta',exclusive:'Original K4K',how:'Cómo funciona',step1:'Sube una foto clara y frontal por persona.',step2:'Toca Usar esta plantilla para preparar tu creación.',step3:'El resultado puede variar. Usa solo fotos autorizadas.',notice:'La generación de IA todavía no está activa. La vista previa no consume créditos.',close:'Cerrar consejos',people:'personas'}
};
export default function MobileTemplateFeed(){
 const {locale}=useK4KLocale(),t=words[locale]||words.en;
 const [mode,setMode]=useState('trending'),[active,setActive]=useState(0),[audio,setAudio]=useState(false),[tips,setTips]=useState(false),[failed,setFailed]=useState({});
 const scroll=useRef(null),videos=useRef(new Map());
 const list=mode==='trending'?library.slice(0,10):library;
 const selected=list[Math.min(active,list.length-1)];
 const requiredPhotos=item=>Math.max(1,Math.min(30,Number(item.requiredImages||item.peopleCount||item.charactersCount||1)));
 useEffect(()=>{const root=scroll.current;if(!root)return;const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>=.65)setActive(Number(entry.target.dataset.slide));},{root,threshold:[.65]});root.querySelectorAll('[data-slide]').forEach(el=>observer.observe(el));return()=>observer.disconnect();},[mode]);
 useEffect(()=>{videos.current.forEach((video,i)=>{if(!video)return;const playing=i===active&&!tips;video.muted=!playing||!audio;if(playing)video.play().catch(()=>{});else video.pause();});},[active,audio,tips,mode]);
 useEffect(()=>{if(!tips)return;const onKey=e=>{if(e.key==='Escape')setTips(false)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[tips]);
 function setTab(next){setMode(next);setActive(0);setAudio(false);videos.current.forEach(v=>v?.pause());videos.current.clear();setFailed({});scroll.current?.scrollTo({top:0});}
 if(!library.length)return <div className="k4k-reels-empty">No video templates available.</div>;
 return <div className="k4k-reels">
  <header className="k4k-reels-header"><Link href="/k4k-app" className="k4k-reels-logo"><img src="/k4k-mark.svg" width="32" height="32" alt="" /><span>K4K <b>APP</b><small>CREATE · SWAP · GENERATE</small></span></Link><div className="k4k-reels-tabs"><button className={mode==='trending'?'active':''} onClick={()=>setTab('trending')} aria-pressed={mode==='trending'}>{t.trending}</button><button className={mode==='all'?'active':''} onClick={()=>setTab('all')} aria-pressed={mode==='all'}>{t.all}</button></div></header>
  <main className="k4k-reels-scroll" ref={scroll}>
   {list.map((item,i)=><section className="k4k-reels-slide" data-slide={i} key={item.id} aria-label={item.title}>
    <video ref={el=>{if(el)videos.current.set(i,el);else videos.current.delete(i)}} src={item.videoUrl} poster={item.posterUrl||undefined} muted loop playsInline preload={Math.abs(i-active)<=1?'auto':'none'} onError={()=>setFailed(prev=>({...prev,[item.id]:true}))} onLoadedData={()=>setFailed(prev=>({...prev,[item.id]:false}))} onClick={()=>{setAudio(x=>!x);videos.current.get(i)?.play().catch(()=>{});}} aria-label={'Tap to toggle sound for '+item.title}/>
    {failed[item.id]&&<div className="k4k-reels-video-status" role="status">Video unavailable. Swipe to another template or try again later.</div>}
    <div className="k4k-reels-overlay"/>
    {active===i&&<span className="k4k-reels-sound" aria-hidden="true">{audio?'♪':'♪̸'}</span>}
    <aside className="k4k-reels-actions"><div><span aria-hidden="true">♙</span>{requiredPhotos(item)} {t.photos}{requiredPhotos(item)>1?'s':''}</div><button onClick={()=>setTips(true)}><span aria-hidden="true">ⓘ</span>{t.tips}</button></aside>
    <div className="k4k-reels-caption"><span className="k4k-reels-badge">✦ {t.exclusive}</span><h1>{item.title}</h1><p>{Math.round(item.durationSeconds||10)}s · {requiredPhotos(item)} {t.people}</p><Link href={'/k4k-app/template/'+encodeURIComponent(item.id)} className="k4k-reels-cta">✦ {t.use}</Link></div>
   </section>)}
  </main>
  <nav className="k4k-reels-nav" aria-label="Main navigation"><Link href="/k4k-app" aria-current="page"><span>⌂</span>{t.home}</Link><Link href="/k4k-app/videos"><span>▦</span>{t.videos}</Link><Link href="/k4k-app/creator" className="k4k-reels-create"><span>✦</span>{t.creator}</Link><Link href="/k4k-app/credits"><span>◎</span>{t.credits}</Link><Link href="/k4k-app/account"><span>♙</span>{t.account}</Link></nav>
  {tips&&<div className="k4k-reels-modal-backdrop" onClick={()=>setTips(false)}><section role="dialog" aria-modal="true" aria-labelledby="k4k-reels-dialog-title" className="k4k-reels-modal" onClick={e=>e.stopPropagation()}><button className="k4k-reels-close" aria-label={t.close} onClick={()=>setTips(false)}>×</button><h2 id="k4k-reels-dialog-title">{t.tips} · {selected?.title}</h2><h3>{t.how}</h3><ol><li>{t.step1}</li><li>{t.step2}</li><li>{t.step3}</li></ol><p>{t.notice}</p></section></div>}
 </div>;
}
