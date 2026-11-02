'use client';
import {useEffect,useRef,useState} from 'react';

// Browser autoplay requires silence. Sound is enabled only by the viewer's click.
export default function VideoPreview({index,title}){
 const ref=useRef(null);
 const [soundOn,setSoundOn]=useState(false);
 useEffect(()=>{
  const video=ref.current;
  if(!video)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer=new IntersectionObserver(([entry])=>{
   if(entry.isIntersecting&&!reduced){video.play().catch(()=>{});}
   else video.pause();
  },{threshold:.5});
  const muteOther=event=>{
   if(event.detail!==index){video.muted=true;setSoundOn(false);}
  };
  observer.observe(video);
  window.addEventListener('k4k-template-audio',muteOther);
  return ()=>{observer.disconnect();window.removeEventListener('k4k-template-audio',muteOther);};
 },[index]);
 function toggleSound(){
  const video=ref.current;
  if(!video)return;
  const next=!soundOn;
  setSoundOn(next);
  video.muted=!next;
  if(next){
   window.dispatchEvent(new CustomEvent('k4k-template-audio',{detail:index}));
   video.play().catch(()=>{video.muted=true;setSoundOn(false);});
  }
 }
 return <>
  <video ref={ref} muted={!soundOn} loop playsInline controls preload="none" poster={`/videos/template-${index}.webp`} aria-label={title}>
   <source src={`/videos/template-${index}.mp4`} type="video/mp4"/>
  </video>
  <button type="button" className="k4k-sound-toggle" aria-pressed={soundOn} aria-label={soundOn?`Mute ${title}`:`Turn on sound for ${title}`} onClick={toggleSound}>
   {soundOn?'🔊 Sound on':'🔇 Turn sound on'}
  </button>
 </>;
}
