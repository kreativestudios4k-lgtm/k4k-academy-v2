'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import './template.css';
export default function TemplateCreator({template}){
 const nextId=useRef(1);
 const [characters,setCharacters]=useState([{id:0,photo:null}]);
 const [recreateOpen,setRecreateOpen]=useState(false);
 const [duration,setDuration]=useState(Math.min(30,Math.max(3,Math.floor(template.durationSeconds||10))));const [model,setModel]=useState('wan');const [sound,setSound]=useState(false);const [mapping,setMapping]=useState(false);const [selectedId,setSelectedId]=useState(0);
 const video=useRef(null);
 useEffect(()=>{if(!recreateOpen){if(!mapping)video.current?.play().catch(()=>{});}else{video.current?.pause();}},[recreateOpen,mapping]);
 useEffect(()=>{
  if(!recreateOpen)return;
  const onKeyDown=(event)=>{if(event.key==='Escape'){setRecreateOpen(false);setMapping(false)}};
  document.addEventListener('keydown',onKeyDown);
  return ()=>document.removeEventListener('keydown',onKeyDown);
 },[recreateOpen]);
 const objectUrls=useRef(new Set());
 useEffect(()=>()=>{objectUrls.current.forEach(url=>URL.revokeObjectURL(url));objectUrls.current.clear()},[]);
 useEffect(()=>{if(video.current)video.current.muted=!sound},[sound]);
 function choose(e,id){
  const file=e.target.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){alert('Select an image.');return}
  if(file.size>10*1024*1024){alert('Choose an image under 10 MB.');return}
  const url=URL.createObjectURL(file);objectUrls.current.add(url);
  setCharacters(prev=>prev.map(c=>{if(c.id!==id)return c;if(c.photo?.url){URL.revokeObjectURL(c.photo.url);objectUrls.current.delete(c.photo.url)}return {...c,photo:{url,name:file.name}}}));
  e.target.value='';
 }
 function removePhoto(id){setCharacters(prev=>prev.map(c=>{if(c.id!==id)return c;if(c.photo?.url){URL.revokeObjectURL(c.photo.url);objectUrls.current.delete(c.photo.url)}return {...c,photo:null,target:null}}))}
 function addCharacter(){setCharacters(prev=>prev.length>=30?prev:[...prev,{id:nextId.current++,photo:null}])}
 function startMapping(id){setSelectedId(id);setRecreateOpen(false);setMapping(true);video.current?.pause()}
 function markPerson(event){if(!mapping)return;const bounds=event.currentTarget.getBoundingClientRect();const x=Math.round((event.clientX-bounds.left)/bounds.width*100);const y=Math.round((event.clientY-bounds.top)/bounds.height*100);const timestamp=video.current?.currentTime||0;setCharacters(prev=>prev.map(c=>c.id===selectedId?{...c,target:{x,y,timestamp}}:c));setMapping(false);setRecreateOpen(true)}
 function removeCharacter(id){setCharacters(prev=>{if(prev.length<=1)return prev;const removed=prev.find(c=>c.id===id);if(removed?.photo?.url){URL.revokeObjectURL(removed.photo.url);objectUrls.current.delete(removed.photo.url)}return prev.filter(c=>c.id!==id)})}
 const filled=characters.filter(c=>c.photo).length;
 const estimate=model==='wan'?Math.ceil(duration*2):model==='light'?Math.ceil(duration*6):Math.ceil(duration*19);
 const supported=model==='wan'||(model==='light'&&duration<=15)||(model==='genjutsu'&&duration>=5);
 const allMapped=characters.filter(c=>c.photo).every(c=>c.target);
 return <main className="k4k-recreate">
 <div className="k4k-recreate-video">{template.videoUrl&&<video ref={video} src={template.videoUrl} playsInline autoPlay loop muted controls={false}/>}<div className={mapping?'k4k-recreate-mark-area is-mapping':'k4k-recreate-mark-area'} onClick={markPerson}>{characters.filter(c=>c.target).map((c,i)=><span key={c.id} className="k4k-recreate-marker" style={{left:c.target.x+'%',top:c.target.y+'%'}}>{characters.findIndex(item=>item.id===c.id)+1}</span>)}{mapping&&<span className="k4k-recreate-mark-help">Tap the person you want to replace</span>}</div>
 <Link className="k4k-recreate-back" href="/k4k-app" aria-label="Back">‹</Link>
 <Link className="k4k-recreate-upgrade" href="/k4k-app/credits">✦ Credits</Link>
 <button type="button" className="k4k-recreate-sound" onClick={()=>setSound(v=>!v)} aria-label={sound?'Mute':'Unmute'}>{sound?'🔊':'🔇'}</button></div>
 <div className="k4k-template-viewer-meta"><span>✦ K4K COMMUNITY</span><h1>{template.title}</h1><p>Watch the reference, then recreate it with your own characters.</p><button type="button" onClick={()=>setRecreateOpen(true)}>✦ Recreate this video</button></div>
 {recreateOpen&&<><button className="k4k-recreate-backdrop" type="button" aria-label="Close recreate panel" onClick={()=>setRecreateOpen(false)}/><section className="k4k-recreate-panel" role="dialog" aria-modal="true" aria-label="Recreate this video"><div className="k4k-recreate-handle"/>
 <header><span>ⓘ</span><div><h1>Recreate this video</h1><p>{template.title} · K4K APP</p></div><button type="button" className="k4k-sheet-close" onClick={()=>setRecreateOpen(false)} aria-label="Close">✕</button></header>
 <p className="k4k-recreate-instructions">Upload a photo for each person you want to replace. Add as many character slots as you need; people you don't select should remain unchanged.</p>
 <div className="k4k-recreate-slots">{characters.map((c,i)=><div className="k4k-recreate-slot" key={c.id}>
 {c.photo?<><img src={c.photo.url} alt={`Replacement character ${i+1}`}/><button type="button" className="k4k-recreate-remove" onClick={()=>removePhoto(c.id)} aria-label={`Remove photo ${i+1}`}>✕</button><span>Character {i+1}</span></>:<label><input type="file" accept="image/*" onChange={e=>choose(e,c.id)}/><strong>＋</strong><span>Photo {i+1}</span></label>}
 <button type="button" className="k4k-recreate-map-button" onClick={()=>startMapping(c.id)}>{c.target?'✓ Person marked · Change':'◎ Select person in video'}</button>
 {characters.length>1&&<button type="button" className="k4k-recreate-delete-slot" onClick={()=>removeCharacter(c.id)} aria-label={`Delete character slot ${i+1}`}>Remove slot</button>}
 </div>)}
 <button type="button" className="k4k-recreate-add-slot" onClick={addCharacter} disabled={characters.length>=30}><strong>＋</strong><span>{characters.length>=30?'30 character limit reached':'Add character'}</span></button>
 </div>
 <p className="k4k-recreate-instructions">Pause and mark each person directly on the video. This saves a reference point for the future AI mapping engine; it does not track movement yet.</p><p className="k4k-recreate-count">{filled} replacement {filled===1?'photo':'photos'} selected · {characters.length} {characters.length===1?'slot':'slots'}</p>
 <div className="k4k-recreate-quote"><label>Video duration <strong>{duration} seconds</strong><input type="range" min="3" max="30" step="1" value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label><label>Generation model <select value={model} onChange={e=>setModel(e.target.value)}><option value="wan">K4K Motion — general video</option><option value="light">K4K Swap Lite — character replacement</option><option value="genjutsu">K4K Swap Pro — premium replacement</option></select></label><strong>{supported?`${estimate} estimated K4K credits`:'Duration not supported by this model'}</strong><small>Planning estimate only. No live provider quote, credit reservation or paid generation. A compatible model must be confirmed for the chosen duration.</small>{filled>0&&!allMapped&&<small>Mark each uploaded character in the video before generating.</small>}</div>
 <button type="button" className="k4k-recreate-generate" disabled title="Generation is disabled in preview">{filled===0?'Upload a photo to begin':'Generation coming soon'}</button>
 <p className="k4k-recreate-notice">No prompt required. Your character selections prepare the template automatically. Automatic tracking and AI generation are not connected yet; no uploads are submitted or charged.</p>
 </section></>}</main>
}