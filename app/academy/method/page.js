import Link from 'next/link';
import {ArrowUpRight,CheckCircle2,ClipboardList} from 'lucide-react';
import {IdeaHeader} from '../../components/IdeaUI';
import K4KReferencePhoto from '../../components/K4KReferencePhoto';
import CopyLessonPrompt from '../topics/[slug]/CopyLessonPrompt';
import {ideaSteps} from '../../../lib/k4k-idea';
import {k4kLessons} from '../../../lib/k4k-course-v3';
export const metadata={title:'The K4K IDEA Method — Academy',robots:{index:false,follow:false}};
const template="K4K IDEA / PRODUCTION NOTE\n\nI — INVESTIGATE\nOne-sentence goal:\nInput photo or footage and usage permission:\nWhat must stay consistent:\nFinal platform and size:\n\nD — DIRECT\nIdentity / glasses / mask / proportions:\nChange exactly one thing:\nCamera / lighting / environment:\nInput image order and role:\n\nE — EXECUTE\nAI tool / model / version:\nPrompt version:\nNumber of attempts / credit budget:\nStrongest attempt and faults:\n\nA — AUDIT\nIdentity and anatomy review:\nBackground, clothing and object check:\nRights, disclosure and export:\nOne correction / final learning:";
export default function Method(){
 return <main className="k4k-classroom"><IdeaHeader privateArea/><div className="k4k-course-shell">
 <nav className="k4k-course-breadcrumb"><Link href="/academy">← RETURN TO STUDIO</Link><span>K4K / OWN PRODUCTION METHOD</span></nav>
 <header className="k4k-lesson-hero"><div><span className="k4k-course-kicker">FOUR DECISIONS · ONE REPEATABLE SYSTEM</span><h1>YOUR IDEA.<br/><span style={{color:'#caff39'}}>YOUR CONTROL.</span></h1><p className="k4k-lesson-subtitle">I → D → E → A</p><p>K4K IDEA is our way of learning through evidence. We don't promise a perfect image from a magic sentence; we ask the creator to choose references, direct one change, test it, and audit what really happened.</p><Link className="k4k-course-primary" href="/academy/lessons/reality-engine">START LAB 01 <ArrowUpRight size={16}/></Link></div><div className="k4k-lesson-photo"><K4KReferencePhoto index={1}/><span>YOUR CREATOR IDENTITY · THE CONSISTENT REFERENCE</span></div></header>
 <section className="k4k-lesson-gates">{ideaSteps.map(x=><article className="k4k-lesson-gate" key={x.key}><div className="k4k-lesson-gate-symbol">{x.key}<span>GATE {x.index}</span></div><div><h2>{x.name}</h2><p>{x.lead}</p><ul>{x.tasks.map(t=><li key={t}>{t}</li>)}</ul><p style={{color:'#caff39'}}><b>REQUIRED OUTPUT:</b> {x.artifact}</p><p><b>PASS / FAIL:</b> {x.gate}</p></div></article>)}</section>
 <section className="k4k-lesson-copy-section"><span className="k4k-course-kicker">COPY BEFORE YOU GENERATE</span><h2>YOUR PRODUCTION<br/><em>RECORD.</em></h2><p>Document reference order, the single variable to change, models tested and the final faults before you call a result complete.</p><div className="k4k-lesson-prompt-panel"><CopyLessonPrompt prompt={template}/></div></section>
 <section className="k4k-course-module-section"><div className="k4k-course-section-head"><div><span className="k4k-course-kicker">PRACTISE THE METHOD</span><h2>FIVE<br/><em>LABS.</em></h2></div></div><div className="k4k-course-module-grid">{k4kLessons.map(l=><Link key={l.slug} href={'/academy/lessons/'+l.slug} className="k4k-course-module"><div className="k4k-course-module-visual"><K4KReferencePhoto index={l.image}/><span className="k4k-course-module-number">LAB {l.number}</span></div><div className="k4k-course-module-info"><small>{l.stage}</small><h3>{l.title}</h3><p>{l.subtitle}</p><span>OPEN LESSON <ArrowUpRight size={16}/></span></div></Link>)}</div></section>
 </div></main>;
}
