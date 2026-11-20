'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ChevronDown,Search,X,Play,Upload} from 'lucide-react';
import CustomerGeneration from './customer-generation';
import './motion-wide.css';
import './motion-library-redesign.css';
import DirectorView,{LocalMedia} from './director-view';
import MotionTemplatePreview from '../MotionTemplatePreview';
import {generationReference} from '../../../lib/template-generation.mjs';
import {templateCast} from '../../../lib/template-cast.mjs';
import {buildDirectorPrompt} from '../../../lib/director-cast.mjs';
import {createClient} from '../../../lib/supabase/client';
const panel={background:'#111b16',border:'1px solid #334b37',borderRadius:16,padding:22};
export default function HiggsfieldPreview({customer=false,maxUsd=1.60,qualityCaps=null,usdPerCredit=0.10,templates=[],gallery=[],initialTemplateId='',initialPreviewId='',initialMotionModel='ultra',liteEnabled=false,embedded=false}){
 const [templateId,setTemplateId]=useState(()=>templates.some(t=>t.id===initialTemplateId)?initialTemplateId:'');
 const [assetsOpen,setAssetsOpen]=useState(false),[assetsQuery,setAssetsQuery]=useState(''),[assetsTab,setAssetsTab]=useState('presets');
 const [libraryCategory,setLibraryCategory]=useState('all'),[librarySearch,setLibrarySearch]=useState('');
 const [previewOriginalId,setPreviewOriginalId]=useState(initialPreviewId||initialTemplateId||'');
 const [modalTemplateId,setModalTemplateId]=useState('');
 const motionGallery=gallery.length?gallery:templates;
 const selectedTemplate=templates.find(t=>t.id===templateId);
 const initialTemplate=templates.find(t=>t.id===initialTemplateId);
 const initialCast=templateCast(initialTemplate);
 const initialSlots=initialCast.verified?initialCast.count:1;
 const source=selectedTemplate?generationReference(selectedTemplate,{maxSeconds:30}):null;
 const [motionModel,setMotionModel]=useState(()=>initialMotionModel==='lite'&&liteEnabled?'lite':'ultra');
 const rates=motionModel==='lite'?{'480p':0.0739,'720p':0.1471,'1080p':0.2936}:{'480p':0.154,'720p':0.3446,'1080p':0.8346};
 const [video,setVideo]=useState(null),[images,setImages]=useState(()=>Array(initialSlots).fill(null)),[seconds,setSeconds]=useState(null),[resolution,setResolution]=useState('480p');
 const [targets,setTargets]=useState(()=>Array(initialSlots).fill('')),[main,setMain]=useState(0),[direction,setDirection]=useState('');
 let prompt='',castError='';try{prompt=buildDirectorPrompt({targets,main,direction});}catch(e){castError=e.message;}
 const castReady=!!prompt&&images.length===targets.length&&images.every(Boolean);
 const actionLock=useRef(false),uploaded=useRef(null);
 const [result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  setSeconds(source?.seconds||null);
  if(source||!video)return;
  const src=URL.createObjectURL(video),v=document.createElement('video');
  v.preload='metadata';
  v.onloadedmetadata=()=>{setSeconds(Number.isFinite(v.duration)?v.duration:null);URL.revokeObjectURL(src)};
  v.onerror=()=>{setError('Unable to read duration on this device.');setSeconds(null);URL.revokeObjectURL(src)};
  v.src=src;
  return ()=>{v.onloadedmetadata=null;v.onerror=null;URL.revokeObjectURL(src)};
 },[video,templateId]);
 async function verifyUploads(){
  if(actionLock.current)return;
  actionLock.current=true;setError('');setResult(null);
  try{
   if(!castReady)throw Error(castError||'Add a photo to every character slot.');
   if(!source&&(!video||video.type!=='video/mp4'||video.size<12||video.size>50*1024*1024))throw Error('Choose an MP4 up to 50 MB.');
   if(images.length<1||images.length>8||images.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size<12||f.size>10*1024*1024))throw Error('Choose 1–8 JPG, PNG or WEBP images, up to 10 MB each.');
   const client=createClient();
   const {data:{session}}=await client.auth.getSession();
   if(!session?.access_token)throw Error('Please sign in first.');
   const headers={Authorization:'Bearer '+session.access_token};
   const gate=await fetch('/api/higgsfield/customer-preview-media',{method:'POST',headers:{...headers,'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({preflight:true})});
   if(!gate.ok)throw Error('Sign in to an eligible account to verify your uploads.');
   const userId=session.user.id;
   if(!uploaded.current||uploaded.current.userId!==userId)uploaded.current={userId,videoPath:null,referencePaths:[]};
   const saved=uploaded.current;
   if(source&&!saved.videoPath){
    const imported=await fetch('/api/generation/template-reference',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({templateId})});
    const body=await imported.json();if(!imported.ok)throw Error('Unable to load this template. Choose another or upload your own video.');saved.videoPath=body.videoPath;
   }
   if(!saved.videoPath){
    const path=userId+'/'+crypto.randomUUID()+'.mp4';
    const {error}=await client.storage.from('studio-videos').upload(path,video,{contentType:'video/mp4',upsert:false});
    if(error)throw Error('Video upload failed. Please retry.');saved.videoPath=path;
   }
   for(let i=saved.referencePaths.length;i<images.length;i++){
    const file=images[i],ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
    const path=userId+'/'+crypto.randomUUID()+'.'+ext;
    const {error}=await client.storage.from('studio-references').upload(path,file,{contentType:file.type,upsert:false});
    if(error)throw Error('Photo upload failed. Please retry.');saved.referencePaths.push(path);
   }
   const response=await fetch('/api/higgsfield/customer-preview-media',{method:'POST',cache:'no-store',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({videoPath:saved.videoPath,referencePaths:saved.referencePaths,resolution,motionModel})});
   const body=await response.json();if(!response.ok)throw Error('Media verification failed. Use a 4–30 second MP4 and valid images at least 240 × 240 pixels.');
   if(!body.verifiedInputStorage)throw Error('Private file verification did not complete.');
   setResult(body);
   return {videoPath:saved.videoPath,referencePaths:[...saved.referencePaths]};
  }catch(e){const safe=e instanceof Error?e:Error('Unable to verify media.');setError(safe.message);throw safe}finally{actionLock.current=false}
 }
 function openTemplatePreview(id){
  setPreviewOriginalId(id);
  setModalTemplateId(id);
 }
 function recreateFromPreview(){
  if(busy||!modalTemplateId||!templates.some(t=>t.id===modalTemplateId))return;
  selectSourceTemplate(modalTemplateId);
  setModalTemplateId('');
  requestAnimationFrame(()=>document.querySelector('.khm-cast-panel')?.scrollIntoView({behavior:'smooth',block:'center'}));
 }
 function selectSourceTemplate(id){
  setPreviewOriginalId(id);
  setTemplateId(id);setVideo(null);uploaded.current=null;setResult(null);setError('');setAssetsOpen(false);
  const item=templates.find(t=>t.id===id),cast=templateCast(item);const n=cast.verified?cast.count:1;
  setImages(Array(n).fill(null));setTargets(Array(n).fill(''));setMain(0);
 }
 const filteredAssets=templates.filter(t=>t.title.toLowerCase().includes(assetsQuery.toLowerCase().trim()));
 const libraryItems=motionGallery.filter(t=>t.title.toLowerCase().includes(librarySearch.toLowerCase().trim())&&(libraryCategory==='all'||(libraryCategory==='short'?t.durationSeconds<=10:t.durationSeconds>10)));
 const featuredTemplate=motionGallery.find(t=>t.id===previewOriginalId)||selectedTemplate||libraryItems[0]||motionGallery[0];
 const modalTemplate=motionGallery.find(t=>t.id===modalTemplateId)||null;
 const featuredUsable=!!featuredTemplate&&templates.some(t=>t.id===featuredTemplate.id);
 const billableSeconds=Number.isFinite(seconds)&&seconds>=4&&seconds<=30?Math.min(Math.ceil(seconds),motionModel==='lite'?15:30):null;
 const currentCap=quality=>motionModel==='lite'?maxUsd:(qualityCaps?.[quality]??maxUsd);
 const maxSecondsFor=quality=>{
  const affordableSeconds=Math.max(0,Math.floor(currentCap(quality)/rates[quality]+1e-9));
  return motionModel==='lite'&&affordableSeconds>=15?30:Math.min(motionModel==='lite'?15:30,affordableSeconds);
 };
 const priceFor=quality=>billableSeconds===null?null:Math.ceil(Math.round(billableSeconds*rates[quality]*1000000)/Math.round(usdPerCredit*1000000));
 const credits=priceFor(resolution);
 const withinBudget=billableSeconds!==null&&billableSeconds*rates[resolution]<=currentCap(resolution)+1e-9;

 return <main className={'khm-root'+(embedded?' khm-embedded':'')}>
  <div className="khm-studio-layout">
   {!embedded&&<nav className="khm-topnav" aria-label="K4K Motion navigation"><Link href={customer?"/k4k-app":"/k4k-app/higgsfield-connection"} className="khm-brand"><img src="/k4k-mark.svg" width="34" height="34" alt=""/> <span>K4K APP</span></Link><span className="khm-nav-context">K4K MOTION <b>·</b> CREATE</span><div className="khm-desktop-links"><Link href="/k4k-app/image">Image</Link><Link href="/k4k-app/video">Video</Link><Link href="/k4k-app/motion" aria-current="page">K4K Motion</Link><Link href="/k4k-app/videos">Library</Link></div><details className="khm-mobile-menu"><summary aria-label="Open K4K Motion menu">Menu</summary><div><Link href="/k4k-app/image">Image</Link><Link href="/k4k-app/video">Video</Link><Link href="/k4k-app/motion" aria-current="page">K4K Motion</Link><Link href="/k4k-app/videos">My Generations</Link>{customer&&<Link href="/login">Sign in</Link>}</div></details></nav>}
   {customer&&<section id="motion-library" className="khm-motion-library" aria-label="K4K Motion Library">
    <div className="khm-lib-top"><div className="khm-lib-tabs"><strong>◉ K4K Originals · Motion Library</strong><Link href="/k4k-app/videos">History</Link></div><label className="khm-lib-search"><Search size={15}/><input aria-label="Search motion templates" placeholder="Search motions" value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)}/></label></div>
    <div className="khm-lib-categories" role="group" aria-label="Filter motions"><button className={libraryCategory==='all'?'active':''} onClick={()=>setLibraryCategory('all')}>All</button><button className={libraryCategory==='short'?'active':''} onClick={()=>setLibraryCategory('short')}>Short clips</button><button className={libraryCategory==='long'?'active':''} onClick={()=>setLibraryCategory('long')}>Longer scenes</button></div>
    <div className="khm-lib-content"><div className="khm-lib-grid">{libraryItems.map(t=>{
      const canRecreate=templates.some(ready=>ready.id===t.id);
      return <article key={t.id} className={'khm-lib-card'+(t.id===featuredTemplate?.id?' active':'')}
       onMouseEnter={event=>{const v=event.currentTarget.querySelector('video');if(v&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)v.play().catch(()=>{})}}
       onMouseLeave={event=>{const v=event.currentTarget.querySelector('video');v?.pause()}}>
       <div className="khm-lib-poster">
        <video src={t.videoUrl} muted loop playsInline preload="metadata" aria-hidden="true"
         onLoadedMetadata={event=>{const v=event.currentTarget;if(Number.isFinite(v.duration)&&v.duration>0)v.currentTime=Math.min(.15,v.duration/2)}}/>
        <button type="button" className="khm-lib-open" aria-label={'Open preview of '+t.title} disabled={busy} onClick={()=>openTemplatePreview(t.id)}><Play size={26}/></button>
        <span className="khm-lib-length">{Math.ceil(t.durationSeconds)}s</span>
        {canRecreate&&<button type="button" className="khm-lib-recreate" disabled={busy} onClick={()=>openTemplatePreview(t.id)}>Recreate <Play size={14}/></button>}
       </div>
       <span className="khm-lib-card-title">{t.title}</span>
       <span className="khm-lib-card-status">{canRecreate?'Select Recreate to view and cast your avatar':'Preview only · not approved for generation'}</span>
      </article>
     })}</div>{!libraryItems.length&&<p className="khm-lib-empty">No K4K Originals match your search.</p>}</div>
    <p className="khm-lib-foot">K4K Originals support 4–30 second sources. Available qualities depend on the signed credit quote and safety budget; finished videos stay private in My Generations.</p>
   </section>}
   <p className="khm-kicker">K4K MOTION <span>✦</span> {customer?'DIRECTOR STUDIO':'CUSTOMER FLOW PREVIEW'}</p>
   <h1 className="khm-title">YOUR VIDEO. YOUR CAST.<br/><em>YOUR NEXT VIRAL HIT.</em></h1>
   <p className="khm-subtitle">Don't follow the trend. <strong>Create it.</strong> Upload a reference video or choose a scene, cast your characters and direct the motion. See the credit cost instantly before you generate. Your files are checked privately when you select Generate. No credits are charged until you confirm the price.</p>
   {customer&&<div className="khm-source-selector"><label>Choose your source</label><button type="button" className="khm-source-trigger" onClick={()=>{setAssetsQuery('');setAssetsTab('presets');setAssetsOpen(true)}} disabled={busy}><span>{selectedTemplate?.title||'Upload my own video'}</span><span>Browse presets and uploads</span><ChevronDown size={18}/></button></div>}
   <div className="khm-motion-control-title"><small>REALITY MANIPULATION</small><h2>K4K <em>Motion</em></h2><p>Motion transfer · Character & object references</p></div>
   <div className="khm-video-stage" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:18,marginTop:30}}>
    <section className="khm-video-panel" style={panel}>
     <h2 style={{fontSize:20}}>01 · Source video</h2>
     <p style={{color:'#aebbaf',fontSize:13}}>Choose a 4–30 second MP4, up to 50 MB.</p>
     {source?<><h3>{selectedTemplate.title}</h3><video src={source.url} controls playsInline style={{width:"100%",maxHeight:420,borderRadius:12}}/><p>Confirm the number of people you want to replace below.</p></>:<input type="file" disabled={busy} accept="video/mp4" onChange={e=>{uploaded.current=null;setSeconds(null);setVideo(e.target.files?.[0]||null);setResult(null);setError('')}} style={{maxWidth:'100%',padding:22,border:'1px dashed #5b7e60',borderRadius:12}}/>}
     <p style={{color:'#a1efa5',fontSize:13}}>{seconds?(source?'Template duration: ':'Duration on device: ')+seconds.toFixed(2)+'s':'No duration detected'}</p>
     <LocalMedia file={video} video/>
    </section>
   </div>
   <div className="khm-cast-panel"><DirectorView images={images} targets={targets} main={main} disabled={busy} onChange={(nextImages,nextTargets,nextMain)=>{if(nextImages!==images){uploaded.current=null;setResult(null);}setImages(nextImages);setTargets(nextTargets);setMain(nextMain);setError('');}}/></div>
   <section className="khm-direction-panel" style={{...panel,marginTop:18}}>
    <label htmlFor="extra-direction">Extra direction (optional)</label>
    <textarea id="extra-direction" value={direction} maxLength={500} rows={2} onChange={e=>setDirection(e.target.value)} style={{display:'block',boxSizing:'border-box',width:'100%',marginTop:12,padding:12,borderRadius:10,background:'#080f0b',color:'white',border:'1px solid #415b47'}} placeholder="Add a mood or other creative instruction"/>
    <p style={{color:'#a1efa5',fontSize:13}}>{castReady?'Cast ready · '+images.length+' numbered photos':castError||'Add a photo to every slot to continue.'}</p>
   </section>
   <section className="khm-quality-panel" style={{...panel,marginTop:18}}>
    <h2 style={{fontSize:20}}>03 · Motion model & quality</h2>
    <div className="khm-motion-model-choices" role="group" aria-label="Choose K4K Motion model">
      {liteEnabled&&<button type="button" aria-pressed={motionModel==='lite'} className={motionModel==='lite'?'selected':''} disabled={busy} onClick={()=>{setMotionModel('lite');setResult(null);setError('')}}><strong>K4K Motion Lite</strong><small>First 15 seconds · source audio preserved · lower credit cost</small></button>}
      <button type="button" aria-pressed={motionModel==='ultra'} className={motionModel==='ultra'?'selected':''} disabled={busy} onClick={()=>{setMotionModel('ultra');setResult(null);setError('')}}><strong>K4K Motion Ultra</strong><small>Full motion transfer · up to 30-second source · high-detail model</small></button>
    </div>
    {motionModel==='lite'&&<p className="khm-model-length-note" role="note">Lite uses only the first 15 seconds of a longer source video and preserves the original audio. A 30-second source produces up to 15 seconds, not 30.</p>}
    <p style={{fontSize:13,color:'#b9c8bd',marginTop:6}}>Source videos: 4–30 seconds. Each quality shows its current maximum duration and instant credit estimate.</p>
    <div className="khm-quality-options" role="group" aria-label="Choose video quality">
     {['480p','720p','1080p'].map(q=>{
      const cost=priceFor(q),maxQualitySeconds=maxSecondsFor(q),affordable=cost!==null&&billableSeconds*rates[q]<=currentCap(q)+1e-9;
      const disabled=busy||(customer&&(maxQualitySeconds<4||(cost!==null&&!affordable)));
      return <button key={q} type="button" disabled={disabled} aria-pressed={q===resolution} onClick={()=>{setResolution(q);setResult(null);uploaded.current=null}} className={'khm-quality-choice'+(q===resolution?' selected':'')}><strong>{q}</strong><span>{maxQualitySeconds<4?'Unavailable':cost===null?'Up to '+maxQualitySeconds+'s':affordable||!customer?cost+' credits':'Up to '+maxQualitySeconds+'s'}</span></button>
     })}
    </div>
    <div className="khm-credit-summary" aria-live="polite">
     <span>Estimated credits · updated automatically</span>
     <strong>{credits!==null?credits+' credits':'Choose a source video to see credits'}</strong>
     <small>{billableSeconds!==null?billableSeconds+' billed output seconds · '+resolution+' · final amount confirmed before charging':'Credit price depends on the video duration and selected resolution.'}</small>
    </div>
    {customer&&credits!==null&&!withinBudget&&<p role="status" style={{color:'#efc895',fontSize:13}}>This quality exceeds the current per-video provider limit. Choose a lower resolution or shorter video.</p>}
    {error&&<p role="alert" style={{color:'#ffa9a9'}}>{error}</p>}
    <CustomerGeneration customer={customer} stayInWorkspace={embedded} onBusyChange={setBusy} prompt={prompt}
      onPrepareMedia={verifyUploads}
      canGenerate={castReady&&billableSeconds!==null&&withinBudget}
      motionModel={motionModel}
      selectionKey={JSON.stringify([motionModel,templateId,video?.name,video?.size,video?.lastModified,images.map(f=>f?[f.name,f.size,f.lastModified]:null),targets,main,direction,resolution])}
      media={null} resolution={resolution} estimatedCredits={credits}/>
    <p className="khm-permission-note">By confirming generation, you confirm you have permission to use the source video and character photos.</p>
   </section>
  </div>
 {customer&&modalTemplate&&<MotionTemplatePreview
   template={modalTemplate} library={motionGallery}
   canRecreate={!busy&&templates.some(t=>t.id===modalTemplate.id)}
   unavailableReason="This example is preview-only; choose a supported K4K Original or upload a source video."
   onClose={()=>setModalTemplateId('')}
   onChooseTemplate={openTemplatePreview}
   onRecreate={recreateFromPreview}
 />}
 {assetsOpen&&<div className="khm-assets-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAssetsOpen(false)}}><section className="khm-assets-dialog" role="dialog" aria-modal="true" aria-label="Choose motion reference video"><header><div><span>K4K MOTION · ASSETS</span><h2>Choose source video</h2></div><button aria-label="Close asset picker" type="button" onClick={()=>setAssetsOpen(false)}><X size={21}/></button></header><div className="khm-assets-tabs"><button type="button" className={assetsTab==='uploads'?'active':''} onClick={()=>setAssetsTab('uploads')}>Uploads</button><button type="button" className={assetsTab==='presets'?'active':''} onClick={()=>setAssetsTab('presets')}>Presets · {templates.length}</button></div>{assetsTab==='presets'&&<label className="khm-assets-search"><Search size={16}/><input placeholder="Find a motion template" aria-label="Search motion templates" value={assetsQuery} onChange={e=>setAssetsQuery(e.target.value)}/></label>}<div className="khm-assets-grid"><button type="button" className="khm-asset-upload" onClick={()=>selectSourceTemplate('')}><Upload size={28}/><strong>Use my own video</strong><small>4–30s MP4 · max 50 MB</small></button>{assetsTab==='presets'&&filteredAssets.map(t=><button type="button" className={'khm-asset-card'+(t.id===templateId?' active':'')} key={t.id} onClick={()=>selectSourceTemplate(t.id)}><span className="khm-asset-poster"><img src={t.posterUrl||undefined} alt="" loading="lazy"/><span><Play size={14}/></span></span><strong>{t.title}</strong><small>{Math.ceil(generationReference(t,{maxSeconds:30}).seconds)}s</small></button>)}</div><footer>Preset videos are only available where K4K has a verified reference. Selecting a preset never charges credits.</footer></section></div>}
 </main>;
}
