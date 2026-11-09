'use client';
import {useEffect,useRef} from 'react';
export default function VideoPreview({index,title}){
 const ref=useRef(null);
 useEffect(()=>{
  const video=ref.current;
  if(!video)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer=new IntersectionObserver(([entry])=>{
   if(entry.isIntersecting&&!reduced)video.play().catch(()=>{});
   else video.pause();
  },{threshold:.5});
  observer.observe(video);
  return()=>observer.disconnect();
 },[]);
 function handleVideoClick(event){
  const video=event.currentTarget;
  if(video.muted){
   video.muted=false;
   video.volume=1;
   if(video.paused)video.play().catch(()=>{});
   return;
  }
  if(video.paused)video.play().catch(()=>{});
  else video.pause();
 }
 return <video
  ref={ref}
  muted
  loop
  playsInline
  preload="none"
  poster={`/videos/template-${index}.webp`}
  aria-label={`${title} — click to play with sound`}
  onClick={handleVideoClick}
 >
  <source src={`/videos/template-${index}.mp4`} type="video/mp4"/>
 </video>;
}
