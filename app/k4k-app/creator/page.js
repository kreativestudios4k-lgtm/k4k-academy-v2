'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import './creator.css';
import './motion-studio.css';
import Link from 'next/link';
import {Upload,Film,Images,ArrowUpRight,ArrowRight,Sparkles,FolderOpen,Check,Plus,X,Play} from 'lucide-react';
import PreviewShell from '../PreviewShell';
import EarlyFreeOffer from '../EarlyFreeOffer';
import VideoLibrary from '../VideoLibrary';
import CheckoutReturn from '../CheckoutReturn';
import {generationReference} from '../../../lib/template-generation.mjs';
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
function EmbeddedCreatorFrame({children}){return <>{children}</>}
export default function Creator({embedded=false}){
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
 useEffect(()=>{
  const params=new URL(window.location.href).searchParams;
  if(params.get('view')==='history'){setWorkspaceView('history');return;}
  const id=params.get('template');
  const preset=[...catalogue.trending,...catalogue.topPerforming,...catalogue.discoveryPreviews].find(item=>item.id===id);
  if(preset){setSelectedPreset(preset);setWorkspaceView('library');}
 },[]);
 const [model,setModel]=useState('lite');
 const [mediaPicker,setMediaPicker]=useState(null);
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
  }else if(selectedPreset){setEstimateReading(true);apply(generationReference(selectedPreset).seconds)}else setEstimateReading(false);
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
     const messages={FREE_GENERATION_UNAVAILABLE:'Your free generation has already been claimed or is in progress. Review a fresh quote before using paid credits.',FREE_GENERATION_LIMIT:'The early creator gift covers a 2–15 second Lite 720p video only.',FREE_GENERATION_BUDGET_BLOCKED:'The free-generation campaign budget has been reached. No credits were charged.',LEGACY_PROVIDER_RETIRED:'This older project used a retired provider. Create a new project to generate with K4K Motion.',MEDIA_REFERENCE_INVALID:'Save your reference media again before generating.',MEDIA_OWNERSHIP_INVALID:'This reference does not belong to your account. Save your own files again.',MEDIA_TYPE_INVALID:'Use a JPG, PNG or WebP image and MP4 video.',MEDIA_REFERENCE_COUNT_INVALID:'Choose 1–8 distinct character images.',MEDIA_NOT_FOUND:'A saved file is missing. Upload and save your references again.',MEDIA_SIZE_INVALID:'Images must be under 10 MB and videos under 50 MB.',MEDIA_SIGNATURE_INVALID:'A file does not match its format. Export it as JPG, PNG, WebP or MP4 and upload again.',REFERENCE_DURATION_OUT_OF_RANGE:'Use a reference video between 2 and 15 seconds.',INVALID_RESOLUTION:'K4K Motion uses 720p during early access.',PROVIDER_CREDENTIALS_MISSING:'The website connection is unavailable. No credits were charged.',PROVIDER_RATE_CARD_NOT_APPROVED:'Pricing needs owner setup. No credits were charged.',INSUFFICIENT_CREDITS:'You do not have enough credits for this video.',BILLING_REVIEW_REQUIRED:'Your account needs a billing review.',TEST_GENERATION_NOT_AUTHORIZED:'This account is not authorized for the private test.',PROVIDER_BUDGET_BLOCKED:'This video exceeds the preview test limit. Use Lite and the five-second reference.',GENERATION_DISABLED:'Generation is unavailable on this preview.',CREDIT_PRICING_NOT_APPROVED:'Credit pricing needs owner setup.',QUOTE_CHANGED:'The cost changed. Please review a fresh price.',QUOTE_EXPIRED:'The price expired. Please review it again.',PROVIDER_CREDENTIALS_REJECTED:'The video service is temporarily unavailable.'};
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
    setGenerationMessage(result.status==='failed'&&result.freeGeneration?'Your free generation could not start. Check your gift status before retrying.':result.creditsRefunded?'Generation could not start. Reserved credits were refunded.':'Your video is generating. It appears at the top of your library.');await loadHistory();
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
  if(selectedPreset?.generationPaused){setUploadMessage(generationQuoteFeedback({blocker:'TEMPLATE_UNDER_REVIEW'},locale));return;}
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
  const previewUrl=video.url||generationReference(selectedPreset).url;
  const previewTitle=video.file?.name||selectedPreset?.title||tr('Your next scene starts here.','Sua próxima cena começa aqui.','Tu próxima escena empieza aquí.');
  const Frame=embedded?EmbeddedCreatorFrame:PreviewShell;
 const [chip,setChip]=useState('all'),[sortMode,setSortMode]=useState('trending');
 const everyTemplate=[...catalogue.trending,...catalogue.discoveryPreviews].filter((item,index,list)=>list.findIndex(other=>other.id===item.id)===index);
 // Facets come from fields the catalogue actually carries. No invented categories
 // and no fabricated view or repost counts: duration and character count are real.
 const facets=[
  {key:'all',label:tr('All','Todos','Todos'),match:()=>true},
  {key:'originals',label:tr('K4K Originals','Originais K4K','Originales K4K'),match:item=>item.k4kOriginal===true},
  {key:'solo',label:tr('One character','Um personagem','Un personaje'),match:item=>item.requiredImages===1},
  {key:'group',label:tr('Two or more','Dois ou mais','Dos o más'),match:item=>item.requiredImages>1},
  {key:'audio',label:tr('With audio','Com áudio','Con audio'),match:item=>Boolean(item.audio)},
 ].filter(facet=>facet.key==='all'||everyTemplate.some(facet.match));
 const activeFacet=facets.find(facet=>facet.key===chip)||facets[0];
 const ordered=sortMode==='latest'?[...everyTemplate].reverse():everyTemplate;
 const templates=ordered.filter(activeFacet.match).filter(item=>item.title.toLowerCase().includes(templateSearch.trim().toLowerCase()));
 function useTemplate(preset){setSelectedPreset(preset);video.setFile(null);setSavedReference(null);setDraftMessage('');setWorkspaceView('library');window.scrollTo({top:0,behavior:'smooth'})}
 const quoteReady=canConfirmGeneration(generationQuote,Math.max(quoteClock,generationQuote?.reviewedAt||0));
 return <Frame active="Creator" studio>
   <CheckoutReturn/>
   <div className={'kms k4k-creator-layout ks-view-'+workspaceView}>
    <aside className="kms-rail" aria-label="Video creation settings">
     <div className="kms-brand"><small>{tr('Reality in motion','Realidade em movimento','Realidad en movimiento')}</small><strong>K4K <em>MOTION</em></strong></div>
     <div className="kms-scroll">
      <div className="kms-modes" role="group" aria-label={tr('Creation mode','Modo de criação','Modo de creación')}>
       <button type="button" aria-pressed={true}><Film size={15}/>{tr('Motion transfer','Transferir movimento','Transferir movimiento')}</button>
       <button type="button" aria-pressed={false} disabled title={tr('Objects swap is not available yet.','A troca de objetos ainda não está disponível.','El cambio de objetos aún no está disponible.')}>{tr('Objects swap','Trocar objetos','Cambiar objetos')}<span>{tr('SOON','EM BREVE','PRONTO')}</span></button>
      </div>

      <label className={'kms-drop'+(previewUrl?' has-media':'')} htmlFor="ks-video" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files?.[0];if(file){setSelectedPreset(null);choose({target:{files:[file],value:''}},video,'video',MAX_VIDEO)}}}>
       {previewUrl?<><video src={previewUrl} muted playsInline preload="metadata" poster={selectedPreset?.posterUrl||undefined}/><span className="kms-replace"><Upload size={12}/>{tr('Replace video','Trocar vídeo','Cambiar vídeo')}</span></>
        :<><span className="kms-drop-icon"><Film size={19}/></span><strong>{tr('Add a reference video to extract motion','Adicione um vídeo de referência para extrair o movimento','Añade un vídeo de referencia para extraer el movimiento')}</strong><small>{tr('Video duration: 2 to 15 seconds','Duração do vídeo: 2 a 15 segundos','Duración del vídeo: 2 a 15 segundos')}</small></>}
       <input id="ks-video" type="file" accept="video/mp4" onChange={e=>{if(e.target.files?.length){setSelectedPreset(null);choose(e,video,'video',MAX_VIDEO)}}}/>
      </label>
      {video.file&&<p className="kms-note">{video.file.name} · <button type="button" style={{background:'none',border:0,color:'#c7ff36',padding:0}} onClick={()=>video.setFile(null)}>{tr('Remove','Remover','Quitar')}</button></p>}
      {selectedPreset&&<p className="kms-note">{tr('Template ready. Add your character photos below.','Template pronto. Adicione as fotos abaixo.','Plantilla lista. Añade tus fotos debajo.')}</p>}

      {referenceCount===0
       ?<label className="kms-drop" htmlFor="ks-images" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addReferences({target:{files:e.dataTransfer.files,value:''}})}}>
         <span className="kms-stack"><i/><i/><i/></span><strong>{tr('Add your characters, products, or clothes','Adicione seus personagens, produtos ou roupas','Añade tus personajes, productos o ropa')}</strong><small>{tr('Up to 8 images','Até 8 imagens','Hasta 8 imágenes')}</small>
         <input id="ks-images" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addReferences}/>
        </label>
       :<div className="kms-thumbs" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addReferences({target:{files:e.dataTransfer.files,value:''}})}}>
         {character.url&&<div className="kms-thumb"><img src={character.url} alt="Main character"/><button type="button" aria-label="Remove main character" onClick={()=>{character.setFile(null);setSavedReference(null)}}><X size={10}/></button><small>01</small></div>}
         {extraImages.map((item,i)=><div className="kms-thumb" key={item.url}><img src={item.url} alt={'Reference '+(i+2)}/><button type="button" aria-label={'Remove reference '+(i+2)} onClick={()=>removeExtraImage(i)}><X size={10}/></button><small>{String(i+2).padStart(2,'0')}</small></div>)}
         {referenceCount<8&&<label className="kms-addmore" htmlFor="ks-images"><Plus size={18}/><input id="ks-images" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addReferences}/></label>}
        </div>}
      {referenceCount>0&&<p className="kms-note">{referenceCount}/8 · <strong style={{color:'#c7ff36'}}>{tr('Character Lock on','Character Lock ativo','Character Lock activo')}</strong> — {tr('faces, hair and outfits are preserved.','rostos, cabelo e roupas são preservados.','rostros, pelo y ropa se conservan.')}</p>}
      {referenceCount>1&&character.file&&<div className="kms-field">{[character.file,...extraImages.map(item=>item.file)].map((file,i)=><label key={i}>{tr('Image','Imagem','Imagen')} {i+1}<input className="kms-input" aria-label={'Source person for Image '+(i+1)} maxLength={MAX_CHARACTER_TARGET} value={targetFor(file)} onChange={e=>setCharacterTarget(file,e.target.value)} placeholder={tr('e.g. seated left','ex.: sentado à esquerda','ej.: sentado a la izquierda')} style={{width:'100%',background:'#1c1c1c',border:'1px solid #333',borderRadius:8,color:'#f6f6f6',padding:9,fontSize:11,marginTop:6}}/></label>)}</div>}

      <button type="button" className="kms-row" aria-expanded={promptOpen} aria-controls="ks-prompt" onClick={()=>setPromptOpen(!promptOpen)}>{tr('Prompt','Instruções','Instrucciones')}<span className="kms-switch"/></button>
      <textarea hidden={!promptOpen} id="ks-prompt" value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,1200))} maxLength={1200} rows={4} placeholder={tr('Keep the movement. Change the character, wardrobe or world…','Mantenha o movimento. Mude o personagem, a roupa ou o cenário…','Mantén el movimiento. Cambia el personaje, la ropa o el escenario…')}/>

      <div className="kms-field"><span>{tr('Mode','Modo','Modo')} · WAN 3 VIDEO STUDIO</span>
       <select value={model} onChange={e=>{setModel(e.target.value);setQuality(e.target.value==='lite'?'720p':'1080p')}}><option value="lite">K4K Motion Lite · 720p</option></select>
      </div>

      {(estimateReading||localEstimate||estimateError)&&<div className="kms-estimate" aria-live="polite"><span>{tr('VIDEO COST','CUSTO DO VÍDEO','COSTE DEL VÍDEO')}</span>{estimateReading?<strong>{tr('Reading your video…','Lendo seu vídeo…','Leyendo tu vídeo…')}</strong>:estimateError?<p role="alert" className="kms-note">{tr('Use a readable MP4 between 2 and 15 seconds.','Use um MP4 válido entre 2 e 15 segundos.','Usa un MP4 válido entre 2 y 15 segundos.')}</p>:<><strong>{localEstimate.credits} {tr('credits','créditos','créditos')}</strong><small>{localEstimate.sourceSeconds.toFixed(1)}s · {localEstimate.resolution} · {model==='lite'?'Motion Lite':'Motion Pro'}</small></>}</div>}
      {error&&<p role="alert" className="kms-alert">{error}</p>}
      {(uploadMessage||draftMessage)&&<details className="kms-note"><summary>{tr('Save details','Detalhes','Detalles')}</summary><p role="status">{uploadMessage}</p><p role="status">{draftMessage}</p></details>}
     </div>

     <div className="kms-foot" aria-label="Generate video and credit confirmation">
      {generationQuote&&<div className="kms-quote"><strong>{generationQuote.freeGeneration?tr('FREE · 0 credits','GRÁTIS · 0 créditos','GRATIS · 0 créditos'):generationQuote.customerCredits===null?tr('Pricing unavailable','Preço indisponível','Precio no disponible'):generationQuote.customerCredits+' '+tr('credits','créditos','créditos')}</strong>{Number.isFinite(generationQuote.creditBalance)&&<span>{tr('Your balance: ','Seu saldo: ','Tu saldo: ')+generationQuote.creditBalance}</span>}<small>{quoteReady?tr('Quote valid for five minutes.','Custo válido por cinco minutos.','Coste válido durante cinco minutos.'):generationQuote.generationEnabled?tr('Quote expired. Review the cost again.','Custo expirado. Confira novamente.','El coste ha caducado. Revísalo de nuevo.'):tr('Generation blocked — see the message below.','Geração bloqueada — veja a mensagem abaixo.','Generación bloqueada — consulta el mensaje.')}</small></div>}
      <button type="button" className="kms-generate" disabled={generationBusy||preparing||uploading||savingDraft||!character.file||!previewUrl||!localEstimate||!!estimateError||estimateReading} onClick={quoteReady?()=>generationAction('submit'):prepareProject}><Sparkles size={16}/>{(generationBusy||preparing)?tr('Checking…','Verificando…','Verificando…'):quoteReady?tr('Confirm & generate','Confirmar e gerar','Confirmar y generar')+' · '+(generationQuote.freeGeneration?tr('FREE','GRÁTIS','GRATIS'):generationQuote.customerCredits+' '+tr('credits','créditos','créditos')):generationQuote?tr('Review cost again','Conferir custo novamente','Revisar coste de nuevo'):tr('Generate video','Gerar vídeo','Generar vídeo')+(localEstimate?' · '+localEstimate.credits+' '+tr('credits','créditos','créditos'):'')}</button>
      <p>{tr('Generate uses the displayed credits. If the verified cost increases, we ask you to confirm first.','Gerar usa os créditos exibidos. Se o custo verificado aumentar, pediremos sua confirmação.','Generar usa los créditos mostrados. Si el coste aumenta, pediremos confirmación.')}</p>
      {generationMessage&&<p className="kms-feedback" role={generationQuote?.blocker?'alert':'status'} aria-live="polite">{generationMessage}</p>}
      {submittedJobId&&<button type="button" className="kms-row" disabled={generationBusy} onClick={()=>generationAction('refresh')}>{tr('Check generation status','Verificar geração','Comprobar generación')}</button>}
     </div>
    </aside>

    <section className="kms-main" aria-label="Motion library">
     <div className="kms-top">
      <div className="kms-seg" role="group" aria-label="Workspace view">
       <button type="button" aria-pressed={workspaceView==='library'} onClick={()=>setWorkspaceView('library')}><Film size={14}/>{tr('Motion Library','Biblioteca de movimentos','Biblioteca de movimiento')}</button>
       <button type="button" aria-pressed={workspaceView==='history'} onClick={()=>{setWorkspaceView('history');loadHistory()}}><FolderOpen size={14}/>{tr('History','Histórico','Historial')}</button>
      </div>
      {workspaceView==='library'&&<input className="kms-search" aria-label="Search motion templates" placeholder={tr('Search scenes…','Buscar cenas…','Buscar escenas…')} value={templateSearch} onChange={e=>setTemplateSearch(e.target.value)}/>}
     </div>

     {workspaceView==='library'&&<>
      <EarlyFreeOffer studio refreshKey={submittedJobId}/>
      <div className="kms-filters">
       <div className="kms-chips" role="group" aria-label="Filter templates">
        {facets.map(facet=><button type="button" key={facet.key} aria-pressed={activeFacet.key===facet.key} onClick={()=>setChip(facet.key)}>{facet.label}</button>)}
       </div>
       <div className="kms-sort" role="group" aria-label="Order templates">
        <button type="button" aria-pressed={sortMode==='trending'} onClick={()=>setSortMode('trending')}>{tr('Trending','Em alta','Tendencia')}</button>
        <button type="button" aria-pressed={sortMode==='latest'} onClick={()=>setSortMode('latest')}>{tr('Latest','Recentes','Recientes')}</button>
       </div>
      </div>
      {templates.length===0
       ?<p className="kms-empty">{tr('No motions match that search.','Nenhum movimento encontrado.','No hay movimientos para esa búsqueda.')}</p>
       :<div className="kms-grid">{templates.map(preset=><button type="button" key={preset.id} className={'kms-card'+(selectedPreset?.id===preset.id?' selected':'')} onClick={()=>useTemplate(preset)}>
          <video src={preset.videoUrl} poster={preset.posterUrl||undefined} muted loop playsInline preload="metadata" onMouseEnter={e=>e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0}}/>
          <span className="kms-card-meta"><span>{Math.round(preset.durationSeconds)}s</span>{preset.requiredImages>0&&<span><Images size={10}/>{preset.requiredImages}</span>}</span>
          <span className="kms-card-use">{selectedPreset?.id===preset.id?tr('Selected','Selecionado','Seleccionado'):tr('Use motion','Usar movimento','Usar movimiento')} ↗</span>
          <span className="kms-card-title">{preset.title}</span>
         </button>)}</div>}
      <p className="kms-note" style={{padding:'0 20px 24px'}}>{tr('Select a motion to use its generation-ready reference. Uploaded videos must be 2–15 seconds.','Selecione um movimento para usar sua referência pronta. Vídeos enviados devem ter 2–15 segundos.','Selecciona un movimiento para usar su referencia lista. Los vídeos subidos deben durar entre 2 y 15 segundos.')}</p>
     </>}

     {workspaceView==='history'&&<div className="kms-panel">
      {generationMessage&&<p className="kms-feedback" role="status">{generationMessage}</p>}
      <VideoLibrary embedded onCreate={()=>{setWorkspaceView('library');window.scrollTo({top:0,behavior:'smooth'})}} activeJobId={libraryFocusId} optimisticJob={optimisticGeneration} onActiveJobStatus={onActiveJobStatus} onReuse={job=>{setModel('lite');setQuality('720p');setPrompt(job.prompt||'');setCharacterTargets(new Map());setPromptOpen(true);setWorkspaceView('library');setGenerationMessage(tr('Creative settings copied. Choose a reference video and character photos to create a new draft.','Configurações copiadas. Escolha um vídeo e fotos para criar um novo projeto.','Ajustes copiados. Elige un vídeo y fotos para crear un nuevo proyecto.'))}}/>
     </div>}
    </section>
   </div>
  </Frame>;
}
