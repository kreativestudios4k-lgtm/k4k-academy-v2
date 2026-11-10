'use client';
import {useEffect,useRef,useState} from 'react';
import './creator.css';
import './generation.css';
import Link from 'next/link';
import PreviewShell from '../PreviewShell';
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
 const [model,setModel]=useState('pro');
 const [preflightBusy,setPreflightBusy]=useState(false),[preflightResult,setPreflightResult]=useState(null),[preflightError,setPreflightError]=useState('');
 const [uploading,setUploading]=useState(false),[uploadMessage,setUploadMessage]=useState('');
 const [savedReference,setSavedReference]=useState(null),[savingDraft,setSavingDraft]=useState(false),[draftMessage,setDraftMessage]=useState('');
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
 async function saveDraft(){
  if(!savedReference||savingDraft)return;
  setSavingDraft(true);setDraftMessage('');
  try{
   if(!character.file||character.file!==savedReference.file||video.file!==savedReference.videoFile||extraImages.length!==savedReference.extraFiles.length||extraImages.some((item,i)=>item.file!==savedReference.extraFiles[i]))throw new Error('Attachments changed. Save all current images again before saving the draft.');
   const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user||user.id!==savedReference.userId)throw new Error('Please sign in again to save your draft.');
   const {data,error}=await client.from('studio_generation_jobs').insert({user_id:user.id,template_id:'creator-upload-preview',provider:'higgsfield',model,status:'draft',reference_paths:savedReference.paths,reference_video_path:savedReference.videoPath,main_reference_index:0,prompt:prompt.trim(),credits_reserved:0}).select('id').single();
   if(error)throw error;
   setDraftMessage('Draft saved: '+data.id+'. All '+savedReference.paths.length+' image attachments and your prompt are saved privately. Reference video saved privately when supplied. No generation started and no credits charged.');await loadHistory();
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
   const files=[character.file,...extraImages.map(item=>item.file)];
   if(files.length>30||files.some(file=>!IMAGE_TYPES.includes(file.type)||file.size>MAX_IMAGE))throw new Error('Maximum 30 JPG, PNG or WebP images, 10 MB each.');
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
   const saved={paths,videoPath,videoFile:video.file,userId:user.id,file:character.file,extraFiles:extraImages.map(item=>item.file)};
   setSavedReference(saved);
   setUploadMessage(files.length+' image(s)'+(videoPath?' and reference video':'')+' saved privately. No AI generation or credit charge occurred.');
   return saved;
  }catch(e){setUploadMessage(e?.message||'Unable to save reference image.')}finally{setUploading(false)}
 }
 useEffect(()=>{setPreflightResult(null);setPreflightError('')},[model,quality,video.file,character.file,extraImages]);
 // ---- Real generation lifecycle -------------------------------------------
 // The browser only sends a draft ID, a resolution and a request key. The
 // server inspects the stored media, sets the credit price, reserves credits
 // and talks to the video provider. Nothing here can set a price.
 const [readiness,setReadiness]=useState(null);
 const [gen,setGen]=useState({phase:'idle'});
 const pollRef=useRef(0);
 async function generationApi(path,options={}){
  const client=createClient();const {data:{session},error:sessionError}=await client.auth.getSession();
  if(sessionError||!session?.access_token)throw new Error('Sign in to your K4K APP account to generate.');
  const response=await fetch(path,{method:options.method||'GET',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token,...(options.body?{'Content-Type':'application/json'}:{})},...(options.body?{body:JSON.stringify(options.body)}:{})});
  let data={};try{data=await response.json()}catch{}
  return {ok:response.ok,status:response.status,data};
 }
 async function loadReadiness(){
  try{const {ok,status,data}=await generationApi('/api/generation/submission-readiness');setReadiness(ok?data:{ready:false,signedOut:status===401,blockers:[]});}
  catch{setReadiness({ready:false,signedOut:true,blockers:[]})}
 }
 useEffect(()=>{if(creatorOpen)loadReadiness()},[creatorOpen]);
 function generationProblem(result){
  const {data,status}=result,code=data?.error;
  if(code==='GENERATION_BLOCKED')return {message:'Generation is not available yet.',details:(data.blockers||[]).map(item=>item.message)};
  const messages={
   INSUFFICIENT_CREDITS:'You do not have enough credits for this video'+(data?.credits?' ('+data.credits+' needed)':'')+'. Add credits on the Plans page, then try again.',
   MODEL_DURATION_OUT_OF_RANGE:'Your reference video is '+(data?.durationSeconds?Math.round(data.durationSeconds*10)/10+' seconds':'the wrong length')+'. This model needs '+data?.minSeconds+'–'+data?.maxSeconds+' seconds.',
   MEDIA_VERIFICATION_FAILED:'We could not verify your saved files. Use a standard MP4 video and 1–8 JPG, PNG or WebP images, then save again.',
   GENERATION_OPTION_NOT_PRICED:'This model and resolution are not available yet. Choose another resolution in Options.',
   ACTIVE_JOB_LIMIT:'You already have '+(data?.limit||2)+' videos in progress. Wait for one to finish.',
   PROVIDER_ESTIMATE_UNAVAILABLE:'The video service could not confirm the cost of this request. No credits were used. Please try again shortly.',
   PROVIDER_COST_EXCEEDS_CAP:'This video is larger than the current limit for one generation. No credits were used. Try a shorter clip or a lower resolution.',
   PROVIDER_REJECTED:data?.refunded?'The video service did not accept this request. Your credits were returned.':'The video service did not accept this request. Your credits are on hold while we check it.',
   JOB_NOT_DRAFT:'This draft has already been submitted. Check My videos.',
   UNAUTHENTICATED:'Sign in to your K4K APP account to generate.',
  };
  return {message:messages[code]||(status===503?'Generation is temporarily unavailable. No new credits were used.':'Something went wrong. No new credits were used.'),details:[]};
 }
 async function prepareGeneration(){
  if(gen.phase==='preparing'||gen.phase==='submitting')return;
  const imageCount=extraImages.length+(character.file?1:0);
  if(!video.file){setGen({phase:'error',message:selectedPreset?'Presets are a preview. Upload your own MP4 reference video to generate.':'Add an MP4 reference video first.',details:[]});return;}
  if(imageCount<1||imageCount>8){setGen({phase:'error',message:'Choose between 1 and 8 images for one generation.',details:[]});return;}
  setGen({phase:'preparing',message:'Saving your files privately…'});
  try{
   const current=savedReference&&character.file===savedReference.file&&video.file===savedReference.videoFile&&savedReference.videoPath&&extraImages.length===savedReference.extraFiles.length&&extraImages.every((item,i)=>item.file===savedReference.extraFiles[i]);
   const saved=current?savedReference:await saveReference();
   if(!saved?.videoPath)throw new Error('Your files could not be saved. Check the message under “Save your project”.');
   const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user||user.id!==saved.userId)throw new Error('Please sign in again.');
   const {data:draft,error:draftError}=await client.from('studio_generation_jobs').insert({user_id:user.id,template_id:'creator-upload',provider:'higgsfield',model,status:'draft',reference_paths:saved.paths,reference_video_path:saved.videoPath,main_reference_index:0,prompt:prompt.trim(),credits_reserved:0}).select('id').single();
   if(draftError)throw new Error('Your draft could not be saved. Please try again.');
   setGen({phase:'preparing',message:'Checking your video and working out the price…'});
   const result=await generationApi('/api/generation/jobs/price',{method:'POST',body:{jobId:draft.id,resolution:quality}});
   if(!result.ok){setGen({phase:'error',...generationProblem(result)});return;}
   setGen({phase:'priced',jobId:draft.id,requestKey:crypto.randomUUID(),resolution:quality,price:result.data.price});
  }catch(e){setGen({phase:'error',message:e?.message||'Could not prepare your video.',details:[]})}
 }
 async function confirmGeneration(){
  if(gen.phase!=='priced')return;
  const {jobId,requestKey,resolution,price}=gen;
  setGen({...gen,phase:'submitting'});
  try{
   const result=await generationApi('/api/generation/jobs/submit',{method:'POST',body:{jobId,requestKey,resolution}});
   if(!result.ok){setGen({phase:'error',...generationProblem(result)});loadReadiness();return;}
   const job=result.data.job;
   if(job.needsReview){setGen({phase:'review',jobId,message:'We could not confirm that the video service received your request. Your '+job.creditsReserved+' credits are on hold, not spent. We will check it and either deliver the video or return the credits.'});return;}
   setGen({phase:'running',jobId,credits:job.creditsReserved??price.credits,note:''});
  }catch(e){
   // The request may have reached the server. Keep the same key so a retry cannot charge twice.
   setGen({phase:'priced',jobId,requestKey,resolution,price,retryNote:'We lost the connection. Press confirm again. You will not be charged twice.'});
  }
 }
 useEffect(()=>{
  if(gen.phase!=='running')return;
  const run=++pollRef.current;let delay=3000,timer;
  const notes={OUTPUT_HOST_NOT_APPROVED:'Your video is finished. Delivery is waiting for a server setting to be approved.',OUTPUT_STORAGE_FAILED:'Your video is finished. We are still saving it to your account.',SETTLEMENT_FAILED:'Your video is finished. We are still completing it.'};
  const tick=async()=>{
   if(pollRef.current!==run)return;
   try{
    const {ok,data}=await generationApi('/api/generation/jobs/'+gen.jobId);
    if(pollRef.current!==run)return;
    if(ok&&data.job?.status==='completed'){
     const link=await generationApi('/api/generation/jobs/'+gen.jobId+'/download');
     setGen({phase:'done',jobId:gen.jobId,url:link.ok&&typeof link.data.url==='string'&&link.data.url.startsWith('https://')?link.data.url:''});loadReadiness();return;
    }
    if(ok&&(data.job?.status==='failed'||data.job?.status==='cancelled')){setGen({phase:'error',message:data.job.error||'The video could not be generated. Your credits were returned.',details:[]});loadReadiness();return;}
    const note=data?.progress?.state==='awaiting_review'?'This request is being checked by our team. Your credits are on hold, not spent.':notes[data?.progress?.blocked]||'';
    setGen(old=>old.phase==='running'&&old.jobId===gen.jobId?{...old,note}:old);
   }catch{}
   delay=Math.min(10000,Math.round(delay*1.5));timer=setTimeout(tick,delay+Math.random()*500);
  };
  timer=setTimeout(tick,delay);
  return()=>{pollRef.current++;clearTimeout(timer)};
 },[gen.phase,gen.jobId]);
 const generationBusy=gen.phase==='preparing'||gen.phase==='submitting'||gen.phase==='running';
 const generationBlocked=!!readiness&&!readiness.ready;
 const pt=locale==='pt',es=locale==='es';
 const copy=pt?{title:'Estúdio de criação',intro:'Prepare seu vídeo e sua foto. O vídeo fica no navegador; você pode salvar a foto na sua conta.',reference:'Vídeo de referência',image:'Foto do personagem',prompt:'Instruções criativas (opcional)',placeholder:'Descreva o personagem, o cenário ou o resultado desejado...',model:'Modelo de geração',ready:'Prévia pronta para geração',waiting:'Adicione um vídeo e uma imagem para preparar seu projeto',disabled:'Geração de IA ainda desativada — nenhum crédito será cobrado.',back:'Explorar templates',video:'Escolher vídeo',photo:'Escolher foto',remove:'Remover',privacy:'O vídeo fica neste navegador. A foto só é enviada ao armazenamento privado se você clicar em Salvar.',limit:'Arquivo inválido ou acima do limite permitido.'}:es?{title:'Estudio de creación',intro:'Prepara tu vídeo y foto. El vídeo permanece en tu navegador; puedes guardar la foto en tu cuenta.',reference:'Vídeo de referencia',image:'Foto del personaje',prompt:'Instrucciones creativas (opcional)',placeholder:'Describe el resultado deseado...',model:'Modelo de generación',ready:'Vista previa lista',waiting:'Añade un vídeo y una imagen',disabled:'Generación desactivada — no se cobran créditos.',back:'Explorar plantillas',video:'Elegir vídeo',photo:'Elegir foto',remove:'Quitar',privacy:'El vídeo permanece en tu navegador. La foto solo se sube si eliges guardarla.',limit:'Archivo no válido o demasiado grande.'}:{title:'Creator Studio',intro:'Prepare a reference video and character image. Your images and optional MP4 reference video can be saved privately.',reference:'Reference video',image:'Character photo',prompt:'Creative instructions (optional)',placeholder:'Describe the character, scene, or result you want...',model:'Generation model',ready:'Project ready for generation',waiting:'Add a video and an image to prepare your project',disabled:'AI generation is disabled — no credits will be charged.',back:'Explore templates',video:'Choose video',photo:'Choose photo',remove:'Remove',privacy:'Video stays in this browser. Images and an optional MP4 video are uploaded to private storage only when you choose Save reference media.',limit:'Invalid file or file exceeds the size limit.'};
 function choose(event,target,kind,max){const file=event.target.files?.[0];setError('');if(!file)return;if(!(kind==='image'?IMAGE_TYPES:VIDEO_TYPES).includes(file.type)||file.size>max){setError(copy.limit);event.target.value='';return;}target.setFile(file);setSavedReference(null);setDraftMessage('')}

  return <PreviewShell active="Creator">
 <main className="k4k-own-generator k4k-creator-layout">
  <div className="k4k-own-back"><Link href="/k4k-app">← Explore</Link><Link href="/k4k-app/videos">My videos ↗</Link></div>
  <section className="k4k-own-presets-gallery" aria-label="Video presets">
  <div className="k4k-own-gallery-heading"><span>✦ K4K APP</span><h1>Discover video presets</h1><p>Pick a trend to use as your motion reference, or upload your own video in the editor.</p></div>
  <div className="k4k-own-gallery-tabs" role="group" aria-label="Preset categories"><button type="button" className={presetFilter==='trending'?'active':''} onClick={()=>setPresetFilter('trending')}>↗ Community trending</button><button type="button" className={presetFilter==='new'?'active':''} onClick={()=>setPresetFilter('new')}>◷ Community new</button></div>
  <div className="k4k-own-preset-grid">{(presetFilter==='trending'?catalogue.trending:[...catalogue.trending].reverse()).map((preset,index)=><button key={preset.id} type="button" className={'k4k-own-preset-card'+(selectedPreset?.id===preset.id?' selected':'')} onClick={()=>{setSelectedPreset(preset);video.setFile(null);setError('');setDraftMessage('');setCreatorOpen(true)}} aria-pressed={selectedPreset?.id===preset.id} title={preset.title}><video src={preset.videoUrl} muted playsInline preload="metadata" poster={preset.posterUrl||undefined} aria-hidden="true"/><span className="k4k-own-preset-caption"><strong>{preset.title}</strong><small>{preset.requiredImages} {preset.requiredImages===1?'photo':'photos'} · {Math.round(preset.durationSeconds)}s</small></span></button>)}</div>
 </section>
 <button type="button" className="k4k-own-start" onClick={()=>{setSelectedPreset(null);setCreatorOpen(true)}}>✦ Start generating</button>
 {creatorOpen&&<div className="k4k-own-creator-backdrop" onClick={()=>setCreatorOpen(false)}><section className="k4k-own-sheet" role="dialog" aria-modal="true" aria-label="Create your own video" onClick={e=>e.stopPropagation()}>
   <div className="k4k-own-handle" aria-hidden="true"/>
   <header className="k4k-own-title"><span className="k4k-own-info" title="Custom reference-video generator">ⓘ</span><div><h1>Create a video</h1><p>K4K APP · Own Video Generator</p></div><button type="button" className="k4k-own-close" aria-label="Close creator" onClick={()=>setCreatorOpen(false)}>✕</button></header>
   <div className="k4k-own-upload">
    <div className="k4k-own-drop">
     {(video.url||selectedPreset)?<video src={video.url||selectedPreset.videoUrl} controls playsInline preload="metadata" aria-label="Reference video preview"/>:<><span className="k4k-own-drop-icon">▣</span><strong>Add reference video to extract motion</strong><small>MP4 only · up to 50 MB</small></>}
     <label className="k4k-own-select k4k-own-video-picker">＋ Choose video<input type="file" accept="video/mp4" aria-label="Upload reference video" onChange={e=>{if(e.target.files?.length){setSelectedPreset(null);choose(e,video,'video',MAX_VIDEO)}}}/></label>
    </div>
    {selectedPreset&&<button type="button" className="k4k-own-clear-preset" onClick={()=>setSelectedPreset(null)}>Clear selected preset</button>}
    {video.file&&<div className="k4k-own-file"><span>{video.file.name}</span><button type="button" onClick={()=>video.setFile(null)}>Remove</button></div>}
    <p className="k4k-own-preset-hint">{selectedPreset?'Selected: '+selectedPreset.title+' · '+selectedPreset.requiredImages+' character photos':'Select any video from the presets gallery'}</p>
   </div>
   <h2 className="k4k-own-subtitle">Attachments <span>{extraImages.length+(character.file?1:0)} / 8 for generation</span></h2>
   <div className="k4k-own-upload">
    <button type="button" className="k4k-own-asset-launch" onClick={()=>setAssetsOpen(true)}>＋ Add characters, products or clothes <small>Choose up to 30 images</small></button>
    <div className="k4k-own-asset-input-wrap" hidden>
     <span className="k4k-own-icons"><span>♙</span><span>♧</span><span>⬡</span></span>
     <strong>Add your characters, products or clothes</strong><small>Up to 30 images · JPG, PNG or WebP</small>
     <input type="file" accept="image/png,image/jpeg,image/webp" multiple aria-label="Add reference images" onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';if(!files.length)return;if(files.length+extraImages.length+(character.file?1:0)>30||files.some(f=>!IMAGE_TYPES.includes(f.type)||f.size>MAX_IMAGE)){setError('Maximum 30 images, 10 MB each.');return;}setError('');if(!character.file){character.setFile(files[0]);files.shift();setSavedReference(null);setDraftMessage('');}if(files.length){const next=files.map(file=>{const url=URL.createObjectURL(file);extraUrlRegistry.current.add(url);return {file,url};});setExtraImages(old=>[...old,...next]);}}}/>
    </div>
    {(character.url||extraImages.length>0)&&<div className="k4k-own-thumbnails">{character.url&&<div><img src={character.url} alt="Main character"/><button type="button" onClick={()=>{character.setFile(null);setSavedReference(null);setDraftMessage('')}} aria-label="Remove main character">×</button></div>}{extraImages.map((item,i)=><div key={item.url}><img src={item.url} alt={'Reference '+(i+2)}/><button type="button" onClick={()=>removeExtraImage(i)} aria-label={'Remove reference '+(i+2)}>×</button></div>)}</div>}
   </div>
   {error&&<p role="alert" className="k4k-own-error">{error}</p>}
   <div className="k4k-own-bottom"><button type="button" className={'k4k-own-generate'+(generationBusy||generationBlocked||!readiness?'':' k4k-own-generate-ready')} disabled={generationBusy||generationBlocked||!readiness} aria-disabled={generationBusy||generationBlocked||!readiness} onClick={prepareGeneration}>{gen.phase==='preparing'?'Preparing…':gen.phase==='running'?'Generating…':'Generate with '+(model==='lite'?'K4K Lite':'K4K Pro')+' ✦'}</button><button type="button" className="k4k-own-options-button" aria-label="Generation options" aria-expanded={optionsOpen} onClick={()=>setOptionsOpen(true)}>☷</button></div>
   <p className="k4k-own-safety">{model==='lite'?'K4K Lite (up to 15s)':'K4K Pro (4–30s)'} · {quality} · {readiness?.ready?'Credits are only reserved after you confirm the price':'No credits charged'}{typeof readiness?.creditBalance==='number'?' · Balance: '+readiness.creditBalance+' credits':''}</p>
   {readiness?.signedOut&&<p role="status" className="k4k-own-generation-status">Sign in to generate. <Link href="/login?next=%2Fk4k-app%2Fcreator">Sign in</Link></p>}
   {generationBlocked&&!readiness.signedOut&&<div role="status" className="k4k-own-generation-status"><strong>Generation is not available yet.</strong><details><summary>What is still needed</summary><ul>{readiness.blockers.map(item=><li key={item.code}>{item.message}</li>)}</ul></details></div>}
   {gen.phase==='preparing'&&<p role="status" className="k4k-own-generation-status">{gen.message}</p>}
   {gen.phase==='priced'&&<div role="status" className="k4k-own-generation-status"><strong>{gen.price.credits} credits</strong> for {Math.ceil(gen.price.durationSeconds)} seconds at {gen.resolution} with {model==='lite'?'K4K Lite':'K4K Pro'}. Your balance is {gen.price.balance} credits.{gen.retryNote?<p role="alert">{gen.retryNote}</p>:null}{gen.price.sufficient?<button type="button" className="k4k-own-done" onClick={confirmGeneration}>Confirm and use {gen.price.credits} credits</button>:<p>You need {gen.price.credits-gen.price.balance} more credits. <Link href="/k4k-app/credits">See plans</Link></p>}<button type="button" className="k4k-own-clear-preset" onClick={()=>setGen({phase:'idle'})}>Cancel</button></div>}
   {gen.phase==='submitting'&&<p role="status" className="k4k-own-generation-status">Reserving credits and sending your video…</p>}
   {gen.phase==='running'&&<p role="status" className="k4k-own-generation-status">Your video is being generated. {gen.credits} credits are reserved. You can leave this page and find it in <Link href="/k4k-app/videos">My videos</Link>.{gen.note?' '+gen.note:''}</p>}
   {gen.phase==='review'&&<p role="alert" className="k4k-own-generation-status">{gen.message}</p>}
   {gen.phase==='done'&&<div role="status" className="k4k-own-generation-status"><strong>Your video is ready.</strong>{gen.url?<><video src={gen.url} controls playsInline preload="metadata" aria-label="Generated video"/><a className="k4k-own-done" href={gen.url} download>Download video</a></>:<p>Open <Link href="/k4k-app/videos">My videos</Link> to download it.</p>}<button type="button" className="k4k-own-clear-preset" onClick={()=>setGen({phase:'idle'})}>Create another</button></div>}
   {gen.phase==='error'&&<div role="alert" className="k4k-own-error k4k-own-generation-status">{gen.message}{gen.details?.length?<ul>{gen.details.map(item=><li key={item}>{item}</li>)}</ul>:null}</div>}
   <button type="button" className="k4k-own-done" onClick={checkGenerationEstimate} disabled={preflightBusy}>{preflightBusy?'Checking…':'Check estimated generation cost'}</button>
   {preflightError&&<p role="alert" className="k4k-own-error">{preflightError}</p>}
   {preflightResult&&<p role="status">{preflightResult.model} · {preflightResult.resolution} · Estimated provider cost: ${preflightResult.estimatedProviderUsd.toFixed(2)} USD. This is not a customer price or credit quote. No generation or charge occurred.</p>}
  </section></div>}
  {assetsOpen&&<div className="k4k-own-modal-backdrop" onClick={()=>setAssetsOpen(false)}><section className="k4k-own-modal k4k-own-assets-modal" role="dialog" aria-modal="true" aria-label="Choose attachments" onClick={e=>e.stopPropagation()}><div className="k4k-own-handle"/><header><h2>Attachments</h2><button type="button" onClick={()=>setAssetsOpen(false)} aria-label="Close attachments">✕</button></header><p>Upload clear photos of your characters, products or clothes. Maximum 30 images, 10 MB each.</p><label className="k4k-own-assets-picker">＋ Upload images<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';if(files.length+extraImages.length+(character.file?1:0)>30||files.some(f=>!IMAGE_TYPES.includes(f.type)||f.size>MAX_IMAGE)){setError('Maximum 30 images, 10 MB each.');return;}setError('');if(!character.file&&files.length){character.setFile(files.shift());setSavedReference(null);setDraftMessage('');}const next=files.map(file=>{const url=URL.createObjectURL(file);extraUrlRegistry.current.add(url);return {file,url};});setExtraImages(old=>[...old,...next]);}}/></label><div className="k4k-own-assets-grid">{character.url&&<img src={character.url} alt="Primary reference"/>}{extraImages.map((item,i)=><img src={item.url} key={item.url} alt={'Reference '+(i+2)}/>)}</div><button type="button" className="k4k-own-done" onClick={()=>setAssetsOpen(false)}>Done · {extraImages.length+(character.file?1:0)} selected</button></section></div>}
  {optionsOpen&&<div className="k4k-own-modal-backdrop" onClick={()=>setOptionsOpen(false)}><section className="k4k-own-modal" role="dialog" aria-modal="true" aria-label="Generation options" onClick={e=>e.stopPropagation()}><div className="k4k-own-handle"/><header><h2>Options</h2><button type="button" aria-label="Close options" onClick={()=>setOptionsOpen(false)}>✕</button></header>
   <label>Quality <select value={model} onChange={e=>setModel(e.target.value)}><option value="lite">K4K Lite · up to 15s</option><option value="pro">K4K Pro · 4–30s</option></select></label>
   <label>Resolution <select value={quality} onChange={e=>setQuality(e.target.value)}><option>480p</option><option>720p</option><option>1080p</option></select></label>
   <label>Prompt <textarea value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,1200))} maxLength={1200} rows={3} placeholder="Optional — describe what to change and what must stay the same"/></label>
   <label>Style <select value={style} onChange={e=>setStyle(e.target.value)}><option>None</option><option>Cinematic</option><option>Realistic</option></select></label>
   <label>Mode <select value={activeTab} onChange={e=>setActiveTab(e.target.value)}><option>Motion Transfer</option><option>Character Swap</option></select></label>
   <label>Batch size <select value={batchSize} onChange={e=>setBatchSize(Number(e.target.value))}><option value={1}>1 video</option><option value={2}>2 videos</option><option value={3}>3 videos</option></select></label>
   <p>These are preview settings. Actual model support, credits and output quality require provider verification.</p>
   <button type="button" className="k4k-own-done" onClick={()=>setOptionsOpen(false)}>Done</button>
  </section></div>}
  <section className="k4k-own-drafts"><h2>Save your project</h2><p>Save your character images and optional MP4 reference video privately to your account. Maximum video size: 50 MB. No generation or charges.</p>{character.file&&<button type="button" onClick={saveReference} disabled={uploading}>{uploading?'Saving…':'Save reference media privately'}</button>}{uploadMessage&&<p role="status">{uploadMessage}</p>}{savedReference&&<button type="button" onClick={saveDraft} disabled={savingDraft}>{savingDraft?'Saving…':'Save draft'}</button>}{draftMessage&&<p role="status">{draftMessage}</p>}<button type="button" onClick={loadHistory}>Refresh draft history</button>{historyState&&<p role="status">{historyState}</p>}{history.map(job=><p key={job.id}>{job.model||'Preview'} · {job.status}</p>)}</section>
 </main>
 </PreviewShell>;
}
