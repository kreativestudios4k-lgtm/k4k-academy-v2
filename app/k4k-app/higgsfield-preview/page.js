'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../../lib/supabase/client';
const panel={background:'#111b16',border:'1px solid #334b37',borderRadius:16,padding:22};
export default function HiggsfieldPreview(){
 const [video,setVideo]=useState(null),[images,setImages]=useState([]),[seconds,setSeconds]=useState(null),[resolution,setResolution]=useState('480p');
 const [result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!video){setSeconds(null);return}
  const src=URL.createObjectURL(video),v=document.createElement('video');
  v.preload='metadata';
  v.onloadedmetadata=()=>{setSeconds(Number.isFinite(v.duration)?v.duration:null);URL.revokeObjectURL(src)};
  v.onerror=()=>{setError('Unable to read duration on this device.');setSeconds(null);URL.revokeObjectURL(src)};
  v.src=src;
  return ()=>{v.onloadedmetadata=null;v.onerror=null;URL.revokeObjectURL(src)};
 },[video]);
 async function estimate(){
  setError('');setResult(null);
  if(!video||!seconds||seconds<4||seconds>30){setError('Choose an MP4 from 4 to 30 seconds.');return}
  if(images.length<1||images.length>8||!images.every(f=>['image/jpeg','image/png','image/webp'].includes(f.type))){setError('Select 1–8 JPG, PNG or WEBP character photos.');return}
  setBusy(true);
  try{
   const {data:{session}}=await createClient().auth.getSession();
   if(!session?.access_token)throw Error('Please sign in first.');
   const response=await fetch('/api/higgsfield/customer-preview-estimate',{
    method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({seconds,resolution,imageCount:images.length})
   });
   const body=await response.json();if(!response.ok)throw Error(body.error||'ESTIMATE_UNAVAILABLE');
   setResult(body);
  }catch(e){setError(e.message||'ESTIMATE_UNAVAILABLE')}finally{setBusy(false)}
 }
 return <main style={{background:'#080f0b',color:'#f1f7f0',minHeight:'100vh',padding:'40px 18px'}}>
  <div style={{maxWidth:1020,margin:'auto'}}>
   <Link href="/k4k-app/higgsfield-connection" style={{color:'#a1efa5'}}>← K4K owner QA</Link>
   <p style={{color:'#a1efa5',letterSpacing:3,fontSize:12,marginTop:34}}>K4K MOTION · CUSTOMER FLOW PREVIEW</p>
   <h1 style={{fontSize:'clamp(31px,6vw,56px)',lineHeight:1.08,margin:'9px 0'}}>Don't follow the trend. Create it.</h1>
   <p style={{color:'#adbdaf',maxWidth:730,lineHeight:1.6}}>Test the upcoming video-swap flow without spending API money or customer credits. Files remain on this device while server-side media verification is being connected.</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:18,marginTop:30}}>
    <section style={panel}>
     <h2 style={{fontSize:20}}>01 · Source video</h2>
     <p style={{color:'#aebbaf',fontSize:13}}>Choose a 4–30 second MP4. It is not uploaded.</p>
     <input type="file" accept="video/mp4" onChange={e=>{setVideo(e.target.files?.[0]||null);setResult(null);setError('')}} style={{maxWidth:'100%',padding:22,border:'1px dashed #5b7e60',borderRadius:12}}/>
     <p style={{color:'#a1efa5',fontSize:13}}>{seconds?'Duration on device: '+seconds.toFixed(2)+'s':'No duration detected'}</p>
    </section>
    <section style={panel}>
     <h2 style={{fontSize:20}}>02 · Reference characters</h2>
     <p style={{color:'#aebbaf',fontSize:13}}>Choose 1–8 photos. They are not uploaded.</p>
     <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{setImages(Array.from(e.target.files||[]));setResult(null);setError('')}} style={{maxWidth:'100%',padding:22,border:'1px dashed #5b7e60',borderRadius:12}}/>
     <p style={{color:'#a1efa5',fontSize:13}}>{images.length+' photo(s) selected'}</p>
    </section>
   </div>
   <section style={{...panel,marginTop:18}}>
    <h2 style={{fontSize:20}}>03 · Quality and price estimate</h2>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
     {['480p','720p','1080p'].map(q=><button key={q} type="button" onClick={()=>{setResolution(q);setResult(null)}} style={{borderRadius:10,border:'1px solid #658768',padding:'12px 18px',background:q===resolution?'#a1efa5':'transparent',color:q===resolution?'#0c1b0f':'#ecf7eb',fontWeight:800}}>{q}</button>)}
    </div>
    <button type="button" onClick={estimate} disabled={busy} style={{marginTop:18,border:0,borderRadius:10,padding:'13px 18px',fontWeight:800,background:'#a1efa5',color:'#102016'}}>{busy?'Calculating…':'Calculate estimated cost'}</button>
    {error&&<p role="alert" style={{color:'#ffa9a9'}}>{error}</p>}
    {result&&<div role="status" style={{borderTop:'1px solid #425946',marginTop:20,paddingTop:18}}>
      <p style={{fontSize:13,color:'#acbfad'}}>Published provider rate estimate · {result.billedSeconds} billed seconds · {result.resolution}</p>
      <strong style={{fontSize:36,color:'#a1efa5'}}>{'$'+Number(result.estimatedProviderUsd).toFixed(2)}</strong>
      <p style={{fontSize:13,color:'#bbc8ba'}}>Not a signed customer quote or verified provider charge. No credits or media were transmitted.</p>
     </div>}
   </section>
   <section style={{...panel,marginTop:18}}>
    <h2 style={{fontSize:20}}>04 · Generate</h2>
    <p style={{color:'#b5c6b7'}}>Locked until verified uploads, signed customer quotes and an end-to-end billing test pass.</p>
    <button type="button" disabled style={{padding:'13px 20px',border:0,borderRadius:10,background:'#a1efa5',color:'#142015',fontWeight:800,opacity:.4}}>Generation locked · Preview</button>
    <p style={{fontSize:12,color:'#a2b5a4'}}>No new paid API call. No customer charges. Production unchanged.</p>
   </section>
  </div>
 </main>;
}
