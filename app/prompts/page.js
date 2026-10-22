'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Copy,Check,ArrowUpRight,ArrowLeft,ShieldCheck} from 'lucide-react';
import {IdeaHeader} from '../components/IdeaUI';
import {k4kToolkit} from '../../lib/k4k-course-v3';

export default function K4KPromptVault(){
 const[copied,setCopied]=useState('');
 const[error,setError]=useState('');
 async function copy(prompt,index){try{await navigator.clipboard.writeText(prompt);setCopied(index);setError('')}catch{setError('Clipboard access was denied. Select the template and copy it manually.')}}
 return <main className="k4k-classroom"><IdeaHeader privateArea/><div className="k4k-course-shell">
  <nav className="k4k-course-breadcrumb"><Link href="/academy"><ArrowLeft size={16}/> YOUR STUDIO</Link><span>THE K4K PROMPT CONTROL ROOM</span></nav>
  <header style={{padding:'55px 0 33px'}}><span className="k4k-course-kicker">K4K ACADEMY / CONTROLLED GENERATION</span><h1 style={{fontSize:'clamp(53px,7vw,98px)',letterSpacing:'-.09em',lineHeight:'.88',margin:'20px 0'}}>PROMPT LESS.<br/><span style={{color:'#caff39'}}>DIRECT BETTER.</span></h1><p style={{fontSize:15,color:'#bfccb7',lineHeight:1.7,maxWidth:720}}>Eleven original reusable templates using one repeatable K4K principle: define the reference, lock what matters, request one change and audit the output. Replace placeholders, use authorised inputs and test before publishing.</p></header>
  <div className="k4k-prompt-toolkit-grid">{k4kToolkit.map((x,i)=><article className="k4k-prompt-toolkit-card" key={x.title}><small>CONTROL {String(i+1).padStart(2,'0')} / {x.tag}</small><h3>{x.title}</h3><p>{x.description||'Copy, replace the controlled variable and verify that unrelated image elements remain unchanged.'}</p><pre>{x.prompt}</pre><button type="button" onClick={()=>copy(x.prompt,String(i))}>{copied===String(i)?<Check size={17}/>:<Copy size={17}/>} {copied===String(i)?'COPIED':'COPY K4K PROMPT'}</button></article>)}</div>
  {error&&<p role="alert" style={{color:'#ffd6c7'}}>{error}</p>}
  <div className="k4k-lesson-objective"><span>USAGE NOTE</span><h2>Your prompts are production instructions—not guarantees.</h2><p>Each result must be reviewed for identity consistency, clothing, anatomy, rights and intended usage. External AI tools charge their own credits.</p><Link className="k4k-course-primary" href="/academy/lessons/prompt-control">LEARN THE PROMPT METHOD <ArrowUpRight size={17}/></Link></div>
  <footer className="k4k-lesson-footer"><Link href="/academy">← BACK TO THE COURSE</Link></footer>
 </div></main>;
}
