'use client';
import {useEffect,useRef,useState} from 'react';
import './creator.css';
import Link from 'next/link';
import {Upload,Film,Images,ArrowUpRight,ArrowRight,Sparkles,FolderOpen,Check,Plus,X,Play} from 'lucide-react';
import PreviewShell from '../PreviewShell';
import VideoLibrary from '../VideoLibrary';
import catalogue from '../template-catalogue.json';
import {useK4KLocale} from '../locale';
import {createClient} from '../../../lib/supabase/client';

const MAX_VIDEO=50*1024*1024;
const MAX_IMAGE=10*1024*1024;
const IMAGE_TYPES=['image/png','image/jpeg','image/webp'];
const VIDEO_TYPES=['video/mp4'];
function useLocalPreview(){
 const [file,setFile]=useState(null);
 const [url,setUrl]=useState('');
 useEffect(()=>{if(!file){setUrl('');return;}const objectUrl=URL.createObjectURL(file);setUrl(objectUrl);return()=>URL.revokeObjectURL(objectUrl)},[file]);
 return {file,url,setFile};
}
export default function Creator(){
 const {locale}=useK4KLocale();
 const video=useLocalPreview(),character=useLocalPreview();
 const [extraImages,setExtraImages]=useState([]),[activeTab,setActiveTab]=useState('Motion Transfer'),[quality,setQuality]=useState('720p');
 const extraUrlRegistry=useRef(new Set());
 useEffect(()=>()=>{extraUrlRegistry.current.forEach(url=>URL.revokeObjectURL(url));extraUrlRegistry.current.clear()},[]);
 function removeExtraImage(index){setExtraImages(old=>old.filter((item,i)=>{if(i===index){URL.revokeObjectURL(item.url);extraUrlRegistry.current.delete(item.url);}return i!==index;}));}
 const [selectedPreset,setSelectedPreset]=useState(null),[presetFilter,setPresetFilter]=useState('trending'),[creatorOpen,setCreatorOpen]=useState(false),[assetsOpen,setAssetsOpen]=useState(false);
 const [optionsOpen,setOptionsOpen]=useState(false),[style,setStyle]=useState('None'),[batchSize,setBatchSize]=useState(1);
 const [error,setError]=useState('');
 const [prompt,setPrompt]=useState('');
 const [workspaceView,setWorkspaceView]=useState('library'),[promptOpen,setPromptOpen]=useState(false),[templateSearch,setTemplateSearch]=useState(''),[preparing,setPreparing]=useState(false);
 useEffect(()=>{if(new URL(window.location.href).searchParams.get('view')==='history')setWorkspaceView('history')},[]);
 const [model,setModel]=useState('pro');
 const [preflightBusy,setPreflightBusy]=useState(false),[preflightResult,setPreflightResult]=useState(null),[preflightError,setPreflightError]=useState('');
 const [uploading,setUploading]=useState(false),[uploadMessage,setUploadMessage]=useState('');
 const [savedReference,setSavedReference]=useState(null),[savingDraft,setSavingDraft]=useState(false),[draftMessage,setDraftMessage]=useState('');
 const [generationDraftId,setGenerationDraftId]=useState(null),[generationQuote,setGenerationQuote]=useState(null),[generationBusy,setGenerationBusy]=useState(false),[generationMessage,setGenerationMessage]=useState(''),[submittedJobId,setSubmittedJobId]=useState(null);
 const generationRequestKey=useRef(null);
 const generationActionRef=useRef(null);
 useEffect(()=>{if(!submittedJobId)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')generationActionRef.current?.('refresh')},15000);return()=>clearInterval(timer)},[submittedJobId]);
 const [history,setHistory]=useState([]),[historyState,setHistoryState]=useState('');
 async function loadHistory(){setHistoryState('Loading your generation history…');try{const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();if(authError||!user)throw new Error('Sign in to view your generation history.');const {data,error}=await client.from('studio_generation_jobs').select('id,status,model,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(15);if(error)throw error;setHistory(data||[]);setHistoryState(data?.length?'':'No generation drafts or jobs yet.');}catch(e){setHistoryState(e?.message||'Could not load history.')}}
 async function checkGenerationEstimate(){
  setPreflightError('');setPreflightResult(null);
  if(preflightBusy)return;
  const source=video.file;
  if(!source){setPreflightError('Upload an MP4 reference video to estimate generation. Gallery presets cannot be estimated until saved as owned media.');return;}
  const imageCount=extraImages.length+(character.file?1:0);
  if(imageCount<1||imageCount>8){setPreflightError('Choose between 1 and 8 character images for either model.');return;}
  setPreflightBusy(true);
  try{
   const duration=await new Promise((resolve,reject)=>{
    const objectUrl=URL.createObjectURL(source),element=document.createElement('video');
    const cleanup=()=>{element.removeAttribute('src');element.load();URL.revokeObjectURL(objectUrl)};
    element.preload='metadata';element.onloadedmetadata=()=>{const seconds=element.duration;cleanup();Number.isFinite(seconds)&&seconds>0?resolve(seconds):reject(new Error('Cannot read video duration.'))};
    element.onerror=()=>{cleanup();reject(new Error('Cannot read video metadata.'))};element.src=objectUrl;
   });
   if(model==='lite'&&duration>15)throw new Error('K4K Lite supports up to 15 seconds. Trim your video before generating.');
   if(model==='pro'&&(duration<4||duration>30))throw new Error('K4K Pro requires a video between 4 and 30 seconds.');
   const client=createClient();const {data:{session},error:sessionError}=await client.auth.getSession();
   if(sessionError||!session?.access_token)throw new Error('Sign in to check generation costs.');
   const response=await fetch('/api/generation/preflight',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({tier:model,resolution:quality,sourceSeconds:duration,imageCount})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Unable to estimate provider cost.');
   setPreflightResult(result);
  }catch(e){setPreflightError(e?.message||'Could not estimate cost.')}finally{setPreflightBusy(false)}
 }
 async function saveDraft(referenceOverride=null){
  const reference=referenceOverride||savedReference;
  if(!reference||savingDraft)return;
  setSavingDraft(true);setDraftMessage('');
  try{
   if(!character.file||character.file!==reference.file||video.file!==reference.videoFile||(selectedPreset?.id||null)!==reference.presetId||extraImages.length!==reference.extraFiles.length||extraImages.some((item,i)=>item.file!==reference.extraFiles[i]))throw new Error('Attachments changed. Save all current images again before saving the draft.');
   const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user||user.id!==reference.userId)throw new Error('Please sign in again to save your draft.');
   const {data,error}=await client.from('studio_generation_jobs').insert({user_id:user.id,template_id:reference.presetId||'creator-upload-preview',provider:'higgsfield',model,status:'draft',reference_paths:reference.paths,reference_video_path:reference.videoPath,main_reference_index:0,prompt:prompt.trim(),credits_reserved:0}).select('id').single();
   if(error)throw error;
   setGenerationDraftId(data.id);setGenerationQuote(null);generationRequestKey.current=crypto.randomUUID();
   setDraftMessage('Draft saved: '+data.id+'. All '+reference.paths.length+' image attachments and your prompt are saved privately. Reference video saved privately when supplied. No generation started and no credits charged.');await loadHistory();return data.id;
  }catch(e){setDraftMessage(e?.message||'Unable to save draft.')}finally{setSavingDraft(false)}
 }
 async function generationAction(action,jobOverride=null){
  if(generationBusy)return;
  const jobId=jobOverride||(action==='refresh'?submittedJobId:generationDraftId);
  if(!jobId){setGenerationMessage('Save your reference media and draft before reviewing generation cost.');return;}
  setGenerationBusy(true);setGenerationMessage('');
  try{
   const {data:{session}}=await createClient().auth.getSession();
   if(!session?.access_token)throw Error('Sign in to continue.');
   const response=await fetch('/api/generation/jobs/'+action,{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({jobId,resolution:quality,quoteToken:generationQuote?.quoteToken,requestKey:generationRequestKey.current})});
   const result=await response.json();
   if(result.error){
    if(result.reconciliationRequired){setSubmittedJobId(jobId);setGenerationDraftId(null);setGenerationQuote(null);setGenerationMessage('Submission outcome is uncertain. Credits remain reserved while the job is reconciled. Do not submit another generation.');return;}
    const messages={INSUFFICIENT_CREDITS:'You do not have enough credits for this generation.',IDEMPOTENCY_CONFLICT:'This request was already used. Check your job history before generating again.',TEST_GENERATION_NOT_AUTHORIZED:'This account is not authorized for paid preview testing.',PROVIDER_BUDGET_BLOCKED:'This generation exceeds the approved preview spending cap.',PROVIDER_QUOTE_REQUIRES_PRICE_POLICY:'Higgsfield authentication works. This model returns pricing rules instead of a fixed quote. Generation is blocked until the owner approves the pricing policy.',GENERATION_DISABLED:'Generation needs owner activation. No credits were charged.',CREDIT_PRICING_NOT_APPROVED:'Credit pricing needs owner approval. No credits were charged.',QUOTE_CHANGED:'The quote changed. Review a fresh quote before generating.',QUOTE_EXPIRED:'The quote expired. Review a fresh quote.',PROVIDER_CREDENTIALS_REJECTED:'The provider rejected the saved API credential.',GENERATION_UNAVAILABLE:'Generation is unavailable. Please try again or contact support.'};
    if(action==='submit')setGenerationQuote(null);
    throw Error(messages[result.error]||'Unable to continue ('+result.error+').');
   }
   if(!response.ok)throw Error('Unable to continue.');
   if(action==='quote'){
    setGenerationQuote({...result,reviewedAt:Date.now()});
    setGenerationMessage(result.blocker==='CREDIT_PRICING_NOT_APPROVED'?'Higgsfield authenticated and quoted this draft. Customer credit pricing still needs owner approval.':result.blocker==='GENERATION_DISABLED'?'Quote verified. Generation is awaiting owner activation.':'Review the credit cost below before generating.');
   }else if(action==='submit'){
    setSubmittedJobId(jobId);setGenerationDraftId(null);setGenerationQuote(null);setGenerationMessage(result.creditsRefunded?'The provider rejected this request. Reserved credits were refunded.':'Generation submitted. Credits reserved: '+result.creditsReserved+'.');await loadHistory();
   }else{if(['completed','failed','cancelled'].includes(result.status)){setSubmittedJobId(null);if(result.status==='completed')setWorkspaceView('history')}setGenerationMessage(result.creditsRefunded?'Generation failed. Reserved credits were refunded.':'Job status: '+result.status+(result.status==='awaiting_output'?' — private video delivery is pending.':''));await loadHistory();}
  }catch(error){setGenerationMessage(error.message||'Unable to continue.');}
  finally{setGenerationBusy(false);}
 }
 useEffect(()=>{generationActionRef.current=generationAction});
 useEffect(()=>{setGenerationDraftId(null);setGenerationQuote(null);generationRequestKey.current=null;},[model,quality,prompt,video.file,character.file,extraImages,selectedPreset]);
 async function saveReference(){
  if(!character.file||uploading)return;
  if(!video.file&&!selectedPreset){setUploadMessage('Choose a template or upload a reference video first.');return;}
  setUploadMessage('');setUploading(true);
  try{
   if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)throw new Error('Storage is not configured for this preview.');
   const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user)throw new Error('Sign in to your K4K APP account before saving an image.');
   if(!IMAGE_TYPES.includes(character.file.type)||character.file.size>MAX_IMAGE)throw new Error(copy.limit);
   const files=[character.file,...extraImages.map(item=>item.file)];
   if(files.length>8||files.some(file=>!IMAGE_TYPES.includes(file.type)||file.size>MAX_IMAGE))throw new Error('Maximum 8 JPG, PNG or WebP images, 10 MB each.');
   const paths=[];
   for(const file of files){
    const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
    const path=user.id+'/'+crypto.randomUUID()+'.'+extension;
    const {error:uploadError}=await client.storage.from('studio-references').upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError)throw uploadError;
    paths.push(path);
   }
   let videoPath=null;
   if(video.file){
    if(video.file.type!=='video/mp4'||video.file.size>MAX_VIDEO)throw new Error('Reference video must be MP4, maximum 50 MB.');
    videoPath=user.id+'/'+crypto.randomUUID()+'.mp4';
    const {error:videoError}=await client.storage.from('studio-videos').upload(videoPath,video.file,{contentType:'video/mp4',upsert:false});
    if(videoError)throw videoError;
   }
   if(!video.file&&selectedPreset){
    const {data:{session}}=await client.auth.getSession();
    const response=await fetch('/api/generation/template-reference',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({templateId:selectedPreset.id})});
    const imported=await response.json();
    if(!response.ok)throw Error('Unable to save this template reference. Please try again.');
    videoPath=imported.videoPath;
   }
   const reference={paths,videoPath,presetId:selectedPreset?.id||null,videoFile:video.file,userId:user.id,file:character.file,extraFiles:extraImages.map(item=>item.file)};
   setSavedReference(reference);
   setUploadMessage(files.length+' image(s)'+(videoPath?' and reference video':'')+' saved privately. No AI generation or credit charge occurred.');return reference;
  }catch(e){setUploadMessage(e?.message||'Unable to save reference image.')}finally{setUploading(false)}
 }
 useEffect(()=>{setPreflightResult(null);setPreflightError('')},[model,quality,video.file,character.file,extraImages]);
 const pt=locale==='pt',es=locale==='es';
 const copy=pt?{title:'Estúdio de criação',intro:'Prepare seu vídeo e sua foto. O vídeo fica no navegador; você pode salvar a foto na sua conta.',reference:'Vídeo de referência',image:'Foto do personagem',prompt:'Instruções criativas (opcional)',placeholder:'Descreva o personagem, o cenário ou o resultado desejado...',model:'Modelo de geração',ready:'Prévia pronta para geração',waiting:'Adicione um vídeo e uma imagem para preparar seu projeto',disabled:'Geração de IA ainda desativada — nenhum crédito será cobrado.',back:'Explorar templates',video:'Escolher vídeo',photo:'Escolher foto',remove:'Remover',privacy:'O vídeo fica neste navegador. A foto só é enviada ao armazenamento privado se você clicar em Salvar.',limit:'Arquivo inválido ou acima do limite permitido.'}:es?{title:'Estudio de creación',intro:'Prepara tu vídeo y foto. El vídeo permanece en tu navegador; puedes guardar la foto en tu cuenta.',reference:'Vídeo de referencia',image:'Foto del personaje',prompt:'Instrucciones creativas (opcional)',placeholder:'Describe el resultado deseado...',model:'Modelo de generación',ready:'Vista previa lista',waiting:'Añade un vídeo y una imagen',disabled:'Generación desactivada — no se cobran créditos.',back:'Explorar plantillas',video:'Elegir vídeo',photo:'Elegir foto',remove:'Quitar',privacy:'El vídeo permanece en tu navegador. La foto solo se sube si eliges guardarla.',limit:'Archivo no válido o demasiado grande.'}:{title:'Creator Studio',intro:'Prepare a reference video and character image. Your images and optional MP4 reference video can be saved privately.',reference:'Reference video',image:'Character photo',prompt:'Creative instructions (optional)',placeholder:'Describe the character, scene, or result you want...',model:'Generation model',ready:'Project ready for generation',waiting:'Add a video and an image to prepare your project',disabled:'AI generation is disabled — no credits will be charged.',back:'Explore templates',video:'Choose video',photo:'Choose photo',remove:'Remove',privacy:'Video stays in this browser. Images and an optional MP4 video are uploaded to private storage only when you choose Save reference media.',limit:'Invalid file or file exceeds the size limit.'};
 function choose(event,target,kind,max){const file=event.target.files?.[0];setError('');if(!file)return;if(!(kind==='image'?IMAGE_TYPES:VIDEO_TYPES).includes(file.type)||file.size>max){setError(copy.limit);event.target.value='';return;}target.setFile(file);setSavedReference(null);setDraftMessage('')}

  function addReferences(event){
   const files=Array.from(event.target.files||[]);event.target.value='';
   if(files.length+extraImages.length+(character.file?1:0)>8||files.some(file=>!IMAGE_TYPES.includes(file.type)||file.size>MAX_IMAGE)){setError('Choose up to 8 JPG, PNG or WebP images, 10 MB each.');return;}
   if(!files.length)return;
   setError('');setSavedReference(null);setDraftMessage('');
   if(!character.file)character.setFile(files.shift());
   const next=files.map(file=>{const url=URL.createObjectURL(file);extraUrlRegistry.current.add(url);return {file,url};});
   setExtraImages(old=>[...old,...next]);
  }
  async function prepareProject(){
   if(preparing||generationBusy)return;
   setPreparing(true);
   try{
    const unchanged=savedReference&&savedReference.file===character.file&&savedReference.videoFile===video.file&&savedReference.presetId===(selectedPreset?.id||null)&&savedReference.extraFiles.length===extraImages.length&&extraImages.every((item,i)=>item.file===savedReference.extraFiles[i]);
    const reference=unchanged?savedReference:await saveReference();
    if(!reference)return;
    const jobId=generationDraftId||await saveDraft(reference);
    if(jobId)await generationAction('quote',jobId);
   }finally{setPreparing(false)}
  }
  const tr=(en,br,esText)=>pt?br:es?esText:en;
  const referenceCount=extraImages.length+(character.file?1:0);
  const previewUrl=video.url||selectedPreset?.videoUrl;
  const previewTitle=video.file?.name||selectedPreset?.title||tr('Your next scene starts here.','Sua próxima cena começa aqui.','Tu próxima escena empieza aquí.');
  return <PreviewShell active="Creator" studio>
   <div className={'ks k4k-creator-layout ks-view-'+workspaceView}>
    <aside className="ks-panel" aria-label="Video creation settings">
     <div className="ks-panel-title"><span><Sparkles size={17}/> {tr('Create video','Criar vídeo','Crear vídeo')}</span><span className="ks-preview-badge">PREVIEW</span></div>
     <div className="ks-workflow-nav"><button type="button" aria-pressed={workspaceView==='library'} onClick={()=>setWorkspaceView('library')}>{tr('Create video','Criar vídeo','Crear vídeo')}</button><button type="button" aria-pressed={workspaceView==='history'} onClick={()=>setWorkspaceView('history')}>{tr('My library','Biblioteca','Biblioteca')}</button><button type="button" aria-pressed={workspaceView==='guide'} onClick={()=>setWorkspaceView('guide')}>{tr('Learn','Aprender','Aprender')}</button></div><div className="ks-model-banner"><img src="/posters/k4k-019.webp" alt=""/><div><img src="/k4k-mark.svg" alt="K4K"/><strong>K4K MOTION STUDIO</strong><small>Reality. Recast by you.</small></div></div><div className="ks-mode"><Film size={15}/><div><strong>{tr('Motion transfer','Transferência de movimento','Transferencia de movimiento')}</strong><small>{tr('Same motion. Your characters.','Mesmo movimento. Seus personagens.','Mismo movimiento. Tus personajes.')}</small></div></div>
     <section className="ks-input-section"><div className="ks-label"><label htmlFor="ks-video">{tr('Motion reference','Vídeo de referência','Vídeo de referencia')}</label><small>01</small></div>
      <label className={'ks-upload'+(previewUrl?' has-media':'')} htmlFor="ks-video" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files?.[0];if(file){setSelectedPreset(null);choose({target:{files:[file],value:''}},video,'video',MAX_VIDEO)}}}>
       {previewUrl?<><video src={previewUrl} muted playsInline preload="metadata" poster={selectedPreset?.posterUrl||undefined}/><span className="ks-replace"><Upload size={13}/>{tr('Replace video','Trocar vídeo','Cambiar vídeo')}</span></>:<><Upload size={23}/><strong>{tr('Drop your scene in','Adicione sua cena','Añade tu escena')}</strong><small>MP4 · 50 MB · {model==='lite'?'≤15s':'4–30s'}</small></>}
       <input id="ks-video" type="file" accept="video/mp4" onChange={e=>{if(e.target.files?.length){setSelectedPreset(null);choose(e,video,'video',MAX_VIDEO)}}}/>
      </label>
      {video.file&&<div className="ks-file"><span>{video.file.name}</span><button type="button" aria-label="Remove reference video" onClick={()=>video.setFile(null)}><X size={13}/></button></div>}
      {selectedPreset&&<p className="ks-inline-note">{tr('Ready to recreate. Add your character photos and save the media.','Pronto para recriar. Adicione suas fotos e salve os arquivos.','Listo para recrear. Añade tus fotos y guarda los archivos.')}</p>}
     </section>
     <section className="ks-input-section"><div className="ks-label"><label htmlFor="ks-images">{tr('Characters & references','Personagens e referências','Personajes y referencias')}</label><small>{referenceCount}/8</small></div>
      <div className="ks-references" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addReferences({target:{files:e.dataTransfer.files,value:''}})}}>
       {character.url&&<div className="ks-reference"><img src={character.url} alt="Main character"/><button type="button" aria-label="Remove main character" onClick={()=>{character.setFile(null);setSavedReference(null)}}><X size={11}/></button><small>01</small></div>}
       {extraImages.map((item,i)=><div className="ks-reference" key={item.url}><img src={item.url} alt={'Reference '+(i+2)}/><button type="button" aria-label={'Remove reference '+(i+2)} onClick={()=>removeExtraImage(i)}><X size={11}/></button><small>{String(i+2).padStart(2,'0')}</small></div>)}
       {referenceCount<8&&<label className="ks-add-reference" htmlFor="ks-images"><Plus size={21}/><span>{tr('Add photo','Adicionar foto','Añadir foto')}</span><input id="ks-images" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addReferences}/></label>}
      </div>
      <p className="ks-inline-note">{tr('Clear photos. Consistent identity. Up to 8 images.','Fotos nítidas. Identidade consistente. Até 8 imagens.','Fotos claras. Identidad consistente. Hasta 8 imágenes.')}</p>
     </section>
     <div className="ks-setting-row"><label>{tr('Model','Modelo','Modelo')}<select value={model} onChange={e=>setModel(e.target.value)}><option value="pro">K4K Motion Pro</option><option value="lite">K4K Motion Lite</option></select></label><label>{tr('Resolution','Resolução','Resolución')}<select value={quality} onChange={e=>setQuality(e.target.value)}><option>480p</option><option>720p</option><option>1080p</option></select></label></div>
     <button type="button" className="ks-prompt-toggle" aria-expanded={promptOpen} aria-controls="ks-prompt" onClick={()=>setPromptOpen(!promptOpen)}>{tr('Prompt','Instruções','Instrucciones')}<span>{promptOpen?'On':'Off'}</span></button><label hidden={!promptOpen} className="ks-prompt-label" htmlFor="ks-prompt">{tr('Creative direction','Direção criativa','Dirección creativa')}<span>{tr('Optional','Opcional','Opcional')}</span></label><textarea hidden={!promptOpen} id="ks-prompt" className="ks-prompt" value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,1200))} maxLength={1200} rows={4} placeholder={tr('Keep the movement. Change the character, wardrobe or world…','Mantenha o movimento. Mude o personagem, a roupa ou o cenário…','Mantén el movimiento. Cambia el personaje, la ropa o el escenario…')}/>
     {error&&<p role="alert" className="ks-error">{error}</p>}
     {(uploadMessage||draftMessage)&&<details className="ks-save-details"><summary>{tr('Save details','Detalhes','Detalles')}</summary><p role="status">{uploadMessage}</p><p role="status">{draftMessage}</p></details>}
     <div className="ks-submit-area"><button type="button" className="ks-generate" disabled={generationBusy||preparing||uploading||!character.file||!previewUrl} onClick={prepareProject}><Sparkles size={17}/>{(generationBusy||preparing)?tr('Checking…','Verificando…','Verificando…'):tr('Review generation cost','Conferir custo','Revisar coste')}<ArrowRight size={17}/></button><p>{tr('Media is saved privately. Confirm credits before generating.','Arquivos salvos em privado. Confirme os créditos antes de gerar.','Archivos guardados en privado. Confirma los créditos antes de generar.')}</p></div>
    </aside>
    <section className="ks-workspace" aria-label="Preview and inspiration">
     <div className="ks-library-tabs" role="group" aria-label="Workspace view"><button type="button" aria-pressed={workspaceView==='history'} onClick={()=>{setWorkspaceView('history');loadHistory()}}><FolderOpen size={14}/>{tr('History','Histórico','Historial')}</button><button type="button" aria-pressed={workspaceView==='library'} onClick={()=>setWorkspaceView('library')}><Film size={14}/>{tr('Motion library','Biblioteca de movimentos','Biblioteca de movimiento')}</button><button type="button" aria-pressed={workspaceView==='guide'} onClick={()=>setWorkspaceView('guide')}>{tr('How it works','Como funciona','Cómo funciona')}</button></div>
     {workspaceView==='guide'&&<section className="ks-guide"><h2>{tr('Your next scene, in three steps.','Sua próxima cena, em três passos.','Tu próxima escena, en tres pasos.')}</h2><ol><li>{tr('Upload your motion reference video.','Envie seu vídeo de referência.','Sube tu vídeo de referencia.')}</li><li>{tr('Add clear photos of your characters.','Adicione fotos nítidas dos personagens.','Añade fotos claras de tus personajes.')}</li><li>{tr('Save your draft and review the generation cost.','Salve o projeto e confira o custo de geração.','Guarda tu proyecto y revisa el coste.')}</li></ol></section>}
     {workspaceView==='history'&&<VideoLibrary embedded onReuse={job=>{setModel(job.model==='lite'?'lite':'pro');setPrompt(job.prompt||'');setPromptOpen(true);setWorkspaceView('library');setGenerationMessage(tr('Creative settings copied. Choose a reference video and character photos to create a new draft.','Configurações copiadas. Escolha um vídeo e fotos para criar um novo projeto.','Ajustes copiados. Elige un vídeo y fotos para crear un nuevo proyecto.'))}}/>}
     {workspaceView==='library'&&<>
     <header className="ks-library-hero"><div><span className="ks-eyebrow">K4K ORIGINALS / MOTION LIBRARY</span><h1>{tr('ONE VIDEO. ENDLESS POSSIBILITIES.','UM VÍDEO. INFINITAS POSSIBILIDADES.','UN VÍDEO. INFINITAS POSIBILIDADES.')}</h1><p>{tr('Keep the motion. Recast the characters. Turn the scene everyone is watching into the one they remember you for.','Mantenha o movimento. Troque os personagens. Transforme a cena que todos assistem na cena pela qual vão lembrar de você.','Conserva el movimiento. Cambia los personajes. Convierte la escena que todos ven en la que recordarán por ti.')}</p></div><video src={catalogue.trending[0].videoUrl} poster={catalogue.trending[0].posterUrl} muted autoPlay loop playsInline onClick={e=>{e.currentTarget.muted=!e.currentTarget.muted}} aria-label="K4K original video — tap for sound"/></header>
     <div hidden={!previewUrl} className={'ks-canvas'+(previewUrl?' ks-canvas-filled':'')}>
      {previewUrl?<><video key={previewUrl} src={previewUrl} controls playsInline preload="metadata" poster={selectedPreset?.posterUrl||undefined} aria-label="Reference video preview"/><div className="ks-canvas-caption"><span>REFERENCE PREVIEW</span><strong>{previewTitle}</strong></div></>:<div className="ks-canvas-empty"><div className="ks-empty-icon"><Film size={28}/><span>✦</span></div><span className="ks-eyebrow">FROM REFERENCE TO REINVENTION</span><h2>{tr('One scene.','Uma cena.','Una escena.')}<br/><em>{tr('Your entire imagination.','Toda a sua imaginação.','Toda tu imaginación.')}</em></h2><p>{tr('Add a reference video and your character photos. Keep the movement. Give it a new identity.','Adicione um vídeo de referência e fotos dos personagens. Mantenha o movimento. Dê uma nova identidade.','Añade un vídeo y fotos de tus personajes. Conserva el movimiento. Dale una nueva identidad.')}</p><label htmlFor="ks-video" className="ks-canvas-upload"><Upload size={15}/>{tr('Upload your reference','Enviar referência','Subir referencia')}</label><small>{tr('Your preview appears here','Sua prévia aparece aqui','Tu vista previa aparece aquí')}</small></div>}
      <div className="ks-canvas-meta"><span><i/> {model==='lite'?'MOTION LITE':'MOTION PRO'}</span><span>{quality} · {referenceCount} {tr('references','referências','referencias')}</span></div>
     </div>
     <section className="ks-confirmation" aria-label="Generation confirmation">
      {generationQuote&&<><div><span className="ks-eyebrow">{tr('YOUR GENERATION','SUA GERAÇÃO','TU GENERACIÓN')}</span><h3>{generationQuote.customerCredits===null?tr('Pricing awaiting approval','Preço aguardando aprovação','Precio pendiente de aprobación'):generationQuote.customerCredits+' credits'}</h3><p>{tr('Quote valid for five minutes. Verified failures refund reserved credits.','Custo válido por cinco minutos. Falhas confirmadas devolvem os créditos.','Coste válido por cinco minutos. Los fallos confirmados devuelven los créditos.')}</p></div>{generationQuote.generationEnabled&&generationQuote.quoteToken&&<button type="button" disabled={generationBusy} onClick={()=>generationAction('submit')}>Confirm generation · {generationQuote.customerCredits} credits <ArrowRight size={15}/></button>}</>}
      {generationMessage&&<p role="status" aria-live="polite">{generationMessage}</p>}
      {submittedJobId&&<button type="button" disabled={generationBusy} onClick={()=>generationAction('refresh')}>{tr('Check generation status','Verificar geração','Comprobar generación')}</button>}
     </section>
     <section className="ks-inspiration"><div className="ks-section-heading"><div><span className="ks-eyebrow">THE STARTING POINT</span><h2>{tr('Borrow the motion. Own the idea.','Inspire-se no movimento. Crie sua ideia.','Toma el movimiento. Haz tuya la idea.')}</h2></div><Link href="/k4k-app/explore">{tr('Explore all','Explorar todos','Explorar todo')}<ArrowUpRight size={15}/></Link></div><div className="ks-template-tools"><div role="group" aria-label="Motion library filter"><button type="button" aria-pressed={presetFilter!=='short'} onClick={()=>setPresetFilter('trending')}>{tr('K4K originals','Originais K4K','Originales K4K')}</button><button type="button" aria-pressed={presetFilter==='short'} onClick={()=>setPresetFilter('short')}>{tr('15 seconds or less','Até 15 segundos','Hasta 15 segundos')}</button></div><input aria-label="Search motion templates" placeholder={tr('Search scenes…','Buscar cenas…','Buscar escenas…')} value={templateSearch} onChange={e=>setTemplateSearch(e.target.value)}/></div><div className="ks-template-grid">{catalogue.trending.filter(preset=>(presetFilter!=='short'||preset.durationSeconds<=15)&&preset.title.toLowerCase().includes(templateSearch.toLowerCase())).map(preset=><button type="button" key={preset.id} className={'ks-template'+(selectedPreset?.id===preset.id?' selected':'')} aria-pressed={selectedPreset?.id===preset.id} onClick={()=>{setSelectedPreset(preset);setWorkspaceView('library');video.setFile(null);setSavedReference(null);setDraftMessage('')}}><div><video src={preset.videoUrl} muted playsInline preload="metadata" poster={preset.posterUrl||undefined} onMouseEnter={e=>e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>e.currentTarget.pause()}/><span><Play size={12}/>{Math.round(preset.durationSeconds)}s</span></div><strong>{preset.title}</strong><small>{preset.requiredImages} {tr('reference photos','fotos de referência','fotos de referencia')}</small></button>)}</div></section>
     <details className="ks-history"><summary><FolderOpen size={16}/>{tr('Saved drafts & activity','Projetos salvos e atividade','Proyectos guardados y actividad')}</summary><button type="button" onClick={loadHistory}>{tr('Refresh history','Atualizar histórico','Actualizar historial')}</button>{historyState&&<p role="status">{historyState}</p>}{history.map(job=><p key={job.id}><span>{job.model==='lite'?'Motion Lite':'Motion Pro'}</span><span>{job.status}</span></p>)}</details>
     <p className="ks-status-note">{tr('Preview workspace · AI generation is disabled until activation. No credits are charged for preparing a draft.','Estúdio em prévia · geração de IA aguardando ativação. Preparar projetos não consome créditos.','Estudio en vista previa · generación pendiente de activación. Preparar proyectos no consume créditos.')}</p>
     </>}
    </section>
   </div>
  </PreviewShell>;
}
