import Link from 'next/link';
import {ArrowUpRight,ArrowLeft} from 'lucide-react';
import {IdeaHeader} from '../components/IdeaUI';
import {k4kToolkit} from '../../lib/k4k-course-v3';
import CopyLessonPrompt from '../academy/topics/[slug]/CopyLessonPrompt';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};

export default function K4KPromptVault(){
 return <main className="k4k-classroom"><IdeaHeader privateArea/><div className="k4k-course-shell">
  <nav className="k4k-course-breadcrumb"><Link href="/academy"><ArrowLeft size={16}/> YOUR STUDIO</Link><span>THE K4K PROMPT CONTROL ROOM</span></nav>
  <header style={{padding:'55px 0 33px'}}><span className="k4k-course-kicker">K4K ACADEMY / CONTROLLED GENERATION</span><h1 style={{fontSize:'clamp(53px,7vw,98px)',letterSpacing:'-.09em',lineHeight:'.88',margin:'20px 0'}}>PROMPT LESS.<br/><span style={{color:'#caff39'}}>DIRECT BETTER.</span></h1><p style={{fontSize:15,color:'#bfccb7',lineHeight:1.7,maxWidth:720}}>Eleven original reusable templates using one repeatable K4K principle: define the reference, lock what matters, request one change and audit the output. Replace placeholders, use authorised inputs and test before publishing.</p></header>
  <div className="k4k-prompt-toolkit-grid">{k4kToolkit.map((x,i)=><article className="k4k-prompt-toolkit-card" key={x.title}><small>CONTROL {String(i+1).padStart(2,'0')} / {x.tag}</small><h3>{x.title}</h3><p>{x.description||'Copy, replace the controlled variable and verify that unrelated image elements remain unchanged.'}</p><CopyLessonPrompt prompt={x.prompt}/></article>)}</div>
  <div className="k4k-lesson-objective"><span>USAGE NOTE</span><h2>Your prompts are production instructions—not guarantees.</h2><p>Each result must be reviewed for identity consistency, clothing, anatomy, rights and intended usage. External AI tools charge their own credits.</p><Link className="k4k-course-primary" href="/academy/lessons/prompt-control">LEARN THE PROMPT METHOD <ArrowUpRight size={17}/></Link></div>
  <footer className="k4k-lesson-footer"><Link href="/academy">← BACK TO THE COURSE</Link></footer>
 </div></main>;
}
