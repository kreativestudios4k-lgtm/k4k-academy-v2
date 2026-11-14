'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import './creator.css';
import Link from 'next/link';
import {Upload,Film,Images,ArrowUpRight,ArrowRight,Sparkles,FolderOpen,Check,Plus,X,Play} from 'lucide-react';
import PreviewShell from '../PreviewShell';
import VideoLibrary from '../VideoLibrary';
import CheckoutReturn from '../CheckoutReturn';
import catalogue from '../template-catalogue.json';
import {canConfirmGeneration,generationQuoteFeedback} from '../../../lib/generation-feedback.mjs';
import {motionCreditPreview,maySubmitDisplayedQuote} from '../../../lib/generation-experience.mjs';
import {useK4KLocale} from '../locale';
import {createClient} from '../../../lib/supabase/client';
import {buildCharacterDirection,MAX_CHARACTER_TARGET} from '../../../lib/character-direction.mjs';

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
 const [characterTargets,setCharacterTargets]=useState(()=>new Map());
 const targetFor=file=>characterTargets.get(file)||'';
 function setCharacterTarget(file,value){setCharacterTargets(old=>{const next=new Map(old);if(value)next.set(file,value);else next.delete(file);return next})}
 const [workspaceView,setWorkspaceView]=useState('library'),[promptOpen,setPromptOpen]=useState(false),[templateSearch,setTemplateSearch]=useState(''),[preparing,setPreparing]=useState(false);
 useEffect(()=>{if(new URL(window.location.href).searchParams.get('view')==='history')setWorkspaceView('history')},[]);
 const [model,setModel]=useState('lite');
 const [preflightBusy,setPreflightBusy]=useState(false),[preflightResult,setPreflightResult]=useState(null),[preflightError,setPreflightError]=useState('');
 const [uploading,setUploading]=useState(false),[uploadMessage,setUploadMessage]=useState('');
 const [savedReference,setSavedReference]=useState(null),[savingDraft,setSavingDraft]=useState(false),[draftMessage,setDraftMessage]=useState('');
 const [generationDraftId,setGenerationDraftId]=useState(null),[generationQuote,setGenerationQuote]=useState(null),[generationBusy,setGenerationBusy]=useState(false),[generationMessage,setGenerationMessage]=useState(''),[submittedJobId,setSubmittedJobId]=useState(null);
 const generationRequestKey=useRef(null),generationActionLock=useRef(false),prepareLock=useRef(false);
 const [libraryFocusId,setLibraryFocusId]=useState(null),[optimisticGeneration,setOptimisticGeneration]=useState(null);
 const [localEstimate,setLocalEstimate]=useState(null),[estimateReading,setEstimateReading]=useState(false),[estimateError,setEstimateError]=useState('');
 const onActiveJobStatus=useCallback(job=>{if(['completed','failed','cancelled'].includes(job.status)){setSubmittedJobId(current=>current===job.id?null:current);setGenerationMessage(job.status==='completed'?'Your video is ready to play and download.':'Generation has stopped. Check the video details.')}},[]);
 useEffect(()=>{if(workspaceView==='history')window.scrollTo({top:0,behavior:'smooth'})},[workspaceView]);
 useEffect(()=>{
  let stopped=false,media,timer;
  setLocalEstimate(null);setEstimateError('');
  function apply(seconds){if(stopped)return;try{setLocalEstimate(motionCreditPreview(model,seconds));setEstimateError('')}catch{setEstimateError('Use a reference video between 2 and 15 seconds.')}setEstimateReading(false)}
  if(video.file&&video.url){
   setEstimateReading(true);media=document.createElement('video');media.preload='metadata';
   timer=setTimeout(()=>{if(!stopped){setEstimateError('Unable to read this video. Try another MP4.');setEstimateReading(false)}},10000);
   media.onloadedmetadata=()=>{clearTimeout(timer);apply(media.duration)};
   media.onerror=()=>{clearTimeout(timer);if(!stopped){setEstimateError('Unable to read this video. Try another MP4.');setEstimateReading(false)}};
   media.src=video.url;
  }else if(selectedPreset){setEstimateReading(true);apply(selectedPreset.durationSeconds)}else setEstimateReading(false);
  return()=>{stopped=true;clearTimeout(timer);if(media){media.onloadedmetadata=null;media.onerror=null;media.removeAttribute('src');media.load()}};
 },[video.file,video.url,selectedPreset,model]);
 const [quoteClock,setQuoteClock]=useState(Date.now);
 useEffect(()=>{if(!generationQuote)return;const timer=setInterval(()=>setQuoteClock(Date.now()),1000);return()=>clearInterval(timer)},[generationQuote]);
 const generationActionRef=useRef(null);
 useEffect(()=>{if(!submittedJobId||workspaceView==='history')return;const timer=setInterval(()=>{if(document.visibilityState==='visible')generationActionRef.current?.('refresh')},15000);return()=>clearInterval(timer)},[submittedJobId,workspaceView]);
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
   if(duration<2||duration>15)throw new Error('Motion references must be between 2 and 15 seconds for Lite and Pro.');
   const client=createClient();const {data:{session},error:sessionError}=await client.auth.getSession();
   if(sessionError||!session?.access_token)throw new Error('Sign in to check generation costs.');
   const response=await fetch('/api/generation/preflight',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({provider:'fal',tier:model,resolution:quality,sourceSeconds:duration,imageCount})});
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
   const {data,error}=await client.from('studio_generation_jobs').insert({user_id:user.id,template_id:reference.presetId||'creator-upload-preview',provider:'fal',model,status:'draft',reference_paths:reference.paths,reference_video_path:reference.videoPath,main_reference_index:0,prompt:buildCharacterDirection(prompt,[character.file,...extraImages.map(item=>item.file)].map(targetFor)),credits_reserved:0}).select('id').single();
   if(error)throw error;
   setGenerationDraftId(data.id);setGenerationQuote(null);generationRequestKey.current=crypto.randomUUID();
   setDraftMessage('Draft saved: '+data.id+'. All '+reference.paths.length+' image attachments and your prompt are saved privately. Reference video saved privately when supplied. No generation started and no credits charged.');await loadHistory();return data.id;
  }catch(e){const message=e?.message||'Unable to save draft.';setDraftMessage(message);setGenerationMessage(message);}finally{setSavingDraft(false)}
 }
 async function generationAction(action,jobOverride=null,displayedCredits=null){
  if(generationActionLock.current)return;
  const jobId=jobOverride||(action==='refresh'?submittedJobId:generationDraftId);
  if(!jobId){setGenerationMessage('Save your reference media and draft before generating.');return;}
  generationActionLock.current=true;setGenerationBusy(true);setGenerationMessage('');if(action==='quote')setGenerationQuote(null);
  function showInLibrary(status='processing',userId=null){
   setLibraryFocusId(jobId);setSubmittedJobId(status==='failed'?null:jobId);
   setOptimisticGeneration({id:jobId,user_id:userId,model,status,template_id:selectedPreset?.id||'creator-upload-preview',prompt,created_at:new Date().toISOString()});
   setGenerationDraftId(null);setGenerationQuote(null);setWorkspaceView('history');
  }
  try{
   const {data:{session}}=await createClient().auth.getSession();
   if(!session?.access_token)throw Error('Sign in to continue.');
   async function post(kind,quoteToken){
    const response=await fetch('/api/generation/jobs/'+kind,{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({jobId,resolution:quality,quoteToken,requestKey:generationRequestKey.current})});
    const result=await response.json();
    if(result.error){
     if(result.reconciliationRequired){showInLibrary('queued',session.user.id);throw Error('Checking your submission. Credits remain reserved; do not submit again.');}
     const messages={LEGACY_PROVIDER_RETIRED:'This older project used a retired provider. Create a new project to generate with K4K Motion.',MEDIA_REFERENCE_INVALID:'Save your reference media again before generating.',MEDIA_OWNERSHIP_INVALID:'This reference does not belong to your account. Save your own files again.',MEDIA_TYPE_INVALID:'Use a JPG, PNG or WebP image and MP4 video.',MEDIA_REFERENCE_COUNT_INVALID:'Choose 1–8 distinct character images.',MEDIA_NOT_FOUND:'A saved file is missing. Upload and save your references again.',MEDIA_SIZE_INVALID:'Images must be under 10 MB and videos under 50 MB.',MEDIA_SIGNATURE_INVALID:'A file does not match its format. Export it as JPG, PNG, WebP or MP4 and upload again.',REFERENCE_DURATION_OUT_OF_RANGE:'Use a reference video between 2 and 15 seconds.',INVALID_RESOLUTION:'K4K Motion uses 720p during early access.',PROVIDER_CREDENTIALS_MISSING:'The website connection is unavailable. No credits were charged.',PROVIDER_RATE_CARD_NOT_APPROVED:'Pricing needs owner setup. No credits were charged.',INSUFFICIENT_CREDITS:'You do not have enough credits for this video.',BILLING_REVIEW_REQUIRED:'Your account needs a billing review.',TEST_GENERATION_NOT_AUTHORIZED:'This account is not authorized for the private test.',PROVIDER_BUDGET_BLOCKED:'This video exceeds the preview test limit. Use Lite and the five-second reference.',GENERATION_DISABLED:'Generation is unavailable on this preview.',CREDIT_PRICING_NOT_APPROVED:'Credit pricing needs owner setup.',QUOTE_CHANGED:'The cost changed. Please review a fresh price.',QUOTE_EXPIRED:'The price expired. Please review it again.',PROVIDER_CREDENTIALS_REJECTED:'The video service is temporarily unavailable.'};
     if(kind==='submit')setGenerationQuote(null);
     throw Error(messages[result.error]||'Unable to continue. Please try again or contact support.');
    }
    if(!response.ok)throw Error('Unable to continue. Please try again.');
    return result;
   }
   let kind=action,result=await post(action,generationQuote?.quoteToken);
   if(action==='quote'){
    const reviewed={...result,reviewedAt:Date.now()};setGenerationQuote(reviewed);
    if(maySubmitDisplayedQuote(reviewed,displayedCredits)){
     setGenerationMessage('Starting your video…');kind='submit';result=await post('submit',reviewed.quoteToken);
    }else{
     setGenerationMessage(generationQuoteFeedback(result,locale));return;
    }
   }
   if(kind==='submit'){
    showInLibrary(result.creditsRefunded?'failed':result.status==='already_reserved'?'queued':result.status||'processing',session.user.id);
    setGenerationMessage(result.creditsRefunded?'Generation could not start. Reserved credits were refunded.':'Your video is generating. It appears at the top of your library.');await loadHistory();
   }else{
    if(['completed','failed','cancelled'].includes(result.status))setSubmittedJobId(null);
    setGenerationMessage(result.creditsRefunded?'Generation failed. Reserved credits were refunded.':'Video status: '+result.status);await loadHistory();
   }
  }catch(error){setGenerationMessage(error.message||'Unable to continue.');}
  finally{generationActionLock.current=false;setGenerationBusy(false);}
 }
 useEffect(()=>{generationActionRef.current=generationAction});
 useEffect(()=>{setGenerationDraftId(null);setGenerationQuote(null);setGenerationMessage('');generationRequestKey.current=null;},[model,quality,prompt,characterTargets,video.file,character.file,extraImages,selectedPreset]);
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
  }catch(e){const message=e?.message||'Unable to save reference media.';setUploadMessage(message);setGenerationMessage(message);}finally{setUploading(false)}
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
   if(prepareLock.current||generationActionLock.current||preparing||generationBusy||!localEstimate||estimateError)return;
   prepareLock.current=true;setPreparing(true);
   try{
    const unchanged=savedReference&&savedReference.file===character.file&&savedReference.videoFile===video.file&&savedReference.presetId===(selectedPreset?.id||null)&&savedReference.extraFiles.length===extraImages.length&&extraImages.every((item,i)=>item.file===savedReference.extraFiles[i]);
    const reference=unchanged?savedReference:await saveReference();
    if(!reference)return;
    const jobId=generationDraftId||await saveDraft(reference);
    if(jobId)await generationAction('quote',jobId,localEstimate.credits);
   }finally{prepareLock.current=false;setPreparing(false)}
  }
  const tr=(en,br,esText)=>pt?br:es?esText:en;
  const referenceCount=extraImages.length+(character.file?1:0);
  const previewUrl=video.url||selectedPreset?.videoUrl;
  const previewTitle=video.file?.name||selectedPreset?.title||tr('Your next scene starts here.','Sua próxima cena começa aqui.','Tu próxima escena empieza aquí.');
  return <PreviewShell active="Creator" studio>
   <CheckoutReturn/>
   <div className={'ks k4k-creator-layout ks-view-'+workspaceView}>
    <aside className="ks-panel" aria-label="Video creation settings">
     <div className="ks-panel-title"><span><Sparkles size={17}/> {tr('Create video','Criar vídeo','Crear vídeo')}</span><span className="ks-preview-badge">PREVIEW</span></div>
     <div className="ks-workflow-nav"><button type="button" aria-pressed={workspaceView==='library'} onClick={()=>setWorkspaceView('library')}>{tr('Create video','Criar vídeo','Crear vídeo')}</button><button type="button" aria-pressed={workspaceView==='history'} onClick={()=>setWorkspaceView('history')}>{tr('My library','Biblioteca','Biblioteca')}</button><button type="button" aria-pressed={workspaceView==='guide'} onClick={()=>setWorkspaceView('guide')}>{tr('Learn','Aprender','Aprender')}</button></div><div className="ks-model-banner"><img src="/posters/k4k-019.webp" alt=""/><div><img src="/k4k-mark.svg" alt="K4K"/><strong>K4K MOTION STUDIO</strong><small>Reality. Recast by you.</small></div></div><div className="ks-mode"><Film size={15}/><div><strong>{tr('Motion transfer','Transferência de movimento','Transferencia de movimiento')}</strong><small>{tr('Same motion. Your characters.','Mesmo movimento. Seus personagens.','Mismo movimiento. Tus personajes.')}</small></div></div>
     <section className="ks-input-section"><div className="ks-label"><label htmlFor="ks-video">{tr('Motion reference','Vídeo de referência','Vídeo de referencia')}</label><small>01</small></div>
      <label className={'ks-upload'+(previewUrl?' has-media':'')} htmlFor="ks-video" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files?.[0];if(file){setSelectedPreset(null);choose({target:{files:[file],value:''}},video,'video',MAX_VIDEO)}}}>
       {previewUrl?<><video src={previewUrl} muted playsInline preload="metadata" poster={selectedPreset?.posterUrl||undefined}/><span className="ks-replace"><Upload size={13}/>{tr('Replace video','Trocar vídeo','Cambiar vídeo')}</span></>:<><Upload size={23}/><strong>{tr('Drop your scene in','Adicione sua cena','Añade tu escena')}</strong><small>MP4 · 50 MB · 2–15s</small></>}
       <input id="ks-video" type="file" accept="video/mp4" onChange={e=>{if(e.target.files?.length){setSelectedPreset(null);choose(e,video,'video',MAX_VIDEO)}}}/>
      </label>
      {video.file&&<div className="ks-file"><span>{video.file.name}</span><button type="button" aria-label="Remove reference video" onClick={()=>video.setFile(null)}><X size={13}/></button></div>}
      {selectedPreset&&<p className="ks-inline-note">{tr('Ready to recreate. Add your character photos and save the media.','Pronto para recriar. Adicione suas fotos e salve os arquivos.','Listo para recrear. Añade tus fotos y guarda los archivos.')}</p>}
     </section>
     {(estimateReading||localEstimate||estimateError)&&<div className="ks-live-estimate" aria-live="polite"><span>{tr('VIDEO COST','CUSTO DO VÍDEO','COSTE DEL VÍDEO')}</span>{estimateReading?<strong>{tr('Reading your video…','Lendo seu vídeo…','Leyendo tu vídeo…')}</strong>:estimateError?<p role="alert">{tr('Use a readable MP4 between 2 and 15 seconds.','Use um MP4 válido entre 2 e 15 segundos.','Usa un MP4 válido entre 2 y 15 segundos.')}</p>:<><strong>{localEstimate.credits} {tr('credits','créditos','créditos')}</strong><small>{localEstimate.sourceSeconds.toFixed(1)}s · {localEstimate.resolution} · {model==='lite'?'Motion Lite':'Motion Pro'}</small><p>{tr('Estimated output-video cost. The exact cost is checked before charging.','Custo estimado do vídeo gerado. O custo é verificado antes da cobrança.','Coste estimado del vídeo generado. El coste se verifica antes de cobrar.')}</p></>}</div>}
     <section className="ks-input-section"><div className="ks-label"><label htmlFor="ks-images">{tr('Characters & references','Personagens e referências','Personajes y referencias')}</label><small>{referenceCount}/8</small></div>
      <div className="ks-references" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addReferences({target:{files:e.dataTransfer.files,value:''}})}}>
       {character.url&&<div className="ks-reference"><img src={character.url} alt="Main character"/><button type="button" aria-label="Remove main character" onClick={()=>{character.setFile(null);setSavedReference(null)}}><X size={11}/></button><small>01</small></div>}
       {extraImages.map((item,i)=><div className="ks-reference" key={item.url}><img src={item.url} alt={'Reference '+(i+2)}/><button type="button" aria-label={'Remove reference '+(i+2)} onClick={()=>removeExtraImage(i)}><X size={11}/></button><small>{String(i+2).padStart(2,'0')}</small></div>)}
       {referenceCount<8&&<label className="ks-add-reference" htmlFor="ks-images"><Plus size={21}/><span>{tr('Add photo','Adicionar foto','Añadir foto')}</span><input id="ks-images" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addReferences}/></label>}
      </div>
      <p className="ks-inline-note"><strong>{tr('Character Lock · always on','Character Lock · sempre ativo','Character Lock · siempre activo')}</strong> — {tr('Faces, hair, outfits and identity are preserved by the generation instructions.','As instruções preservam rostos, cabelo, roupas e identidade.','Las instrucciones conservan rostros, pelo, ropa e identidad.')}</p>
      {referenceCount>1&&character.file&&<div className="ks-character-map"><p className="ks-inline-note">{tr('Optional: identify each person in the original video. Otherwise photos follow first appearance, left to right when simultaneous.','Opcional: identifique cada pessoa no vídeo original. Caso contrário, as fotos seguem a ordem de aparição, da esquerda para a direita.','Opcional: identifica a cada persona del vídeo original. Si no, las fotos siguen el orden de aparición, de izquierda a derecha.')}</p>{[character.file,...extraImages.map(item=>item.file)].map((file,i)=><label key={i} className="ks-prompt-label">{tr('Image','Imagem','Imagen')} {i+1}<input className="ks-prompt" aria-label={'Source person for Image '+(i+1)} maxLength={MAX_CHARACTER_TARGET} value={targetFor(file)} onChange={e=>setCharacterTarget(file,e.target.value)} placeholder={tr('e.g. seated left, first shot','ex.: sentado à esquerda','ej.: sentado a la izquierda')}/></label>)}</div>}
     </section>
     <div className="ks-setting-row"><label>{tr('Model','Modelo','Modelo')}<select value={model} onChange={e=>{setModel(e.target.value);setQuality(e.target.value==='lite'?'720p':'1080p')}}><option value="lite">K4K Motion Lite · 720p</option></select></label><label>{tr('Resolution','Resolução','Resolución')}<select value={quality} disabled aria-label="Resolution is set by your selected model"><option>{quality}</option></select></label></div>
     <button type="button" className="ks-prompt-toggle" aria-expanded={promptOpen} aria-controls="ks-prompt" onClick={()=>setPromptOpen(!promptOpen)}>{tr('Prompt','Instruções','Instrucciones')}<span>{promptOpen?'On':'Off'}</span></button><label hidden={!promptOpen} className="ks-prompt-label" htmlFor="ks-prompt">{tr('Creative direction','Direção criativa','Dirección creativa')}<span>{tr('Optional','Opcional','Opcional')}</span></label><textarea hidden={!promptOpen} id="ks-prompt" className="ks-prompt" value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,1200))} maxLength={1200} rows={4} placeholder={tr('Keep the movement. Change the character, wardrobe or world…','Mantenha o movimento. Mude o personagem, a roupa ou o cenário…','Mantén el movimiento. Cambia el personaje, la ropa o el escenario…')}/>
     {error&&<p role="alert" className="ks-error">{error}</p>}
     {(uploadMessage||draftMessage)&&<details className="ks-save-details"><summary>{tr('Save details','Detalhes','Detalles')}</summary><p role="status">{uploadMessage}</p><p role="status">{draftMessage}</p></details>}
     <div className="ks-submit-area" aria-label="Generate video and credit confirmation">
      {generationQuote&&<div className="ks-cost-review"><strong>{generationQuote.customerCredits===null?tr('Pricing unavailable','Preço indisponível','Precio no disponible'):generationQuote.customerCredits+' '+tr('credits','créditos','créditos')}</strong>{Number.isFinite(generationQuote.creditBalance)&&<span>{tr('Your balance: ','Seu saldo: ','Tu saldo: ')+generationQuote.creditBalance}</span>}<small>{canConfirmGeneration(generationQuote,Math.max(quoteClock,generationQuote.reviewedAt))?tr('Quote valid for five minutes.','Custo válido por cinco minutos.','Coste válido durante cinco minutos.'):generationQuote.generationEnabled?tr('Quote expired. Review the cost again.','Custo expirado. Confira novamente.','El coste ha caducado. Revísalo de nuevo.'):tr('Generation blocked — see the message below.','Geração bloqueada — veja a mensagem abaixo.','Generación bloqueada — consulta el mensaje.')}</small></div>}
      <button type="button" className="ks-generate" disabled={generationBusy||preparing||uploading||savingDraft||!character.file||!previewUrl||!localEstimate||!!estimateError||estimateReading} onClick={canConfirmGeneration(generationQuote,Math.max(quoteClock,generationQuote?.reviewedAt||0))?()=>generationAction('submit'):prepareProject}><Sparkles size={17}/>{(generationBusy||preparing)?tr('Checking…','Verificando…','Verificando…'):canConfirmGeneration(generationQuote,Math.max(quoteClock,generationQuote?.reviewedAt||0))?tr('Confirm & generate','Confirmar e gerar','Confirmar y generar')+' · '+generationQuote.customerCredits+' '+tr('credits','créditos','créditos'):generationQuote?tr('Review cost again','Conferir custo novamente','Revisar coste de nuevo'):tr('Generate video','Gerar vídeo','Generar vídeo')+(localEstimate?' · '+localEstimate.credits+' '+tr('credits','créditos','créditos'):'')}<ArrowRight size={17}/></button>
      <p>{tr('Generate uses the displayed credits. If the verified cost increases, we ask you to confirm first.','Gerar usa os créditos exibidos. Se o custo verificado aumentar, pediremos sua confirmação.','Generar usa los créditos mostrados. Si el coste aumenta, pediremos confirmación.')}</p>
      {generationMessage&&<p className="ks-generation-feedback" role={generationQuote?.blocker?'alert':'status'} aria-live="polite">{generationMessage}</p>}
      {submittedJobId&&<button type="button" className="ks-check-status" disabled={generationBusy} onClick={()=>generationAction('refresh')}>{tr('Check generation status','Verificar geração','Comprobar generación')}</button>}
     </div>
    </aside>
    <section className="ks-workspace" aria-label="Preview and inspiration">
     {workspaceView==='history'&&generationMessage&&<p className="ks-generation-feedback" role="status">{generationMessage}</p>}
     <div className="ks-library-tabs" role="group" aria-label="Workspace view"><button type="button" aria-pressed={workspaceView==='history'} onClick={()=>{setWorkspaceView('history');loadHistory()}}><FolderOpen size={14}/>{tr('My library','Minha biblioteca','Mi biblioteca')}</button><button type="button" aria-pressed={workspaceView==='library'} onClick={()=>setWorkspaceView('library')}><Film size={14}/>{tr('Motion library','Biblioteca de movimentos','Biblioteca de movimiento')}</button><button type="button" aria-pressed={workspaceView==='guide'} onClick={()=>setWorkspaceView('guide')}>{tr('How it works','Como funciona','Cómo funciona')}</button></div>
     {workspaceView==='guide'&&<section className="ks-guide"><h2>{tr('Your next scene, in three steps.','Sua próxima cena, em três passos.','Tu próxima escena, en tres pasos.')}</h2><ol><li>{tr('Upload your motion reference video.','Envie seu vídeo de referência.','Sube tu vídeo de referencia.')}</li><li>{tr('Add clear photos of your characters.','Adicione fotos nítidas dos personagens.','Añade fotos claras de tus personajes.')}</li><li>{tr('Save your draft and review the generation cost.','Salve o projeto e confira o custo de geração.','Guarda tu proyecto y revisa el coste.')}</li></ol></section>}
     {workspaceView==='history'&&<VideoLibrary embedded onCreate={()=>{setWorkspaceView('library');window.scrollTo({top:0,behavior:'smooth'})}} activeJobId={libraryFocusId} optimisticJob={optimisticGeneration} onActiveJobStatus={onActiveJobStatus} onReuse={job=>{setModel('lite');setQuality('720p');setPrompt(job.prompt||'');setCharacterTargets(new Map());setPromptOpen(true);setWorkspaceView('library');setGenerationMessage(tr('Creative settings copied. Choose a reference video and character photos to create a new draft.','Configurações copiadas. Escolha um vídeo e fotos para criar um novo projeto.','Ajustes copiados. Elige un vídeo y fotos para crear un nuevo proyecto.'))}}/>}
     {workspaceView==='library'&&<>
     <header className="ks-library-hero"><div><span className="ks-eyebrow">K4K ORIGINALS / MOTION LIBRARY</span><h1>{tr('ONE VIDEO. ENDLESS POSSIBILITIES.','UM VÍDEO. INFINITAS POSSIBILIDADES.','UN VÍDEO. INFINITAS POSIBILIDADES.')}</h1><p>{tr('Keep the motion. Recast the characters. Turn the scene everyone is watching into the one they remember you for.','Mantenha o movimento. Troque os personagens. Transforme a cena que todos assistem na cena pela qual vão lembrar de você.','Conserva el movimiento. Cambia los personajes. Convierte la escena que todos ven en la que recordarán por ti.')}</p></div><video src={catalogue.trending[0].videoUrl} poster={catalogue.trending[0].posterUrl} muted autoPlay loop playsInline onClick={e=>{e.currentTarget.muted=!e.currentTarget.muted}} aria-label="K4K original video — tap for sound"/></header>
     <div hidden={!previewUrl} className={'ks-canvas'+(previewUrl?' ks-canvas-filled':'')}>
      {previewUrl?<><video key={previewUrl} src={previewUrl} controls playsInline preload="metadata" poster={selectedPreset?.posterUrl||undefined} aria-label="Reference video preview"/><div className="ks-canvas-caption"><span>REFERENCE PREVIEW</span><strong>{previewTitle}</strong></div></>:<div className="ks-canvas-empty"><div className="ks-empty-icon"><Film size={28}/><span>✦</span></div><span className="ks-eyebrow">FROM REFERENCE TO REINVENTION</span><h2>{tr('One scene.','Uma cena.','Una escena.')}<br/><em>{tr('Your entire imagination.','Toda a sua imaginação.','Toda tu imaginación.')}</em></h2><p>{tr('Add a reference video and your character photos. Keep the movement. Give it a new identity.','Adicione um vídeo de referência e fotos dos personagens. Mantenha o movimento. Dê uma nova identidade.','Añade un vídeo y fotos de tus personajes. Conserva el movimiento. Dale una nueva identidad.')}</p><label htmlFor="ks-video" className="ks-canvas-upload"><Upload size={15}/>{tr('Upload your reference','Enviar referência','Subir referencia')}</label><small>{tr('Your preview appears here','Sua prévia aparece aqui','Tu vista previa aparece aquí')}</small></div>}
      <div className="ks-canvas-meta"><span><i/> {model==='lite'?'MOTION LITE':'MOTION PRO'}</span><span>{quality} · {referenceCount} {tr('references','referências','referencias')}</span></div>
     </div>
     <section className="ks-inspiration"><div className="ks-section-heading"><div><span className="ks-eyebrow">THE STARTING POINT</span><h2>{tr('Borrow the motion. Own the idea.','Inspire-se no movimento. Crie sua ideia.','Toma el movimiento. Haz tuya la idea.')}</h2></div><Link href="/k4k-app/explore">{tr('Explore all','Explorar todos','Explorar todo')}<ArrowUpRight size={15}/></Link></div><div className="ks-template-tools"><div role="group" aria-label="Motion library filter"><button type="button" aria-pressed={presetFilter!=='short'} onClick={()=>setPresetFilter('trending')}>{tr('K4K originals','Originais K4K','Originales K4K')}</button><button type="button" aria-pressed={presetFilter==='short'} onClick={()=>setPresetFilter('short')}>{tr('15 seconds or less','Até 15 segundos','Hasta 15 segundos')}</button></div><input aria-label="Search motion templates" placeholder={tr('Search scenes…','Buscar cenas…','Buscar escenas…')} value={templateSearch} onChange={e=>setTemplateSearch(e.target.value)}/></div><div className="ks-template-grid">{catalogue.trending.filter(preset=>(presetFilter!=='short'||preset.durationSeconds<=15)&&preset.title.toLowerCase().includes(templateSearch.toLowerCase())).map(preset=><button type="button" key={preset.id} className={'ks-template'+(selectedPreset?.id===preset.id?' selected':'')} aria-pressed={selectedPreset?.id===preset.id} onClick={()=>{setSelectedPreset(preset);setWorkspaceView('library');video.setFile(null);setSavedReference(null);setDraftMessage('')}}><div><video src={preset.videoUrl} muted playsInline preload="metadata" poster={preset.posterUrl||undefined} onMouseEnter={e=>e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>e.currentTarget.pause()}/><span><Play size={12}/>{Math.round(preset.durationSeconds)}s</span></div><strong>{preset.title}</strong><small>{preset.requiredImages} {tr('reference photos','fotos de referência','fotos de referencia')}</small></button>)}</div></section>
     <details className="ks-history"><summary><FolderOpen size={16}/>{tr('Saved drafts & activity','Projetos salvos e atividade','Proyectos guardados y actividad')}</summary><button type="button" onClick={loadHistory}>{tr('Refresh history','Atualizar histórico','Actualizar historial')}</button>{historyState&&<p role="status">{historyState}</p>}{history.map(job=><p key={job.id}><span>{job.model==='lite'?'Motion Lite':'Motion Pro'}</span><span>{job.status}</span></p>)}</details>
     <p className="ks-status-note">{tr('Preview workspace · generation availability and credit cost are checked before confirmation.','Estúdio em prévia · disponibilidade e custo verificados antes da confirmação.','Estudio en vista previa · disponibilidad y coste verificados antes de confirmar.')}</p>
     </>}
    </section>
   </div>
  </PreviewShell>;
}
