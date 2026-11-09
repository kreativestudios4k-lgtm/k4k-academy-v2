'use client';
import {useEffect,useRef,useState} from 'react';
export default function VideoPreview({index,title}){
 const ref=useRef(null);
 const [soundOn,setSoundOn]=useState(false);
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
 function toggleSound(){
  const video=ref.current;
  if(!video)return;
  const enabled=video.muted;
  video.muted=!enabled;
  video.volume=1;
  setSoundOn(enabled);
  if(enabled&&video.paused)video.play().catch(()=>{});
 }
 return <>
  <video ref={ref} muted loop playsInline controls preload="none" poster={`/videos/template-${index}.webp`} aria-label={title}>
   <source src={`/videos/template-${index}.mp4`} type="video/mp4"/>
  </video>
  <button type="button" onClick={toggleSound} aria-label={soundOn?`Mute ${title}`:`Turn on sound for ${title}`} aria-pressed={soundOn} style={{position:'absolute',top:13,right:13,zIndex:4,border:'1px solid #ffffff45',borderRadius:24,background:'#08090cdb',color:'#fff',padding:'9px 12px',fontSize:12,fontWeight:800,cursor:'pointer'}}>{soundOn?'🔊 Sound on':'🔇 Tap for sound'}</button>
 </>;
}
