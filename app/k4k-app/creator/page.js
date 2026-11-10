'use client';
import {useEffect,useRef,useState} from 'react';
import './creator.css';
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
 const [generationDraftId,setGenerationDraftId]=useState(null),[generationQuote,setGenerationQuote]=useState(null),[generationBusy,setGenerationBusy]=useState(false),[generationMessage,setGenerationMessage]=useState(''),[submittedJobId,setSubmittedJobId]=useState(null);
 const generationRequestKey=useRef(null);
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
   setGenerationDraftId(data.id);setGenerationQuote(null);generationRequestKey.current=crypto.randomUUID();
   setDraftMessage('Draft saved: '+data.id+'. All '+savedReference.paths.length+' image attachments and your prompt are saved privately. Reference video saved privately when supplied. No generation started and no credits charged.');await loadHistory();
  }catch(e){setDraftMessage(e?.message||'Unable to save draft.')}finally{setSavingDraft(false)}
 }
 async function generationAction(action){
  if(generationBusy)return;
  const jobId=action==='refresh'?submittedJobId:generationDraftId;
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
   }else{setGenerationMessage(result.creditsRefunded?'Generation failed. Reserved credits were refunded.':'Job status: '+result.status+(result.status==='awaiting_output'?' — private video delivery is pending.':''));await loadHistory();}
  }catch(error){setGenerationMessage(error.message||'Unable to continue.');}
  finally{setGenerationBusy(false);}
 }
 useEffect(()=>{setGenerationDraftId(null);setGenerationQuote(null);generationRequestKey.current=null;},[model,quality,prompt,video.file,character.file,extraImages]);
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
   setSavedReference({paths,videoPath,videoFile:video.file,userId:user.id,file:character.file,extraFiles:extraImages.map(item=>item.file)});
   setUploadMessage(files.length+' image(s)'+(videoPath?' and reference video':'')+' saved privately. No AI generation or credit charge occurred.');
  }catch(e){setUploadMessage(e?.message||'Unable to save reference image.')}finally{setUploading(false)}
 }
 useEffect(()=>{setPreflightResult(null);setPreflightError('')},[model,quality,video.file,character.file,extraImages]);
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
   <div className="k4k-own-bottom"><button type="button" className="k4k-own-generate" disabled={generationBusy||!generationDraftId} onClick={()=>generationAction('quote')}>{generationBusy?'Checking…':'Review generation cost'} ✦</button><button type="button" className="k4k-own-options-button" aria-label="Generation options" aria-expanded={optionsOpen} onClick={()=>setOptionsOpen(true)}>☷</button></div>
   <p className="k4k-own-safety">Preview only · {model==='lite'?'K4K Lite (up to 15s)':'K4K Pro (4–30s)'} · AI generation disabled · No credits charged</p>
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
  <section aria-label="Generation confirmation" className="k4k-card">
   {generationQuote&&<><p>Estimated provider cost before discounts: ${generationQuote.estimatedProviderUsd.toFixed(3)} USD · {generationQuote.customerCredits===null?'Credit pricing awaiting approval':generationQuote.customerCredits+' credits'}</p><p>This quote expires after five minutes. Failed or moderated jobs refund their reservation once verified.</p>{generationQuote.generationEnabled&&generationQuote.quoteToken&&<button type="button" disabled={generationBusy} onClick={()=>generationAction('submit')}>Confirm generation · {generationQuote.customerCredits} credits</button>}</>}
   {generationMessage&&<p role="status" aria-live="polite">{generationMessage}</p>}
   {submittedJobId&&<button type="button" disabled={generationBusy} onClick={()=>generationAction('refresh')}>Check generation status</button>}
  </section>
  <section className="k4k-own-drafts"><h2>Save your project</h2><p>Save your character images and optional MP4 reference video privately to your account. Maximum video size: 50 MB. No generation or charges.</p>{character.file&&<button type="button" onClick={saveReference} disabled={uploading}>{uploading?'Saving…':'Save reference media privately'}</button>}{uploadMessage&&<p role="status">{uploadMessage}</p>}{savedReference&&<button type="button" onClick={saveDraft} disabled={savingDraft}>{savingDraft?'Saving…':'Save draft'}</button>}{draftMessage&&<p role="status">{draftMessage}</p>}<button type="button" onClick={loadHistory}>Refresh draft history</button>{historyState&&<p role="status">{historyState}</p>}{history.map(job=><p key={job.id}>{job.model||'Preview'} · {job.status}</p>)}</section>
 </main>
 </PreviewShell>;
}
