'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
const templates=[
 {name:'Squad Anthem',description:'Put your squad in the spotlight.',people:4,seconds:null,tag:'FEATURED'},
 {name:'The Arrival',description:'Make an unforgettable entrance.',people:1,seconds:null,tag:'TRENDING'},
 {name:'Touchline Energy',description:'Bring your character to the action.',people:1,seconds:null,tag:'TRENDING'},
 {name:'Celebration Crew',description:'Your friends. Your celebration.',people:4,seconds:null,tag:'POPULAR'},
 {name:'Money Spread',description:'Turn a moment into your own story.',people:1,seconds:null,tag:'TRENDING'},
 {name:'The Boss',description:'Take the lead in the scene.',people:1,seconds:null,tag:'POPULAR'},
 {name:'Press Room',description:'Your character in the headlines.',people:1,seconds:null,tag:'TRENDING'},
 {name:'Metro Entrance',description:'Own the entrance.',people:1,seconds:null,tag:'NEW'},
 {name:'The Meeting',description:'The viral meeting that reached 2.2M Instagram views.',people:3,seconds:10,tag:'2.2M VIEWS',instagramViews:2210238},
 {name:'Training Ground',description:'Your next viral sports moment.',people:1,seconds:null,tag:'NEW'}
];
export default function MobileTemplateFeed(){
 const [active,setActive]=useState(0),[muted,setMuted]=useState(true),[showInfo,setShowInfo]=useState(false);
 const videos=useRef([]);
 useEffect(()=>{videos.current.forEach((video,i)=>{if(video)video.muted=(i!==active)||muted;});},[muted,active]);
 function onScroll(event){const el=event.currentTarget;const index=Math.max(0,Math.min(templates.length-1,Math.round(el.scrollTop/el.clientHeight)));if(index!==active){setActive(index);setShowInfo(false);}videos.current.forEach((video,i)=>{if(!video)return;if(i===index){video.muted=muted;video.play().catch(()=>{});}else video.pause();});}
 return <div className="k4k-mobile-feed">
 <div className="k4k-feed-top"><Link href="/k4k-app" className="k4k-feed-brand">✦ K4K <b>MOTION</b></Link><div className="k4k-feed-tabs"><span className="is-active">Trending</span><Link href="/create">View all</Link></div></div>
 <div className="k4k-feed-scroll" onScroll={onScroll}>
 {templates.map((item,index)=><section className="k4k-feed-slide" key={item.name}>
 <video ref={el=>{videos.current[index]=el}} className="k4k-feed-video" poster={`/videos/template-${index}.webp`} src={`/videos/template-${index}.mp4`} autoPlay={index===0} muted={muted} loop playsInline preload={index<2?'metadata':'none'} aria-label={item.name}/>
 <div className="k4k-feed-shade"/>
 <div className="k4k-feed-actions"><button type="button" onClick={()=>setMuted(x=>!x)} aria-label={muted?'Turn sound on':'Mute video'}>{muted?'🔇':'🔊'}</button><button type="button" onClick={()=>setShowInfo(x=>!x)} aria-label="Template details">ⓘ<small>Tips</small></button><Link href={`/create?template=${index}`} aria-label="Add character photos">♙<small>{item.people} photo{item.people===1?'':'s'}</small></Link></div>
 {showInfo&&index===active&&<div className="k4k-feed-info"><strong>How it works</strong><p>Choose this template, add your character reference photos, and prepare your scene in K4K Motion. AI generation is not yet enabled.</p><button type="button" onClick={()=>setShowInfo(false)}>Close</button></div>}
 <div className="k4k-feed-bottom"><span className="k4k-feed-pill">✦ {item.tag}</span><h2>{item.name}</h2><p>{item.description}</p><div className="k4k-feed-meta">{item.instagramViews?item.instagramViews.toLocaleString('en-GB')+' Instagram views · ':''}{item.people} character photo{item.people===1?'':'s'} · {item.seconds?item.seconds+'s · ':''}Video template</div><Link className="k4k-feed-cta" href={`/create?template=${index}`}>✦ Use this template</Link></div>
 </section>)}
 </div>
 <nav className="k4k-feed-nav" aria-label="Mobile navigation"><Link href="/k4k-app" className="selected"><span>⌂</span>Home</Link><Link href="/create"><span>▦</span>Videos</Link><Link className="k4k-feed-create" href="/create"><span>✦</span>Create</Link><Link href="/creator-beta/pricing"><span>◎</span>Credits</Link><Link href="/academy"><span>♙</span>Login</Link></nav>
 </div>;
}