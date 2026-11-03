'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import './template.css';
export default function TemplateCreator({template}){
 const nextId=useRef(1);
 const [characters,setCharacters]=useState([{id:0,photo:null}]);
 const [sound,setSound]=useState(false);
 const video=useRef(null);
 const objectUrls=useRef(new Set());
 useEffect(()=>()=>{objectUrls.current.forEach(url=>URL.revokeObjectURL(url));objectUrls.current.clear()},[]);
 useEffect(()=>{if(video.current)video.current.muted=!sound},[sound]);
 function choose(e,id){
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')){alert('Select an image.');return}
  if(file.size>10*1024*1024){alert('Choose an image under 10 MB.');return}
  const url=URL.createObjectURL(file);objectUrls.current.add(url);
  setCharacters(prev=>prev.map(c=>c.id===id?{...c,photo:{url,name:file.name}}:c));
  e.target.value='';
 }
 function removePhoto(id){setCharacters(prev=>prev.map(c=>c.id===id?{...c,photo:null}:c))}
 function addCharacter(){setCharacters(prev=>[...prev,{id:nextId.current++,photo:null}])}
 function removeCharacter(id){setCharacters(prev=>prev.length>1?prev.filter(c=>c.id!==id):prev)}
 const filled=characters.filter(c=>c.photo).length;
 return <main className="k4k-recreate">
 <div className="k4k-recreate-video">{template.videoUrl&&<video ref={video} src={template.videoUrl} playsInline autoPlay loop muted controls={false}/>}
 <Link className="k4k-recreate-back" href="/k4k-app" aria-label="Back">‹</Link>
 <Link className="k4k-recreate-upgrade" href="/k4k-app/credits">✦ Credits</Link>
 <button type="button" className="k4k-recreate-sound" onClick={()=>setSound(v=>!v)} aria-label={sound?'Mute':'Unmute'}>{sound?'🔊':'🔇'}</button></div>
 <section className="k4k-recreate-panel"><div className="k4k-recreate-handle"/>
 <header><span>ⓘ</span><div><h1>Recreate this video</h1><p>{template.title} · K4K Motion</p></div><Link href="/k4k-app">✕</Link></header>
 <p className="k4k-recreate-instructions">Upload a photo for each person you want to replace. Add as many character slots as you need; people you don't select should remain unchanged.</p>
 <div className="k4k-recreate-slots">{characters.map((c,i)=><div className="k4k-recreate-slot" key={c.id}>
 {c.photo?<><img src={c.photo.url} alt={`Replacement character ${i+1}`}/><button type="button" className="k4k-recreate-remove" onClick={()=>removePhoto(c.id)} aria-label={`Remove photo ${i+1}`}>✕</button><span>Character {i+1}</span></>:<label><input type="file" accept="image/*" onChange={e=>choose(e,c.id)}/><strong>＋</strong><span>Photo {i+1}</span></label>}
 {characters.length>1&&<button type="button" className="k4k-recreate-delete-slot" onClick={()=>removeCharacter(c.id)} aria-label={`Delete character slot ${i+1}`}>Remove slot</button>}
 </div>)}
 <button type="button" className="k4k-recreate-add-slot" onClick={addCharacter}><strong>＋</strong><span>Add character</span></button>
 </div>
 <p className="k4k-recreate-count">{filled} replacement {filled===1?'photo':'photos'} selected · {characters.length} {characters.length===1?'slot':'slots'}</p>
 <button type="button" className="k4k-recreate-generate" disabled title="Generation is disabled in preview">{filled===0?'Upload a photo to begin':'Generation coming soon'}</button>
 <p className="k4k-recreate-notice">Character-to-person mapping and AI generation are not yet connected. Uploads stay in this browser session and are not submitted or charged.</p>
 </section></main>
}