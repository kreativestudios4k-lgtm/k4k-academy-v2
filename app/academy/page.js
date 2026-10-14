import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import LogoutButton from '../components/LogoutButton';
import GooglePasswordReminder from './GooglePasswordReminder';
import LearningProgress from './LearningProgress';
import {IdeaHeader,IdeaFooter,IdeaKicker,IdeaLink} from '../components/IdeaUI';
import {syllabus} from '../../lib/k4k-idea';
export const dynamic='force-dynamic';
export default function Academy(){
 return <main className="ideaMember"><IdeaHeader privateArea/><div className="idea-wrap">
 <nav className="idea-member-nav" aria-label="Learning navigation"><Link href="/academy" className="on">YOUR STUDIO</Link><Link href="/academy/method">THE IDEA METHOD</Link><Link href="/academy/gallery">CASEBOOK</Link><Link href="/prompts">PROMPT LIBRARY</Link><Link href="/academy/trends">CREATIVE BRIEF</Link><Link href="/update-password">PASSWORD</Link></nav>
 <div style={{paddingTop:22}}><GooglePasswordReminder/></div>
 <header className="idea-member-hero"><IdeaKicker>WELCOME BACK / K4K PRIVATE STUDIO</IdeaKicker><h1 className="idea-display" style={{margin:'26px 0 22px'}}>MAKE WORK<br/>YOU CAN <em>DEFEND.</em></h1><p>Every shot should have a reason. Every test should teach you something. Start with the IDEA method, then build your practical lessons and document your own work.</p>
 <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:30}}><IdeaLink href="/academy/method">START THE IDEA METHOD</IdeaLink><IdeaLink href="/academy/topics/truth-behind-ai" variant="outline">OPEN TOPIC 01</IdeaLink></div></header>
 <div className="idea-metric-strip"><div><strong>04</strong><span>STEPS / BRIEF TO FINAL CHECK</span></div><div><strong>06</strong><span>STRUCTURED LEARNING TOPICS</span></div><div><strong>02</strong><span>DOCUMENTED WORKFLOW LESSONS</span></div></div>
 <section className="idea-section"><div className="idea-marker"><span>01 / YOUR NEXT ACTION</span><span>CHOOSE A TASK, NOT A PROMISE</span></div>
 <div className="idea-section-header"><h2 className="idea-display">ONE <em>IDEA.</em><br/>FOUR GATES.</h2><p>You don't need to master everything at once. Start with a small, lawful production and improve it through a real quality-control process.</p></div>
 <div className="idea-member-grid">
 <Link className="idea-member-card" href="/academy/method"><span>START HERE / 01</span><div><h3>IDEA METHOD</h3><p>Investigate, Direct, Execute and Audit. Four stages with four concrete deliverables.</p></div><span>OPEN THE FOUR STAGES →</span></Link>
 <Link className="idea-member-card" href="/prompts"><span>TOOLS / 02</span><div><h3>PROMPT SYSTEMS</h3><p>Copy and adapt practical templates; always test and revise the outcome.</p></div><span>OPEN PROMPT LIBRARY →</span></Link>
 <Link className="idea-member-card" href="/academy/gallery"><span>PRODUCTION / 03</span><div><h3>THE CASEBOOK</h3><p>Written breakdowns of real K4K experiments and the problems they reveal.</p></div><span>READ THE CASEBOOK →</span></Link>
 <Link className="idea-member-card" href="/academy/trends"><span>TRAINING / 04</span><div><h3>CREATIVE BRIEF LAB</h3><p>One focused challenge in reference selection and motion consistency.</p></div><span>OPEN THE EXERCISE →</span></Link>
 </div></section>
 <LearningProgress workflowTwoAvailable={true}/>
 <section className="idea-section" id="course-topics"><div className="idea-marker"><span>02 / THE COURSE</span><span>BUILD SKILL IN ORDER</span></div><div className="idea-section-header"><h2 className="idea-display">LEARN.<br/><em>PRACTISE.</em><br/>IMPROVE.</h2><p>Six self-paced topics. Every lesson contains clear objectives, a working prompt, a practical challenge and observable quality checks.</p></div>
 <div className="idea-syllabus">{syllabus.map(s=><Link className="idea-syllabus-row" key={s.index} href={'/academy/topics/'+s.slug}><span>{s.index}</span><div><h3>{s.name}</h3><p>{s.description}</p></div><small>STAGE {s.stage} / {s.outcome}</small><ArrowUpRight size={19}/></Link>)}</div></section>
 <section className="idea-section" id="workflows"><div className="idea-marker"><span>03 / PRODUCTION PRACTICE</span><span>EXISTING MEMBER WORKFLOWS</span></div><div className="idea-section-header"><h2 className="idea-display">TWO REAL<br/><em>LESSON FILES.</em></h2><p>Detailed production decisions in text, rather than embedded photos or videos. Follow the notes and recreate a scene using reference material you are authorised to use.</p></div>
 <div className="idea-member-grid">
 <Link href="/academy/workflows/viral-character-swap" className="idea-member-card"><span>WORKFLOW 001 / PERFORMANCE</span><div><h3>DEMBOW CHARACTER RECAST</h3><p>Replace one lead performer without accidentally rewriting the surrounding crowd or changing the camera.</p></div><span>OPEN THE PRODUCTION NOTES →</span></Link>
 <Link href="/academy/workflows/puskas-character-swap" className="idea-member-card"><span>WORKFLOW 002 / PHYSICS</span><div><h3>FOOTBALL MOTION</h3><p>Why body scale, feet, ball contact and source timing matter more than clever wording.</p></div><span>OPEN THE PRODUCTION NOTES →</span></Link>
 </div></section>
 <section className="idea-section" style={{paddingTop:20}}><div className="idea-ethics"><div><IdeaKicker>ACCOUNT / SUPPORT</IdeaKicker><h3>YOU'RE HERE<br/>TO LEARN.</h3></div><div><p className="idea-body">Already paid? Never purchase again to resolve a login problem. Use your payment email. Billing and cancellation remain handled securely by Stripe.</p><div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:12}}><a className="idea-utility" href="mailto:hello@kreativestudios4k.com">ASK FOR HELP ↗</a><a className="idea-utility" href="https://billing.stripe.com/p/login/28E7sM93ubxrfkU05WeEo00" rel="noopener noreferrer" target="_blank">BILLING ↗</a><Link className="idea-utility" href="/update-password">PASSWORD ↗</Link><LogoutButton/></div></div></div></section>
 </div><IdeaFooter privateArea/></main>;
}