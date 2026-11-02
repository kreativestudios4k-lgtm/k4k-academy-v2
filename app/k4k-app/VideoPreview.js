'use client';
import {useEffect,useRef,useState} from 'react';

// Previews autoplay muted to comply with browser rules; users may tap the video
// itself to hear its embedded audio. No sound icon is displayed.
export default function VideoPreview({index,title}){
 const ref=useRef(null);
 const [audible,setAudible]=useState(false);
 useEffect(()=>{
  const video=ref.current;
  if(!video)return;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer=new IntersectionObserver(([entry])=>{
   if(entry.isIntersecting&&!reduceMotion)video.play().catch(()=>{});
   else video.pause();
  },{threshold:.35});
  const muteOther=(event)=>{
   if(event.detail!==video){video.muted=true;setAudible(false);}
  };
  window.addEventListener('k4k:video-audio',muteOther);
  observer.observe(video);
  return ()=>{observer.disconnect();window.removeEventListener('k4k:video-audio',muteOther);};
 },[]);
 function toggleSound(){
  const video=ref.current;
  if(!video)return;
  video.muted=!video.muted;
  setAudible(!video.muted);
  if(!video.muted)window.dispatchEvent(new CustomEvent('k4k:video-audio',{detail:video}));
  video.play().catch(()=>{});
 }
 return <video ref={ref} muted loop playsInline preload="none" poster={`/videos/template-${index}.webp`}
  aria-label={`${title} preview. ${audible?'Sound on':'Sound off'}. Tap or press Enter to toggle sound if this clip has audio.`}
  title={audible?'Click to mute':'Click for sound'}
  tabIndex={0} onClick={toggleSound}
  onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleSound();}}}>
  <source src={`/videos/template-${index}.mp4`} type="video/mp4"/>
 </video>;
}
