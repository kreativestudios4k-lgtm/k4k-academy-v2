'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useK4KLocale} from '../../locale';
import './template.css';

const MAX_PHOTOS=30,MAX_BYTES=10*1024*1024;
const allowed=new Set(['image/png','image/jpeg','image/webp']);
export default function TemplateCreator({template}){
 const {locale}=useK4KLocale();
 const pt=locale==='pt',es=locale==='es';
 const tr=(en,br,spa)=>pt?br:es?spa:en;
 const video=useRef(null),nextId=useRef(1),objectUrls=useRef(new Set());
 const [characters,setCharacters]=useState([{id:0,photo:null,target:null}]);
 const [mappingId,setMappingId]=useState(null);
 const [duration,setDuration]=useState(Math.min(30,Math.max(3,Math.round(template.durationSeconds||10))));
 const [model,setModel]=useState('motion');
 const [consent,setConsent]=useState(false);
 const [error,setError]=useState('');
 const [showHelp,setShowHelp]=useState(true);
 useEffect(()=>()=>{objectUrls.current.forEach(url=>URL.revokeObjectURL(url));objectUrls.current.clear();},[]);
 function togglePlayback(player){
  if(player.muted){player.muted=false;player.volume=1;if(player.paused)player.play().catch(()=>{});return;}
  if(player.paused)player.play().catch(()=>{});else player.pause();
 }
 function choose(event,id){
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(!allowed.has(file.type)||file.size>MAX_BYTES){setError(tr('Choose JPG, PNG or WebP under 10 MB.','Escolha JPG, PNG ou WebP de até 10 MB.','Elige JPG, PNG o WebP de hasta 10 MB.'));return;}
  const url=URL.createObjectURL(file);objectUrls.current.add(url);
  setCharacters(old=>old.map(item=>{
   if(item.id!==id)return item;
   if(item.photo?.url){URL.revokeObjectURL(item.photo.url);objectUrls.current.delete(item.photo.url);}
   return {...item,photo:{url,name:file.name},target:null};
  }));
  setError('');
 }
 function removePhoto(id){setCharacters(old=>old.map(item=>{
  if(item.id!==id)return item;
  if(item.photo?.url){URL.revokeObjectURL(item.photo.url);objectUrls.current.delete(item.photo.url);}
  return {...item,photo:null,target:null};
 }));}
 function addCharacter(){if(characters.length<MAX_PHOTOS)setCharacters(old=>[...old,{id:nextId.current++,photo:null,target:null}]);}
 function removeCharacter(id){setCharacters(old=>{
  if(old.length<=1)return old;
  const removed=old.find(item=>item.id===id);
  if(removed?.photo?.url){URL.revokeObjectURL(removed.photo.url);objectUrls.current.delete(removed.photo.url);}
  return old.filter(item=>item.id!==id);
 });if(mappingId===id)setMappingId(null);}
 function startMapping(id){setMappingId(id);video.current?.pause();video.current?.scrollIntoView({behavior:'smooth',block:'center'});}
 function markPerson(event){
  if(mappingId===null)return;
  const bounds=event.currentTarget.getBoundingClientRect();
  const x=Math.min(100,Math.max(0,Math.round((event.clientX-bounds.left)/bounds.width*100)));
  const y=Math.min(100,Math.max(0,Math.round((event.clientY-bounds.top)/bounds.height*100)));
  const timestamp=video.current?.currentTime||0;
  setCharacters(old=>old.map(item=>item.id===mappingId?{...item,target:{x,y,timestamp}}:item));
  setMappingId(null);
 }
 const uploaded=characters.filter(item=>item.photo).length;
 const mapped=characters.filter(item=>item.photo&&item.target).length;
 return <main className="k4k-recreate k4k-template-workflow">
  <header className="k4k-template-header"><Link href="/k4k-app" className="k4k-template-logo"><span>✦</span> K4K <b>APP</b></Link><nav aria-label="Template navigation"><Link href="/k4k-app">{tr('Explore','Explorar','Explorar')}</Link><Link href="/k4k-app/videos">{tr('My projects','Meus projetos','Mis proyectos')}</Link><Link href="/k4k-app/credits">{tr('Credits','Créditos','Créditos')}</Link></nav></header>
  <div className="k4k-template-breadcrumb"><Link href="/k4k-app">← {tr('Back to all templates','Voltar aos templates','Volver a las plantillas')}</Link><span> / </span><strong>{template.title}</strong></div>
  <div className="k4k-template-layout">
   <section className="k4k-template-watch" aria-label={template.title}>
    <div className="k4k-template-video-frame">
     {template.videoUrl?<video ref={video} src={template.videoUrl} muted autoPlay loop playsInline preload="metadata" onClick={event=>{if(mappingId===null)togglePlayback(event.currentTarget)}} onKeyDown={event=>{if(mappingId===null&&(event.key==='Enter'||event.key===' ')){event.preventDefault();togglePlayback(event.currentTarget)}}} tabIndex={0} aria-label={template.title+' — tap to turn on sound or pause'} />:<div className="k4k-template-missing">{tr('Preview unavailable','Prévia indisponível','Vista previa no disponible')}</div>}
     <div className="k4k-template-video-top"><span>✦ K4K REFERENCE</span><span>{Math.round(template.durationSeconds||duration)}S</span></div>
     <div className={mappingId===null?'k4k-template-map-overlay':'k4k-template-map-overlay is-mapping'} onClick={markPerson}>
      {characters.filter(item=>item.target).map(item=><span className="k4k-template-target" key={item.id} style={{left:item.target.x+'%',top:item.target.y+'%'}}>{characters.findIndex(c=>c.id===item.id)+1}</span>)}
      {mappingId!==null&&<div className="k4k-template-mapping-message">{tr('Tap the character you want to replace','Toque na pessoa que quer substituir','Toca a la persona que quieres reemplazar')}<button type="button" onClick={event=>{event.stopPropagation();setMappingId(null)}}>Cancel</button></div>}
     </div>
    </div>
    <div className="k4k-template-reference-text"><span>✦ {tr('ORIGINAL REFERENCE','REFERÊNCIA ORIGINAL','REFERENCIA ORIGINAL')}</span><h1>{template.title}</h1><p>{tr('Watch the motion and choose who to replace. Tap the video itself to turn on sound.','Assista à referência e escolha quem deseja substituir. Toque no vídeo para ativar o som.','Mira la referencia y elige a quién reemplazar. Toca el vídeo para activar el sonido.')}</p></div>
   </section>
   <section className="k4k-template-editor" aria-label={tr('Prepare a video','Prepare seu vídeo','Prepara tu vídeo')}>
    <div className="k4k-template-editor-top"><span>01 / {tr('PERSONALISE THE SCENE','PERSONALIZE A CENA','PERSONALIZA LA ESCENA')}</span><span className="k4k-template-preview-pill">● PREVIEW ONLY</span></div>
    <h2>{tr('Put yourself in the scene.','Entre no vídeo.','Entra en el vídeo.')}</h2>
    <p className="k4k-template-editor-lead">{tr('Upload a clear photo of each person you want in the reference video. Each slot represents one replacement.','Envie uma foto nítida de cada pessoa que deseja colocar no vídeo.','Sube una foto clara de cada persona que quieras colocar en el vídeo.')}</p>
    <div className="k4k-template-progress"><strong>{uploaded}/{characters.length} {tr('photos ready','fotos prontas','fotos listas')}</strong><span>{mapped} {tr('positions marked','posições marcadas','posiciones marcadas')}</span></div>
    <div className="k4k-template-progress-track"><div style={{width:(uploaded/Math.max(characters.length,1)*100)+'%'}}/></div>
    <div className="k4k-template-character-grid">
    {characters.map((item,index)=><div className="k4k-template-character" key={item.id}>
     <div className="k4k-template-character-name"><strong>{tr('Character','Personagem','Personaje')} {index+1}</strong>{characters.length>1&&<button type="button" onClick={()=>removeCharacter(item.id)} aria-label={'Remove character '+(index+1)}>✕</button>}</div>
     {item.photo?<div className="k4k-template-photo"><img src={item.photo.url} alt={tr('Photo for character ','Foto do personagem ','Foto del personaje ')+(index+1)}/><button type="button" onClick={()=>removePhoto(item.id)}>{tr('Change photo','Trocar foto','Cambiar foto')}</button></div>:<label className="k4k-template-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>choose(event,item.id)}/><span aria-hidden="true">＋</span><strong>{tr('Upload photo','Enviar foto','Subir foto')}</strong><small>JPG / PNG / WEBP</small></label>}
     <button type="button" className={item.target?'k4k-template-map-button mapped':'k4k-template-map-button'} onClick={()=>startMapping(item.id)} disabled={!item.photo}>{item.target?'✓ '+tr('Position selected','Posição selecionada','Posición seleccionada'):'◎ '+tr('Select person in video','Marcar pessoa no vídeo','Marcar persona en vídeo')}</button>
    </div>)}
    {characters.length<MAX_PHOTOS&&<button type="button" className="k4k-template-new-character" onClick={addCharacter}><span aria-hidden="true">＋</span><strong>{tr('Add character','Adicionar personagem','Añadir personaje')}</strong><small>{tr('Up to 30 images','Até 30 imagens','Hasta 30 imágenes')}</small></button>}
    </div>
    {error&&<p className="k4k-template-error" role="alert">{error}</p>}
    <div className="k4k-template-settings"><div className="k4k-template-field"><label htmlFor="k4k-template-model">{tr('Creation mode','Modo de criação','Modo de creación')}</label><select id="k4k-template-model" value={model} onChange={event=>setModel(event.target.value)}><option value="motion">K4K Motion · Preview</option><option value="swap">K4K Character Swap · Preview</option></select></div><div className="k4k-template-field"><label htmlFor="k4k-template-duration">{tr('Target duration','Duração alvo','Duración objetivo')} <strong>{duration}s</strong></label><input id="k4k-template-duration" type="range" min="3" max="30" step="1" value={duration} onChange={event=>setDuration(Number(event.target.value))}/></div></div>
    <label className="k4k-template-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>{tr('I have permission to use every person’s photo and understand results may vary.','Tenho autorização para usar as fotos das pessoas e entendo que o resultado pode variar.','Tengo permiso para usar las fotos y entiendo que los resultados pueden variar.')}</span></label>
    <button type="button" className="k4k-template-disabled-generate" disabled>{uploaded===0?tr('Upload photos to prepare a project','Envie fotos para preparar seu projeto','Sube fotos para preparar tu proyecto'):!consent?tr('Review permission before generating','Confirme a autorização antes de gerar','Confirma el permiso antes de generar'):tr('AI generation coming soon','Geração de IA em breve','Generación de IA próximamente')}</button>
    <p className="k4k-template-safety">{tr('This is a preview only. Photos stay in your browser; no AI requests, charges or credit reservations are made.','Esta é uma prévia. As fotos ficam no navegador; não há geração, cobrança ou reserva de créditos.','Esto es una vista previa. Las fotos quedan en tu navegador; no se hacen cargos ni generación.')}</p>
    <Link className="k4k-template-creator-link" href="/k4k-app/creator">{tr('Open advanced Creator Studio','Abrir estúdio avançado','Abrir estudio avanzado')} ↗</Link>
    <div className="k4k-template-help"><button type="button" aria-expanded={showHelp} onClick={()=>setShowHelp(v=>!v)}>{tr('How this works','Como funciona','Cómo funciona')}<span aria-hidden="true">{showHelp?'−':'+'}</span></button>{showHelp&&<ol><li>{tr('Upload one clear image for each replacement.','Envie uma foto nítida para cada personagem.','Sube una foto clara por persona.')}</li><li>{tr('Select the position to mark your character in the preview.','Marque cada personagem na prévia do vídeo.','Marca cada personaje en la vista previa.')}</li><li>{tr('Your selections stay local while generation is being validated.','As seleções ficam locais enquanto a geração é validada.','Las elecciones quedan locales mientras validamos la generación.')}</li></ol>}</div>
   </section>
  </div>
  <footer className="k4k-template-footer"><span>✦ K4K APP · KreativeStudios4K</span><div><Link href="/k4k-app/support">{tr('Support','Ajuda','Soporte')}</Link><Link href="/k4k-app/credits">{tr('Plans','Planos','Planes')}</Link><Link href="/privacy">Privacy</Link></div></footer>
 </main>;
}
