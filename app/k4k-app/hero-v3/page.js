'use client';
// K4K full-screen hero, built to the supplied spec.
import {useEffect,useRef} from 'react';
import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
import './hero-v3.css';

// Background video. This CloudFront path sits in another Higgsfield account's
// user folder, not K4K's, so swap it for a K4K-owned file before launch.
// Set it to '' and the hero renders on the dark background alone.
const VIDEO_URL='https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4';

const NAV=[{label:'Features',caret:true},{label:'Solutions'},{label:'Plans',href:'/k4k-app/credits'},{label:'Learning',caret:true,href:'/academy'}];
// Real models from the K4K catalogue rather than invented client brands.
const MARQUEE=['Motion','Wan 3','Seedance','Kling','FLUX','GPT Image','Nano Banana'];
const FADE=500;

export default function HeroV3(){
 const videoRef=useRef(null);

 // 0.5s fade in at the start, 0.5s fade out at the end, driven by rAF against
 // the video clock. On ended: reset to 0, wait 100ms, replay from the start.
 useEffect(()=>{
  const video=videoRef.current;
  if(!video)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let frame=0,stopped=false;
  const tick=()=>{
   if(stopped)return;
   const {currentTime:t,duration:d}=video;
   if(Number.isFinite(d)&&d>0){
    const inMs=t*1000,outMs=(d-t)*1000;
    const rising=Math.min(1,inMs/FADE);
    const falling=Math.min(1,Math.max(0,outMs/FADE));
    video.style.opacity=String(Math.max(0,Math.min(rising,falling)));
   }
   frame=requestAnimationFrame(tick);
  };
  const onPlay=()=>{frame=requestAnimationFrame(tick)};
  const onEnded=()=>{
   cancelAnimationFrame(frame);
   video.style.opacity='0';
   setTimeout(()=>{if(stopped)return;video.currentTime=0;video.play().catch(()=>{})},100);
  };
  video.addEventListener('play',onPlay);
  video.addEventListener('ended',onEnded);
  video.play().catch(()=>{});
  return()=>{stopped=true;cancelAnimationFrame(frame);video.removeEventListener('play',onPlay);video.removeEventListener('ended',onEnded)};
 },[]);

 return <div className="h3">
  {VIDEO_URL&&<video ref={videoRef} className="h3-video" src={VIDEO_URL} muted playsInline preload="auto" aria-hidden="true"/>}

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
