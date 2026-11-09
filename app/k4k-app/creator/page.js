'use client';
import {useEffect,useRef,useState} from 'react';
import './creator.css';
import Link from 'next/link';
import PreviewShell from '../PreviewShell';
import {useK4KLocale} from '../locale';
import {createClient} from '../../../lib/supabase/client';

const MAX_VIDEO=150*1024*1024;
const MAX_IMAGE=10*1024*1024;
const IMAGE_TYPES=['image/png','image/jpeg','image/webp'];
const VIDEO_TYPES=['video/mp4','video/webm','video/quicktime'];
function useLocalPreview(){
 const [file,setFile]=useState(null);
 const [url,setUrl]=useState('');
 useEffect(()=>{if(!file){setUrl('');return;}const objectUrl=URL.createObjectURL(file);setUrl(objectUrl);return()=>URL.revokeObjectURL(objectUrl)},[file]);
 return {file,url,setFile};
}
export default function Creator(){
 const {locale}=useK4KLocale();
 const video=useLocalPreview(),character=useLocalPreview();
 const [extraImages,setExtraImages]=useState([]),[activeTab,setActiveTab]=useState('Motion Transfer'),[duration,setDuration]=useState(5),[quality,setQuality]=useState('720p');
 const extraUrlRegistry=useRef(new Set());
 useEffect(()=>()=>{extraUrlRegistry.current.forEach(url=>URL.revokeObjectURL(url));extraUrlRegistry.current.clear()},[]);
 function addExtraImages(event){const incoming=Array.from(event.target.files||[]);event.target.value='';if(incoming.length+extraImages.length+(character.file?1:0)>30||incoming.some(file=>!IMAGE_TYPES.includes(file.type)||file.size>MAX_IMAGE)){setError('Maximum 30 JPG, PNG or WebP images, 10 MB each.');return;}setError('');const next=incoming.map(file=>{const url=URL.createObjectURL(file);extraUrlRegistry.current.add(url);return {file,url};});setExtraImages(old=>[...old,...next]);}
 function removeExtraImage(index){setExtraImages(old=>old.filter((item,i)=>{if(i===index){URL.revokeObjectURL(item.url);extraUrlRegistry.current.delete(item.url);}return i!==index;}));}
 const [error,setError]=useState('');
 const [prompt,setPrompt]=useState('');
 const [model,setModel]=useState('standard');
 const [uploading,setUploading]=useState(false),[uploadMessage,setUploadMessage]=useState('');
 const [savedReference,setSavedReference]=useState(null),[savingDraft,setSavingDraft]=useState(false),[draftMessage,setDraftMessage]=useState('');
 const [history,setHistory]=useState([]),[historyState,setHistoryState]=useState('');
 async function loadHistory(){setHistoryState('Loading your generation history…');try{const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();if(authError||!user)throw new Error('Sign in to view your generation history.');const {data,error}=await client.from('studio_generation_jobs').select('id,status,model,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(15);if(error)throw error;setHistory(data||[]);setHistoryState(data?.length?'':'No generation drafts or jobs yet.');}catch(e){setHistoryState(e?.message||'Could not load history.')}}
 async function saveDraft(){
  if(!savedReference||savingDraft)return;
  setSavingDraft(true);setDraftMessage('');
  try{
   const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user||user.id!==savedReference.userId)throw new Error('Please sign in again to save your draft.');
   const {data,error}=await client.from('studio_generation_jobs').insert({user_id:user.id,template_id:'creator-upload-preview',provider:'higgsfield',model,status:'draft',reference_paths:[savedReference.path],main_reference_index:0,prompt:prompt.trim(),credits_reserved:0}).select('id').single();
   if(error)throw error;
   setDraftMessage('Draft saved: '+data.id+'. Only the primary uploaded image and prompt are saved. Video and additional images remain local. No generation started and no credits charged.');await loadHistory();
  }catch(e){setDraftMessage(e?.message||'Unable to save draft.')}finally{setSavingDraft(false)}
 }
 async function saveReference(){
  if(!character.file||uploading)return;
  setUploadMessage('');setUploading(true);
  try{
   if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)throw new Error('Storage is not configured for this preview.');
   const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user)throw new Error('Sign in to your K4K APP account before saving an image.');
   if(!IMAGE_TYPES.includes(character.file.type)||character.file.size>MAX_IMAGE)throw new Error(copy.limit);
   const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[character.file.type];
   const path=user.id+'/'+crypto.randomUUID()+'.'+extension;
   const {error:uploadError}=await client.storage.from('studio-references').upload(path,character.file,{contentType:character.file.type,upsert:false});
   if(uploadError)throw uploadError;
   setSavedReference({path,userId:user.id});setUploadMessage('Reference saved privately to your account. No AI generation or credit charge occurred.');
  }catch(e){setUploadMessage(e?.message||'Unable to save reference image.')}finally{setUploading(false)}
 }
 const pt=locale==='pt',es=locale==='es';
 const copy=pt?{title:'Estúdio de criação',intro:'Prepare seu vídeo e sua foto. O vídeo fica no navegador; você pode salvar a foto na sua conta.',reference:'Vídeo de referência',image:'Foto do personagem',prompt:'Instruções criativas (opcional)',placeholder:'Descreva o personagem, o cenário ou o resultado desejado...',model:'Modelo de geração',ready:'Prévia pronta para geração',waiting:'Adicione um vídeo e uma imagem para preparar seu projeto',disabled:'Geração de IA ainda desativada — nenhum crédito será cobrado.',back:'Explorar templates',video:'Escolher vídeo',photo:'Escolher foto',remove:'Remover',privacy:'O vídeo fica neste navegador. A foto só é enviada ao armazenamento privado se você clicar em Salvar.',limit:'Arquivo inválido ou acima do limite permitido.'}:es?{title:'Estudio de creación',intro:'Prepara tu vídeo y foto. El vídeo permanece en tu navegador; puedes guardar la foto en tu cuenta.',reference:'Vídeo de referencia',image:'Foto del personaje',prompt:'Instrucciones creativas (opcional)',placeholder:'Describe el resultado deseado...',model:'Modelo de generación',ready:'Vista previa lista',waiting:'Añade un vídeo y una imagen',disabled:'Generación desactivada — no se cobran créditos.',back:'Explorar plantillas',video:'Elegir vídeo',photo:'Elegir foto',remove:'Quitar',privacy:'El vídeo permanece en tu navegador. La foto solo se sube si eliges guardarla.',limit:'Archivo no válido o demasiado grande.'}:{title:'Creator Studio',intro:'Prepare a reference video and character image. Video stays in your browser; you can choose to save the image privately.',reference:'Reference video',image:'Character photo',prompt:'Creative instructions (optional)',placeholder:'Describe the character, scene, or result you want...',model:'Generation model',ready:'Project ready for generation',waiting:'Add a video and an image to prepare your project',disabled:'AI generation is disabled — no credits will be charged.',back:'Explore templates',video:'Choose video',photo:'Choose photo',remove:'Remove',privacy:'Video stays in this browser. Your image is uploaded to private storage only if you choose Save reference.',limit:'Invalid file or file exceeds the size limit.'};
 function choose(event,target,kind,max){const file=event.target.files?.[0];setError('');if(!file)return;if(!(kind==='image'?IMAGE_TYPES:VIDEO_TYPES).includes(file.type)||file.size>max){setError(copy.limit);event.target.value='';return;}target.setFile(file);if(kind==='image'){setSavedReference(null);setDraftMessage('')}}

 const needsVideo=activeTab==='Motion Transfer'||activeTab==='Character Swap';
 const needsImage=activeTab!=='Text to Video';
 const ready=(!needsVideo||Boolean(video.file))&&(!needsImage||Boolean(character.file));
 return <PreviewShell active="Creator">
  <section className="k4k-creator-heading"><div><span className="k4k-workspace-eyebrow">✦ K4K APP / CREATOR STUDIO</span><h1>{copy.title}<span>.</span></h1><p>{copy.intro}</p></div><Link href="/k4k-app/videos">▦ {pt?'Meus projetos':es?'Mis proyectos':'My projects'} ↗</Link></section>
  <div className="k4k-creator-modes" role="group" aria-label="Choose your creation workflow">{['Motion Transfer','Character Swap','Image to Video','Text to Video'].map(tab=><button type="button" key={tab} aria-pressed={activeTab===tab} className={tab===activeTab?'selected':''} onClick={()=>setActiveTab(tab)}>{tab}</button>)}</div>
  <p className="k4k-creator-mode-note">● {activeTab} · {pt?'Prévia do fluxo. Geração de IA desativada.':es?'Flujo en vista previa. Generación de IA desactivada.':'Workflow preview. AI generation is not enabled yet.'}</p>
  <div className="k4k-creator-layout">
   <div className="k4k-creator-primary">
    {needsVideo&&<section className="k4k-card k4k-creator-block">
     <div className="k4k-creator-block-title"><span>01 / REFERENCE</span><h2>{copy.reference}</h2><p>{pt?'Envie um vídeo de referência para o movimento e a cena.':es?'Sube un vídeo de referencia para el movimiento y la escena.':'Upload a reference video to guide the scene and motion.'}</p></div>
     <div className="k4k-creator-media">
      {video.url?<video src={video.url} controls playsInline preload="metadata" aria-label="Reference video preview"/>:<div className="k4k-creator-placeholder"><span>▶</span><strong>REFERENCE VIDEO</strong><small>MP4 / WEBM / MOV · MAX 150MB</small></div>}
     </div>
     <label className="k4k-creator-file-label">{copy.video}<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>choose(e,video,'video',MAX_VIDEO)}/></label>
     {video.file&&<div className="k4k-creator-file-status"><small>{video.file.name} · {(video.file.size/1048576).toFixed(1)} MB</small><button type="button" onClick={()=>video.setFile(null)}>{copy.remove}</button></div>}
    </section>}
    {needsImage&&<section className="k4k-card k4k-creator-block">
     <div className="k4k-creator-block-title"><span>{needsVideo?'02':'01'} / CHARACTER</span><h2>{copy.image}</h2><p>{pt?'Escolha fotos nítidas dos personagens que quer criar.':es?'Elige fotos claras de los personajes.':'Choose clear character images. Each image remains yours.'}</p></div>
     <div className="k4k-creator-media k4k-creator-photo-preview">
      {character.url?<img src={character.url} alt="Primary character reference"/>:<div className="k4k-creator-placeholder"><span>✦</span><strong>YOUR CHARACTER</strong><small>JPG / PNG / WEBP · MAX 10MB</small></div>}
     </div>
     <label className="k4k-creator-file-label">{copy.photo}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>choose(e,character,'image',MAX_IMAGE)}/></label>
     {character.file&&<div className="k4k-creator-file-status"><small>{character.file.name} · {(character.file.size/1048576).toFixed(1)} MB</small><button type="button" onClick={()=>{character.setFile(null);setSavedReference(null);setDraftMessage('')}}>{copy.remove}</button></div>}
     <div className="k4k-creator-gallery"><div><strong>Character gallery · {extraImages.length+(character.file?1:0)} / 30</strong><p>Additional references are local to this browser; they are not uploaded automatically.</p></div><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addExtraImages} aria-label="Add character references" />
     {extraImages.length>0&&<div className="k4k-creator-gallery-grid">{extraImages.map((item,index)=><div key={item.url}><img src={item.url} alt={'Additional character reference '+(index+1)}/><button type="button" onClick={()=>removeExtraImage(index)} aria-label={'Remove reference '+(index+1)}>✕</button></div>)}</div>}</div>
     {character.file&&<button type="button" onClick={saveReference} disabled={uploading} className="k4k-creator-save">{uploading?'Saving…':pt?'Salvar referência privada':es?'Guardar referencia privada':'Save primary reference privately'}</button>}
     {uploadMessage&&<p role="status" className="k4k-creator-message">{uploadMessage}</p>}
     {savedReference&&<button type="button" onClick={saveDraft} disabled={savingDraft} className="k4k-creator-draft">{savingDraft?'Saving…':pt?'Salvar rascunho':es?'Guardar borrador':'Save project draft'}</button>}
     {draftMessage&&<p role="status" className="k4k-creator-message">{draftMessage}</p>}
    </section>}
    <section className="k4k-card k4k-creator-block">
     <div className="k4k-creator-block-title"><span>{needsVideo?'03':needsImage?'02':'01'} / SETTINGS</span><h2>{copy.model}</h2><p>{pt?'Escolha as configurações para preparar o projeto.':es?'Selecciona los ajustes para preparar el proyecto.':'Choose your creative settings before you save the project.'}</p></div>
     <div className="k4k-creator-settings"><label>Mode<select value={model} onChange={e=>setModel(e.target.value)}><option value="standard">K4K Standard · Preview</option><option value="premium">K4K Premium · Preview</option></select></label><label>Quality<select value={quality} onChange={e=>setQuality(e.target.value)}><option>480p</option><option>720p</option><option>1080p</option></select></label><label>Target duration · {duration}s<input type="range" min="3" max="30" step="1" value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label></div>
     <label className="k4k-creator-prompt-label">{copy.prompt}<textarea value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,1200))} maxLength={1200} rows={4} placeholder={copy.placeholder}/></label>
     {error&&<p role="alert" className="k4k-creator-error">{error}</p>}
     <p className="k4k-creator-ready">{ready?copy.ready:copy.waiting}</p>
     <button type="button" disabled className="k4k-creator-generate">✦ {copy.disabled}</button>
     <p className="k4k-creator-privacy"><small>{copy.privacy}</small></p>
    </section>
   </div>
   <aside className="k4k-creator-aside">
    <section className="k4k-card k4k-creator-sidecard">
     <div className="k4k-creator-sidecard-head"><div><span className="k4k-workspace-eyebrow">SAVED WORK</span><h2>My Generations</h2></div><button type="button" onClick={loadHistory}>↻ Refresh</button></div>
     {historyState&&<p role="status">{historyState}</p>}
     {history.map(job=><div className="k4k-creator-job" key={job.id}><span>{job.model||'Preview'} · {new Date(job.created_at).toLocaleDateString()}</span><strong>{job.status}</strong></div>)}
     <Link href="/k4k-app/videos">View all projects ↗</Link>
    </section>
    <section className="k4k-card k4k-creator-sidecard"><span className="k4k-workspace-eyebrow">YOUR NEXT STORY</span><h2>Start from a viral template.</h2><p>Choose a scene, select the characters and prepare a new project in the K4K template studio.</p><Link className="k4k-creator-library" href="/k4k-app#templates">Explore templates ↗</Link></section>
    <section className="k4k-card k4k-creator-sidecard"><span className="k4k-workspace-eyebrow">ACCOUNT & SUPPORT</span><p>Need help with references, drafts or your account?</p><Link href="/k4k-app/support">Contact K4K Support ↗</Link></section>
   </aside>
  </div>
 </PreviewShell>;

}
