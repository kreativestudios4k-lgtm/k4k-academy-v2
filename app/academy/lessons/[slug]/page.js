import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,ArrowRight,ArrowUpRight,CheckCircle2,ClipboardCheck,Clock3,ShieldCheck} from 'lucide-react';
import {IdeaHeader} from '../../../components/IdeaUI';
import K4KReferencePhoto from '../../../components/K4KReferencePhoto';
import CopyLessonPrompt from '../../topics/[slug]/CopyLessonPrompt';
import {CompleteWorkflowButton} from '../../LearningProgress';
import {k4kLessons} from '../../../../lib/k4k-course-v3';
export const dynamic='force-dynamic';
export function generateStaticParams(){return k4kLessons.map(x=>({slug:x.slug}))}
export async function generateMetadata({params}){const {slug}=await params;const l=k4kLessons.find(x=>x.slug===slug);return {title:l?l.title+' | K4K Academy':'Academy lesson',robots:{index:false,follow:false}}}
export default async function K4KLab({params}){
 const {slug}=await params;const l=k4kLessons.find(x=>x.slug===slug);if(!l)notFound();
 const index=k4kLessons.findIndex(x=>x.slug===slug);
 const prev=k4kLessons[index-1],next=k4kLessons[index+1];
 return <main className="k4k-classroom"><IdeaHeader privateArea/><div className="k4k-course-shell">
  <nav className="k4k-course-breadcrumb"><Link href="/academy"><ArrowLeft size={15}/> BACK TO STUDIO</Link><span>LAB {l.number} / {String(k4kLessons.length).padStart(2,'0')}</span><Link href="/prompts">PROMPT VAULT <ArrowUpRight size={14}/></Link></nav>
  <header className="k4k-lesson-hero">
   <div><span className="k4k-course-kicker">K4K ACADEMY / {l.stage}</span><h1>{l.title}</h1><p className="k4k-lesson-subtitle">{l.subtitle}</p><p>{l.intro}</p><div className="k4k-lesson-badges"><span><Clock3 size={15}/>{l.duration}</span><span>{l.videoSteps?'8 STEP TUTORIAL':'4 IDEA GATES'}</span><span>{l.videoSteps?'3 COPYABLE PROMPTS':'1 TESTABLE PROMPT'}</span></div></div>
   <div className="k4k-lesson-photo"><K4KReferencePhoto index={l.image}/><span>{l.reference||'K4K MASKED CREATOR / TRAINING REFERENCE'}</span></div>
  </header>
  <section className="k4k-lesson-objective"><span>YOUR OBJECTIVE</span><h2>{l.objective}</h2><p>Use photos you own or have permission to edit. These K4K creator visuals are illustrative references, not a promise of identical model output.</p></section>

  {l.videoSteps&&<section className="k4k-swap-guide" id="step-by-step">
   <div className="k4k-swap-guide-header">
    <div><span className="k4k-course-kicker">THE EXACT K4K GENJUTSU WORKFLOW</span><h2>FROM REFERENCE VIDEO<br/><em>TO CHARACTER SWAP.</em></h2><p>Follow each step in order. This is a practical lesson—not an automated video generator. You perform the uploads and generation inside Higgsfield.</p></div>
    <div className="k4k-lesson-handoff-links"><Link className="k4k-course-primary" href="/academy/studio">BUILD YOUR SWAP PROMPT <ArrowUpRight size={18}/></Link><a className="k4k-swap-higgsfield" href="https://higgsfield.ai/genjutsu" target="_blank" rel="noopener noreferrer">OPEN HIGGSFIELD <ArrowUpRight size={18}/></a></div>
   </div>
   <div className="k4k-swap-pipeline" aria-label="Video-to-video character swap sequence"><span>REFERENCE VIDEO</span><span>CHARACTER SHEET</span><span>SWAP PROMPT</span><span>GENJUTSU</span><span>FINAL VIDEO</span></div>
   <div className="k4k-swap-step-grid">{l.videoSteps.map(step=><article className="k4k-swap-step" key={step.number} id={'swap-step-'+step.number}>
    <div className="k4k-swap-step-top"><strong>{step.number}</strong><span>{step.phase}</span></div>
    <h3>{step.title}</h3>
    <p>{step.summary}</p>
    <ol>{step.tasks.map((task,i)=><li key={i}>{task}</li>)}</ol>
    <div className="k4k-swap-output"><b>YOU SHOULD HAVE</b><span>{step.output}</span></div>
   </article>)}</div>
   <div className="k4k-swap-modes">
    <article><span className="k4k-course-kicker">DEFAULT FOR A FOOTBALL MEME</span><h3>OBJECT SWAP</h3><p>Use when replacing one or two named characters and preserving the other people, background, timing and camera.</p></article>
    <article><span className="k4k-course-kicker">COPY THE MOVEMENT</span><h3>MOTION TRANSFER</h3><p>Use when the new characters should follow the original choreography, movement and camera path and a larger scene rebuild is acceptable.</p></article>
   </div>
   <p className="k4k-swap-source-note">Use only videos, music and likenesses you are allowed to transform. Higgsfield's supported length and credit price can change; the current generator's settings take priority.</p>
  </section>}

  <div className="k4k-lesson-progressbar" aria-label="The four K4K IDEA learning stages">{[['I','INVESTIGATE'],['D','DIRECT'],['E','EXECUTE'],['A','AUDIT']].map(x=><a key={x[0]} href={'#stage-'+x[0]}><b>{x[0]}</b><span>{x[1]}</span></a>)}</div>
  <section className="k4k-lesson-gates" aria-label="Step-by-step IDEA exercises">
   {l.gates.map(g=><article key={g.letter} className="k4k-lesson-gate" id={'stage-'+g.letter}>
    <div className="k4k-lesson-gate-symbol">{g.letter}<span>GATE / {g.letter==='I'?'01':g.letter==='D'?'02':g.letter==='E'?'03':'04'}</span></div>
    <div><h2>{g.title}</h2><p>{g.description}</p><ul>{g.steps.map(step=><li key={step}>{step}</li>)}</ul></div>
   </article>)}
  </section>

  {l.characterSheetPrompt&&<section className="k4k-lesson-copy-section k4k-swap-prompt-section" id="character-sheet-prompt">
    <span className="k4k-course-kicker">FIRST PROMPT / BUILD YOUR CHARACTER</span>
    <h2>CREATE THE<br/><em>CHARACTER SHEET.</em></h2>
    <p>Start from one authorised character image. Keep the same person and the exact outfit in every view. Then save your new sheet as @Image1 (and prepare a separate @Image2 sheet for a second character).</p>
    <div className="k4k-lesson-prompt-panel"><CopyLessonPrompt prompt={l.characterSheetPrompt}/></div>
  </section>}

  <section className="k4k-lesson-copy-section" id="lesson-prompt"><div className="k4k-course-kicker">PRODUCTION TEMPLATE / K4K ORIGINAL</div><h2>COPY. ADAPT.<br/><em>TEST.</em></h2><p>Use your own approved photos. Replace bracketed fields, verify the order of reference images and check the final result before accepting it.</p><div className="k4k-lesson-prompt-panel"><CopyLessonPrompt prompt={l.prompt}/></div></section>

  {l.multipleCharactersPrompt&&<section className="k4k-lesson-copy-section k4k-swap-prompt-section" id="two-character-prompt">
    <span className="k4k-course-kicker">BONUS PROMPT / LEFT + RIGHT CHARACTER SWAP</span>
    <h2>TWO PEOPLE.<br/><em>ZERO FACE MIXING.</em></h2>
    <p>Upload @Video1 as the source, @Image1 for the left character and @Image2 for the right character. The precise position mapping helps the model avoid mixing faces, jerseys and body movements.</p>
    <div className="k4k-lesson-prompt-panel"><CopyLessonPrompt prompt={l.multipleCharactersPrompt}/></div>
   </section>}

  <section className="k4k-lesson-delivery"><div><ClipboardCheck size={27}/><span className="k4k-course-kicker">YOUR PRACTICAL DELIVERABLE</span><h2>{l.assignment}</h2><CompleteWorkflowButton lessonId={l.id}/></div><div><span className="k4k-course-kicker">COMMON ERRORS TO CATCH</span><ul>{l.faults.map(x=><li key={x}><CheckCircle2 size={16}/>{x}</li>)}</ul><p>This step is marked complete when you choose. The system saves a progress flag, not your generated images or private files.</p></div></section>
  <footer className="k4k-lesson-footer"><nav>{prev?<Link href={'/academy/lessons/'+prev.slug}><ArrowLeft size={17}/> LAB {prev.number}: {prev.title}</Link>:<Link href="/academy"><ArrowLeft size={17}/> COURSE OVERVIEW</Link>}{next?<Link className="k4k-course-primary" href={'/academy/lessons/'+next.slug}>NEXT: LAB {next.number} <ArrowRight size={17}/></Link>:<Link className="k4k-course-primary" href="/academy">RETURN TO YOUR STUDIO <ArrowRight size={17}/></Link>}</nav><p><ShieldCheck size={16}/> Course membership does not include external generation credits. K4K does not guarantee views or flawless renders.</p></footer>
 </div></main>
}
