import Link from 'next/link';
import {ArrowUpRight,ArrowRight,CheckCircle2,BookOpen,ShieldCheck,Image as ImageIcon,Lightbulb,LockKeyhole,Sparkles,Clapperboard} from 'lucide-react';
import {IdeaHeader} from '../components/IdeaUI';
import K4KReferencePhoto from '../components/K4KReferencePhoto';
import GooglePasswordReminder from './GooglePasswordReminder';
import LearningProgress from './LearningProgress';
import {k4kLessons} from '../../lib/k4k-course-v3';

export const dynamic='force-dynamic';
export const metadata={title:'Your K4K IDEA Studio — Academy Course',robots:{index:false,follow:false}};

export default function Academy(){
 return <main className="k4k-classroom">
  <IdeaHeader privateArea/>
  <div className="k4k-course-shell">
   <div className="k4k-course-alert"><GooglePasswordReminder/></div>
   <div className="k4k-course-topline"><span><span className="k4k-course-dot"/> MEMBERS-ONLY / K4K ACADEMY</span><span>THE IDEA CREATIVE SYSTEM · EDITION 01</span></div>
   <header className="k4k-course-hero">
    <div className="k4k-course-hero-copy">
     <div className="k4k-course-kicker">YOUR NEW CREATIVE STUDIO</div>
     <h1>LEARN AI VIDEO.<br/><em>STEP BY STEP.</em></h1>
     <p>New here? Start with the guided lesson. Then open the Studio to practise with your own reference video and character sheets.</p>
     <div className="k4k-course-hero-buttons"><Link className="k4k-course-primary" href="/academy/studio">CREATE MY FIRST VIDEO <ArrowUpRight size={17}/></Link><Link className="k4k-course-outline" href="/academy/lessons/viral-character-swap">START WITH LESSON 1 <ArrowRight size={17}/></Link></div>
     <div className="k4k-course-pillrow"><span>06 PRACTICAL LABS</span><span>GENJUTSU + ORIGINAL PROMPTS</span><span>YOUR OWN PACE</span></div>
    </div>
    <div className="k4k-course-hero-media">
     <K4KReferencePhoto index={0} className="k4k-course-hero-photo"/>
     <span className="k4k-photo-chip">K4K / REFERENCE 01</span>
     <div className="k4k-course-hero-note"><span>IDENTITY LOCK</span><strong>ONE PERSON.<br/>MORE CONTROL.</strong></div>
    </div>
   </header>

   <section className="k4k-studio-dashboard-teaser" aria-label="Interactive Character Swap Studio">
    <div><span className="k4k-course-kicker"><Sparkles size={16}/> NEW MEMBER WORKSPACE</span><h2>PRACTISE WHAT<br/><em>YOU LEARN.</em></h2>
     <p>Already watched the lesson? Choose your video and character images to build a ready-to-copy prompt. Your files stay on your device.</p></div>
    <Link className="k4k-course-primary" href="/academy/studio"><Clapperboard size={19}/> OPEN PRACTICE STUDIO <ArrowUpRight size={17}/></Link>
   </section>

   <section style={{margin:"24px 0",padding:"24px",border:"1px solid #53617d",borderRadius:18}}><span className="k4k-course-kicker">NEW · SAFE PREVIEW</span><h2>TRY THE K4K AI GENERATOR.</h2><p>Explore viral templates, prepare character swaps and save project drafts. Rendering and credits are not connected yet.</p><Link className="k4k-course-primary" href="/academy/generator">OPEN GENERATOR PREVIEW <ArrowUpRight size={17}/></Link></section><LearningProgress/>

   <section className="k4k-course-method-summary" aria-labelledby="idea-head">
    <div><span className="k4k-course-kicker">OUR ORIGINAL METHOD</span><h2 id="idea-head">YOUR 4 SIMPLE STEPS.</h2><p>Follow this sequence every time you make a video.</p></div>
    <div className="k4k-course-gates">{[
      ['I','INVESTIGATE','Choose the reference and objective'],
      ['D','DIRECT','Lock identity and define the change'],
      ['E','EXECUTE','Test prompts and record results'],
      ['A','AUDIT','Fix faults and verify the final image']
     ].map(g=><div key={g[0]}><strong>{g[0]}</strong><span>{g[1]}</span><small>{g[2]}</small></div>)}</div>
   </section>

   
   <section className="k4k-featured-workflow" aria-label="Start with the Higgsfield Genjutsu Viral Character Swap">
    <div className="k4k-featured-workflow-text">
     <span className="k4k-course-kicker">NEW · K4K SIGNATURE WORKFLOW</span>
     <h2>VIRAL CHARACTER<br/><em>SWAP.</em></h2>
     <p>Learn the exact order: <b>Reference video → Character sheet → Prompt → Higgsfield Genjutsu → Generate → Audit.</b> Includes an Object Swap / Motion Transfer guide, two-person mapping examples and three copyable prompts.</p>
     <Link href="/academy/lessons/viral-character-swap" className="k4k-course-primary">OPEN STEP-BY-STEP WORKFLOW <ArrowUpRight size={18}/></Link>
    </div>
    <div className="k4k-featured-workflow-visual">
     <div><K4KReferencePhoto index={0}/><span>01 · VIDEO / MOVEMENT</span></div>
     <div><K4KReferencePhoto index={1}/><span>02 · CHARACTER / IDENTITY</span></div>
     <div><K4KReferencePhoto index={2}/><span>03 · RESULT / DIRECTION</span></div>
    </div>
   </section>


   <section className="k4k-course-module-section" id="curriculum">
    <div className="k4k-course-section-head"><div><span className="k4k-course-kicker">THE ACTUAL COURSE</span><h2>CHOOSE YOUR<br/><em>NEXT LESSON.</em></h2></div><p>Each lesson has one goal, a prompt to copy and an exercise to complete.</p></div>
    <div className="k4k-course-module-grid">{k4kLessons.map(l=><Link href={'/academy/lessons/'+l.slug} className="k4k-course-module" key={l.slug}>
     <div className="k4k-course-module-visual"><K4KReferencePhoto index={l.image}/><span className="k4k-course-module-number">LAB {l.number} / {String(k4kLessons.length).padStart(2,'0')}</span></div>
     <div className="k4k-course-module-info"><small>{l.stage} · {l.duration}</small><h3>{l.title}</h3><p>{l.subtitle}</p><span>OPEN PRACTICAL LESSON <ArrowUpRight size={16}/></span></div>
    </Link>)}</div>
   </section>

   <section className="k4k-course-resources">
    <div><BookOpen size={27}/><span>THE PROMPT VAULT</span><h3>Control every detail.</h3><p>Eleven original K4K templates to copy and adapt. Identity, framing, light, wardrobe, environment, retouch and review.</p><Link href="/prompts">OPEN PROMPT VAULT <ArrowUpRight size={18}/></Link></div>
    <div><ImageIcon size={27}/><span>YOUR REFERENCE STUDIO</span><h3>One creator. Three looks.</h3><p>Study the exact masked-creator examples used throughout these lessons: movement, identity and football atmosphere.</p><Link href="/academy/gallery">VIEW REFERENCE STUDY <ArrowUpRight size={18}/></Link></div>
   </section>
   <footer className="k4k-course-bottom">
    <p><ShieldCheck size={18}/> Your paid access stays connected to your account. Third-party AI generation credits are not included; outcomes and viral views are not guaranteed.</p>
    <nav><Link href="/login">SIGN IN</Link><Link href="/update-password">PASSWORD</Link><a href="mailto:hello@kreativestudios4k.com">SUPPORT</a><a href="https://billing.stripe.com/p/login/28E7sM93ubxrfkU05WeEo00" target="_blank" rel="noopener noreferrer">BILLING</a></nav>
   </footer>
  </div>
 </main>;
}
