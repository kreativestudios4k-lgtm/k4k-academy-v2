'use client';
import {useState} from 'react';
import Link from 'next/link';
import OwnerCreativeQA from '../OwnerCreativeQA';
import {ArrowLeft,ShieldCheck} from 'lucide-react';

const choices=[
 {id:'nano_banana_2',name:'Nano Banana 2.1',kind:'image',mode:'Text to image'},
 {id:'flux_3_image',name:'FLUX 3 Image',kind:'image',mode:'Text to image'},
 {id:'seedance_2_5',name:'Seedance 2.5',kind:'video',mode:'Text to video'},
 {id:'kling4_0',name:'Kling 4.0',kind:'video',mode:'Text to video'}
];
export default function InternalOwnerQA(){
 const [index,setIndex]=useState(0),[prompt,setPrompt]=useState(''),[aspect,setAspect]=useState('9:16');
 const choice=choices[index];
 return <main style={{background:'#141516',color:'#f7f7f7',minHeight:'100dvh',fontFamily:'Arial, sans-serif',padding:'max(24px,4vw)'}}>
   <div style={{maxWidth:800,margin:'0 auto'}}>
     <Link href="/k4k-app/dashboard" style={{display:'inline-flex',alignItems:'center',gap:8,color:'#d4d4d7',textDecoration:'none',fontSize:13}}><ArrowLeft size={16}/> Back to dashboard</Link>
     <header style={{margin:'30px 0 22px'}}><span style={{display:'inline-flex',gap:8,alignItems:'center',color:'#b5b5b9',fontSize:11,letterSpacing:1}}><ShieldCheck size={15}/> PRIVATE ENGINEERING TOOL</span><h1 style={{fontSize:'clamp(27px,4vw,43px)',margin:'11px 0'}}>Owner provider QA</h1><p style={{fontSize:14,color:'#aaa',lineHeight:1.6}}>Internal billable provider tests are intentionally separate from customer Image and Video generation. This page does not use the K4K customer credit quote or charge.</p></header>
     <section style={{background:'#1e1f22',border:'1px solid #393a40',borderRadius:12,padding:20}}>
      <label htmlFor="qa-model" style={{display:'block',fontSize:12,marginBottom:7}}>Test model</label>
      <select id="qa-model" value={index} onChange={e=>{setIndex(Number(e.target.value));setPrompt('')}} style={{width:'100%',padding:12,background:'#27282c',border:'1px solid #55565a',borderRadius:8,color:'#fff'}}>{choices.map((m,i)=><option key={m.id} value={i}>{m.name}</option>)}</select>
      <label htmlFor="qa-aspect" style={{display:'block',fontSize:12,margin:'16px 0 7px'}}>Aspect ratio</label>
      <select id="qa-aspect" value={aspect} onChange={e=>setAspect(e.target.value)} style={{width:'100%',padding:12,background:'#27282c',border:'1px solid #55565a',borderRadius:8,color:'#fff'}}><option>9:16</option><option>16:9</option><option>1:1</option></select>
      <label htmlFor="qa-prompt" style={{display:'block',fontSize:12,margin:'16px 0 7px'}}>Test prompt</label>
      <textarea id="qa-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} rows={6} maxLength={10000} placeholder="Describe the test scene…" style={{width:'100%',padding:12,boxSizing:'border-box',background:'#27282c',border:'1px solid #55565a',borderRadius:8,color:'#fff',font:'inherit',resize:'vertical'}}/>
      <OwnerCreativeQA model={choice} mode={choice.mode} prompt={prompt} aspect={aspect}/>
     </section>
   </div>
  </main>;
}
