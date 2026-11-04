'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import catalogue from './template-catalogue.json';
import {useK4KLocale,labels} from './locale';
const items=[...catalogue.topPerforming.map(x=>({...x,category:'Top Performing'})),...catalogue.trending.map(x=>({...x,category:'Trending Now'}))];
const prettyViews=n=>n>=1000000?(n/1000000).toFixed(1).replace(/\\.0$/,'')+'M':n.toLocaleString('en-GB');
export default function MobileTemplateFeed(){const {locale}=useK4KLocale();const tr=labels[locale]||labels.en;
 const [active,setActive]=useState(0),[muted,setMuted]=useState(true),[showInfo,setShowInfo]=useState(false),[filter,setFilter]=useState('Trending Now');
 const videos=useRef([]),scroller=useRef(null);
 const visible=items.filter(item=>filter==='All'||item.category===filter);
 useEffect(()=>{videos.current.forEach((video,i)=>{if(!video)return;video.muted=i!==active||muted;if(i===active)video.play().catch(()=>{});else video.pause();});},[muted,active,filter]);
 function selectFilter(value){setFilter(value);setActive(0);setShowInfo(false);if(scroller.current)scroller.current.scrollTop=0;}
 function onScroll(event){const el=event.currentTarget;const index=Math.max(0,Math.min(visible.length-1,Math.round(el.scrollTop/el.clientHeight)));if(index!==active){setActive(index);setShowInfo(false);}}
 return <div className="k4k-mobile-feed">
 <header className="k4k-feed-top"><Link href="/k4k-app" className="k4k-feed-brand">✦ K4K <b>APP</b></Link><div className="k4k-feed-tabs"><button type="button" className={filter==='Trending Now'?'is-active':''} onClick={()=>selectFilter('Trending Now')}>{tr.Trending}</button><button type="button" className={filter==='Top Performing'?'is-active':''} onClick={()=>selectFilter('Top Performing')}>{tr.Top}</button><button type="button" className={filter==='All'?'is-active':''} onClick={()=>selectFilter('All')}>{tr.All}</button></div></header>
 <div className="k4k-feed-scroll" ref={scroller} onScroll={onScroll}>
 {visible.map((item,index)=><section className="k4k-feed-slide" key={item.id}>
 {item.videoUrl?<video ref={el=>{videos.current[index]=el}} className="k4k-feed-video" onClick={e=>{e.currentTarget.muted=false;setMuted(false);e.currentTarget.play().catch(()=>{});}} poster={item.posterUrl||undefined} src={item.videoUrl} autoPlay={index===0} muted={muted} loop playsInline preload={index<2?'metadata':'none'} aria-label={item.title}/>:<div className="k4k-feed-pending"><span>✦</span><strong>{item.title}</strong><small>Video preview being prepared</small></div>}
 <div className="k4k-feed-shade"/>
 <div className="k4k-feed-actions"><button type="button" onClick={()=>setShowInfo(x=>!x)} aria-label="Template details">ⓘ<small>{tr.Info}</small></button></div>
 {showInfo&&index===active&&<div className="k4k-feed-info"><strong>{item.title}</strong><p>{item.views?`${prettyViews(item.views)} views on ${item.platform}. `:''}This video has been submitted for the K4K template catalogue. Media hosting and character generation are not connected yet.</p><button type="button" onClick={()=>setShowInfo(false)}>{tr.Close}</button></div>}
 <div className="k4k-feed-bottom"><span className="k4k-feed-pill">✦ {item.category==='Top Performing'?'TOP VIEWED':'TRENDING'}</span><h2>{item.title}</h2><p>{item.views?`${prettyViews(item.views)} ${item.platform} views`:'Trending video reference'}</p><div className="k4k-feed-meta">{item.durationSeconds?item.durationSeconds+'s · ':''}K4K APP template</div><Link className="k4k-feed-cta" href={`/k4k-app/template/${item.id}`}>✦ {tr.Use}</Link></div>
 </section>)}
 </div>
 <nav className="k4k-feed-nav" aria-label="Navigation"><Link href="/k4k-app" className="selected"><span>⌂</span>Home</Link><Link href="/k4k-app/videos"><span>▦</span>Videos</Link><Link className="k4k-feed-create" href="/k4k-app/creator"><span>✦</span>Creator</Link><Link href="/k4k-app/credits"><span>◎</span>Credits</Link><Link href="/k4k-app/account"><span>♙</span>Account</Link></nav>
 </div>;
}