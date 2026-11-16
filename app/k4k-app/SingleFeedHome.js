'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Home,Film,Sparkles,Coins,UserRound,Info,ChevronUp,ChevronDown,Globe2,Menu,X} from 'lucide-react';
import catalogue from './template-catalogue.json';
import {useK4KLocale} from './locale';
import {useVerifiedAccount} from './useVerifiedAccount';
import AccountMenu from './AccountMenu';
import EarlyFreeOffer from './EarlyFreeOffer';
import LaunchAuthDialog from './LaunchAuthDialog';
import TemplateCreateSheet from './TemplateCreateSheet';
import {motionCreditPreview} from '../../lib/generation-experience.mjs';
import './cinematic-launch.css';
import './single-feed-home.css';
const all=[...new Map([...catalogue.discoveryPreviews,...catalogue.trending,...catalogue.topPerforming].filter(x=>x.videoUrl).map(x=>[x.id,x])).values()];
const trending=all.slice(0,10);
export default function SingleFeedHome(){
 const {locale,changeLocale}=useK4KLocale();const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const {user,ready}=useVerifiedAccount();
 const [tab,setTab]=useState('trending'),[index,setIndex]=useState(0),[muted,setMuted]=useState(true),[paused,setPaused]=useState(false),[tips,setTips]=useState(false),[auth,setAuth]=useState(false),[menu,setMenu]=useState(false),[create,setCreate]=useState(null),[failed,setFailed]=useState(false);
 const video=useRef(null),touch=useRef(null),dialog=useRef(null);
 const list=tab==='trending'?trending:all;
 const item=list[index]||list[0];
 const usable=item.durationSeconds>=2&&item.durationSeconds<=15;
 const photos=item.requiredImages||item.peopleCount;
 let quote=null;try{if(usable)quote=motionCreditPreview('lite',item.durationSeconds).credits}catch{}
 useEffect(()=>{if(location.hash==='#plans')location.replace('/k4k-app/credits');const m=matchMedia('(prefers-reduced-motion: reduce)');if(m.matches)setPaused(true)},[]);
 useEffect(()=>{const el=video.current;if(!el)return;el.muted=muted;if(paused||tips||auth||create||menu)el.pause();else el.play().catch(()=>{});},[item.id,muted,paused,tips,auth,create,menu]);
 useEffect(()=>{const change=()=>{if(document.visibilityState==='hidden')video.current?.pause();else if(!paused&&!tips&&!auth&&!create&&!menu)video.current?.play().catch(()=>{})};document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change)},[paused,tips,auth,create,menu]);
 useEffect(()=>{if(tips&&!dialog.current?.open)dialog.current?.showModal();else if(!tips&&dialog.current?.open)dialog.current.close()},[tips]);
 function move(delta){setIndex(i=>Math.max(0,Math.min(list.length-1,i+delta)));setFailed(false)}
 function changeTab(next){setTab(next);setIndex(0);setFailed(false)}
 function sound(){const el=video.current;if(!el)return;const next=!el.muted;el.muted=next;setMuted(next);if(!paused)el.play().catch(()=>{el.muted=true;setMuted(true)})}
 function start(){if(!ready)return;if(!user){setAuth(true);return}if(usable)setCreate(item)}
 const nav=[{href:'/',icon:Home,label:tr('Home','Início','Inicio'),home:true},{href:'/k4k-app/videos',icon:Film,label:tr('Videos','Vídeos','Vídeos')},{href:'/k4k-app/creator',icon:Sparkles,label:tr('Creator','Criador','Creador'),special:true},{href:'/k4k-app/credits',icon:Coins,label:tr('Credits','Créditos','Créditos')},{href:user?'/k4k-app/account':'/login?next=%2Fk4k-app%2Faccount',icon:UserRound,label:user?tr('Account','Conta','Cuenta'):tr('Sign in','Entrar','Entrar')}];
 return <div className="k4k-single-home kc-three">
 <div className="kc-abstract-motion" aria-hidden="true"><i/><i/><i/></div><div className="kc-abstract-logo" aria-hidden="true">K4K<span>APP</span></div><div className="kc-abstract-shade" aria-hidden="true"/>
 <div className="ksh-shell">
 <header className="ksh-header"><div className="ksh-top"><Link className="ksh-brand" href="/"><img src="/k4k-mark.svg" width="34" height="34" alt=""/><span>K4K APP<small>by KreativeStudios4K</small></span></Link><div className="ksh-header-actions"><label className="ksh-language"><Globe2 size={14}/><select aria-label={tr('Language','Idioma','Idioma')} value={locale} onChange={e=>changeLocale(e.target.value)}><option value="en">EN</option><option value="pt">PT</option><option value="es">ES</option></select></label>{user&&<AccountMenu user={user} key={user.id}/>}<button className="ksh-menu-button" type="button" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>{menu?<X size={20}/>:<Menu size={20}/>}</button></div></div>
 {menu&&<nav className="ksh-menu" aria-label="More navigation"><Link href="/k4k-app/credits">{tr('Prices','Preços','Precios')}</Link><Link href="/affiliates">{tr('Affiliates','Afiliados','Afiliados')}</Link><Link href="/k4k-app/support">{tr('Support','Suporte','Soporte')}</Link><Link href="/privacy">{tr('Privacy','Privacidade','Privacidad')}</Link><Link href="/terms">{tr('Terms','Termos','Términos')}</Link>{!user&&<button onClick={()=>{setMenu(false);setAuth(true)}}>{tr('Log in','Entrar','Iniciar sesión')}</button>}{!user&&<Link href="/k4k-app/register">{tr('Join K4K','Junte-se ao K4K','Únete a K4K')}</Link>}</nav>}
 <EarlyFreeOffer compact/><div className="ksh-tabs" role="group" aria-label="Video categories"><button type="button" aria-pressed={tab==='trending'} onClick={()=>changeTab('trending')}>{tr('Trending','Em alta','En tendencia')}</button><button type="button" aria-pressed={tab==='all'} onClick={()=>changeTab('all')}>{tr('View all','Ver todos','Ver todos')}</button></div></header>
 <main className="ksh-main" onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={e=>{if(!touch.current)return;const d=touch.current.y-e.changedTouches[0].clientY;const x=Math.abs(touch.current.x-e.changedTouches[0].clientX);if(Math.abs(d)>55&&Math.abs(d)>x)move(d>0?1:-1);touch.current=null}} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();move(e.key==='ArrowDown'?1:-1)}}} tabIndex={0}>
 <h1 className="ksh-hook ksh-hook-before">{tr("DON’T FOLLOW","NÃO SIGA","NO SIGAS")}</h1><div className="ksh-media"><video key={item.id} ref={video} src={item.videoUrl} poster={item.posterUrl||undefined} muted={muted} loop playsInline preload="metadata" aria-label={item.title+" — "+tr("Tap to toggle sound","Toque para alternar o som","Toca para activar o silenciar el sonido")} tabIndex={0} onClick={sound} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();sound()}else if(e.key.toLowerCase()==="p"){e.preventDefault();setPaused(v=>!v)}}} onError={()=>setFailed(true)}/><div className="ksh-shade" aria-hidden="true"/>
 {failed&&<div className="ksh-video-error" role="status">{tr('Video unavailable. Try another.','Vídeo indisponível. Tente outro.','Video no disponible. Prueba otro.')}</div>}
 <div className="ksh-side">{photos&&<span><UserRound size={23}/><small>{photos} {tr('photos','fotos','fotos')}</small></span>}<button type="button" onClick={()=>setTips(true)}><Info size={23}/><small>{tr('Tips','Dicas','Consejos')}</small></button><button type="button" disabled={index===0} onClick={()=>move(-1)} aria-label="Previous video"><ChevronUp size={24}/></button><button type="button" disabled={index===list.length-1} onClick={()=>move(1)} aria-label="Next video"><ChevronDown size={24}/></button></div>
 <div className="ksh-caption"><span className="ksh-tag"><Sparkles size={12}/> K4K ORIGINAL</span><h2>{item.title}</h2><p>{tr('Your imagination. Your next viral video.','Sua imaginação. Seu próximo vídeo viral.','Tu imaginación. Tu próximo video viral.')}</p></div></div>
 <div className="ksh-hook ksh-hook-after"><strong>{tr("THE TREND.","A TENDÊNCIA.","LA TENDENCIA.")}</strong><em>{tr("CREATE IT.","CRIE A SUA.","CRÉALA.")}</em></div>
 <div className="ksh-action"><div className="ksh-meta"><span>{Math.round(item.durationSeconds)}s{quote!==null?' · '+quote+' '+tr('estimated credits','créditos estimados','créditos estimados'):''}</span><span>{index+1} / {list.length}</span></div>{usable?<button type="button" className="ksh-cta" disabled={!ready} onClick={start}><Sparkles size={19}/>{tr('Use this template','Usar este template','Usar esta plantilla')}</button>:<Link className="ksh-cta" href="/k4k-app/creator"><Sparkles size={19}/>{tr('Create your version','Crie sua versão','Crea tu versión')}</Link>}<div className="ksh-progress" aria-hidden="true"><i style={{width:100*(index+1)/list.length+'%'}}/></div></div>
 </main>
 <nav className="ksh-nav" aria-label="Main navigation">{nav.map(n=><Link key={n.href} href={n.href} aria-current={n.home?'page':undefined} className={n.special?'ksh-nav-create':''}><span><n.icon size={23}/></span><small>{n.label}</small></Link>)}</nav>
 </div>
 <dialog ref={dialog} className="ksh-tips" onCancel={()=>setTips(false)}><button type="button" onClick={()=>setTips(false)} aria-label="Close"><X size={22}/></button><h2>{tr('Make it yours','Faça do seu jeito','Hazlo tuyo')}</h2><p>{tr('Use clear photos of your characters. Review the exact credit quote before generating. Only use photos you have permission to use.','Use fotos claras dos personagens. Confira o custo exato antes de gerar. Use apenas fotos autorizadas.','Usa fotos claras de tus personajes. Revisa el coste exacto antes de generar. Usa solo fotos autorizadas.')}</p></dialog>
 <LaunchAuthDialog open={auth} onClose={()=>setAuth(false)}/>
 {create&&<TemplateCreateSheet item={create} tr={tr} onClose={()=>setCreate(null)}/>}
 </div>
}
