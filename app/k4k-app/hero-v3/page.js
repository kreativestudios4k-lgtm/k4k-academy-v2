'use client';
// K4K full-screen hero, built to the supplied spec.
import {useEffect,useRef} from 'react';
import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
import './hero-v3.css';

// Background loop: three K4K-owned clips played in sequence, then repeated.
// The files live in public/videos/ alongside the template clips. Until they are
// committed the hero falls back to the poster still rather than a black frame.
const CLIPS=['/videos/k4k-hero-1.mp4','/videos/k4k-hero-2.mp4','/videos/k4k-hero-3.mp4'];
const FADE=500;
const GAP=100;

const NAV=[{label:'Features',caret:true},{label:'Solutions'},{label:'Plans',href:'/k4k-app/credits'},{label:'Learning',caret:true,href:'/academy'}];
// Real models from the K4K catalogue rather than invented client brands.
const MARQUEE=['Motion','Wan 3','Seedance','Kling','FLUX','GPT Image','Nano Banana'];

export default function HeroV3(){
 const videoRef=useRef(null);

 // 0.5s fade in, 0.5s fade out, driven by rAF against the video clock. On ended:
 // hold black for 100ms, then play the next clip in the list and wrap around.
 useEffect(()=>{
  const video=videoRef.current;
  if(!video||!CLIPS.length)return;
  // Reduced motion: leave the poster showing and cancel the download.
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   video.removeAttribute('src');
   video.load();
   return;
  }

  let index=0,frame=0,misses=0,timer=0,stopped=false;

  const tick=()=>{
   if(stopped)return;
   const {currentTime:t,duration:d}=video;
   if(Number.isFinite(d)&&d>0){
    const rising=Math.min(1,t*1000/FADE);
    const falling=Math.min(1,Math.max(0,(d-t)*1000/FADE));
    video.style.opacity=String(Math.max(0,Math.min(rising,falling)));
   }
   frame=requestAnimationFrame(tick);
  };

  // Warm the next clip while this one plays so the swap does not stall.
  const warm=()=>{
   if(CLIPS.length<2)return;
   fetch(CLIPS[(index+1)%CLIPS.length],{cache:'force-cache'}).catch(()=>{});
  };

  const play=i=>{
   index=i;
   video.src=CLIPS[index];
   video.play().catch(()=>{});
  };

  const onPlay=()=>{
   misses=0;
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(tick);
   warm();
  };

  const onEnded=()=>{
   cancelAnimationFrame(frame);
   video.style.opacity='0';
   timer=window.setTimeout(()=>{
    if(stopped)return;
    if(CLIPS.length<2){video.currentTime=0;video.play().catch(()=>{});return}
    play((index+1)%CLIPS.length);
   },GAP);
  };

  // A clip that cannot load is skipped instead of sitting on screen as a dead
  // frame. Once every clip has failed, stop and leave the poster showing.
  const onError=()=>{
   cancelAnimationFrame(frame);
   video.style.opacity='0';
   misses+=1;
   if(misses>=CLIPS.length||CLIPS.length<2)return;
   play((index+1)%CLIPS.length);
  };

  video.addEventListener('play',onPlay);
  video.addEventListener('ended',onEnded);
  video.addEventListener('error',onError);
  video.play().catch(()=>{});

  return()=>{
   stopped=true;
   cancelAnimationFrame(frame);
   window.clearTimeout(timer);
   video.removeEventListener('play',onPlay);
   video.removeEventListener('ended',onEnded);
   video.removeEventListener('error',onError);
  };
 },[]);

 return <div className="h3">
  <div className="h3-bg" aria-hidden="true"/>
  <video ref={videoRef} className="h3-video" src={CLIPS[0]} muted playsInline preload="auto" aria-hidden="true"/>

  <div className="h3-shell">
   <div className="h3-blur" aria-hidden="true"/>

   <div className="h3-bar">
    <Link href="/" className="h3-brand" aria-label="K4K APP">
     <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="2.6" y="2.6" width="6" height="18.8" rx="2.4"/>
      <path d="M11.2 12 20.6 2.6h-5.1L10.4 8.6v6.8l5.1 6h5.1z"/>
     </svg>
     K4K
    </Link>

    <nav className="h3-nav" aria-label="Primary">
     {NAV.map(item=>item.href
      ?<Link key={item.label} href={item.href}><button type="button">{item.label}{item.caret&&<ChevronDown size={15}/>}</button></Link>
      :<button type="button" key={item.label}>{item.label}{item.caret&&<ChevronDown size={15}/>}</button>)}
    </nav>

    <Link href="/k4k-app/register?plan=starter" className="h3-signup liquid-glass">Sign Up</Link>
   </div>
   <div className="h3-rule" aria-hidden="true"/>

   <main className="h3-mid">
    <div className="h3-copy">
     <h1 className="h3-title">
      <span>Don&rsquo;t follow</span>
      <span>the trend.</span>
      <em>Create it.</em>
     </h1>
     <p className="h3-sub">Your ideas. Your characters. Your next viral creation.</p>
     <Link href="/k4k-app/studio" className="h3-cta liquid-glass">Start creating</Link>
    </div>
   </main>

   <div className="h3-foot">
    <div className="h3-foot-in">
     <p className="h3-foot-label">Models in the<br/>K4K studio</p>
     <div className="h3-marquee">
      <div className="h3-track">
       {[...MARQUEE,...MARQUEE].map((name,i)=><span className="h3-item" key={name+i}>
        <span className="h3-chip liquid-glass" aria-hidden="true">{name[0]}</span>
        <span>{name}</span>
       </span>)}
      </div>
     </div>
    </div>
   </div>
  </div>
 </div>;
}
