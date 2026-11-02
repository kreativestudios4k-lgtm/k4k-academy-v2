'use client';
import {useEffect,useRef} from 'react';

// A silent, inline motion reference. No audio controls or speaker icon appear on the gallery.
export default function VideoPreview({index,title}){
 const ref=useRef(null);
 useEffect(()=>{
  const video=ref.current;
  if(!video)return;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer=new IntersectionObserver(([entry])=>{
   if(entry.isIntersecting&&!reduceMotion)video.play().catch(()=>{});
   else video.pause();
  },{threshold:.35});
  observer.observe(video);
  return ()=>observer.disconnect();
 },[]);
 return <video ref={ref} muted defaultMuted loop playsInline preload="none" poster={`/videos/template-${index}.webp`} aria-label={`Silent motion reference: ${title}`}>
  <source src={`/videos/template-${index}.mp4`} type="video/mp4"/>
 </video>;
}
