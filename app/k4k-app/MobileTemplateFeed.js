'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import catalogue from './template-catalogue.json';
const items=[...catalogue.topPerforming.map(x=>({...x,category:'Top Performing'})),...catalogue.trending.map(x=>({...x,category:'Trending Now'}))];
const prettyViews=n=>n>=1000000?(n/1000000).toFixed(1).replace(/\\.0$/,'')+'M':n.toLocaleString('en-GB');
export default function MobileTemplateFeed(){
 const [active,setActive]=useState(0),[muted,setMuted]=useState(true),[showInfo,setShowInfo]=useState(false),[filter,setFilter]=useState('All');
 const videos=useRef([]),scroller=useRef(null);
 const visible=items.filter(item=>filter==='All'||item.category===filter);
 useEffect(()=>{videos.current.forEach((video,i)=>{if(!video)return;video.muted=i!==active||muted;if(i===active)video.play().catch(()=>{});else video.pause();});},[muted,active,filter]);
 function selectFilter(value){setFilter(value);setActive(0);setShowInfo(false);if(scroller.current)scroller.current.scrollTop=0;}
 function onScroll(event){const el=event.currentTarget;const index=Math.max(0,Math.min(visible.length-1,Math.round(el.scrollTop/el.clientHeight)));if(index!==active){setActive(index);setShowInfo(false);}}
 return <div className="k4k-mobile-feed">
 <header className="k4k-feed-top"><Link href="/k4k-app" className="k4k-feed-brand">✦ K4K <b>MOTION</b></Link><div className="k4k-feed-tabs"><button type="button" className={filter==='All'?'is-active':''} onClick={()=>selectFilter('All')}>Trending</button><button type="button" className={filter==='Top Performing'?'is-active':''} onClick={()=>selectFilter('Top Performing')}>Top Viewed</button><button type="button" className={filter==='Trending Now'?'is-active':''} onClick={()=>selectFilter('Trending Now')}>View All</button></div></header>
 <div className="k4k-feed-scroll" ref={scroller} onScroll={onScroll}>
 {visible.map((item,index)=><section className="k4k-feed-slide" key={item.id}>
 {item.videoUrl?<video ref={el=>{videos.current[index]=el}} className="k4k-feed-video" poster={item.posterUrl||undefined} src={item.videoUrl} autoPlay={index===0} muted={muted} loop playsInline preload={index<2?'metadata':'none'} aria-label={item.title}/>:<div className="k4k-feed-pending"><span>✦</span><strong>{item.title}</strong><small>Video preview being prepared</small></div>}
 <div className="k4k-feed-shade"/>
 <div className="k4k-feed-actions">{item.videoUrl&&<button type="button" onClick={()=>setMuted(x=>!x)} aria-label={muted?'Turn sound on':'Mute video'}>{muted?'🔇':'🔊'}</button>}<button type="button" onClick={()=>setShowInfo(x=>!x)} aria-label="Template details">ⓘ<small>Info</small></button></div>
 {showInfo&&index===active&&<div className="k4k-feed-info"><strong>{item.title}</strong><p>{item.views?`${prettyViews(item.views)} views on ${item.platform}. `:''}This video has been submitted for the K4K template catalogue. Media hosting and character generation are not connected yet.</p><button type="button" onClick={()=>setShowInfo(false)}>Close</button></div>}
 <div className="k4k-feed-bottom"><span className="k4k-feed-pill">✦ {item.category==='Top Performing'?'TOP VIEWED':'TRENDING'}</span><h2>{item.title}</h2><p>{item.views?`${prettyViews(item.views)} ${item.platform} views`:'Trending video reference'}</p><div className="k4k-feed-meta">{item.durationSeconds?item.durationSeconds+'s · ':''}K4K Motion template</div><Link className="k4k-feed-cta" href="/create">✦ Explore K4K Motion</Link></div>
 </section>)}
 </div>
 <nav className="k4k-feed-nav" aria-label="Navigation"><Link href="/k4k-app" className="selected"><span>⌂</span>Home</Link><Link href="/create"><span>▦</span>Videos</Link><Link className="k4k-feed-create" href="/create"><span>✦</span>Create</Link><Link href="/creator-beta/pricing"><span>◎</span>Credits</Link><Link href="/academy"><span>♙</span>Login</Link></nav>
 </div>;
}