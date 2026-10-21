import Link from 'next/link';
import {ArrowUpRight,ArrowRight,CheckCircle2,BookOpen,ShieldCheck,Image as ImageIcon,Lightbulb,LockKeyhole} from 'lucide-react';
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
     <h1>YOUR IDEAS.<br/><em>YOUR SYSTEM.</em></h1>
     <p>Learn real-world AI visual creation with your K4K masked creator as the reference. Build a believable image, control wardrobe, transfer scenes and write reliable prompts—all through one repeatable production method.</p>
     <div className="k4k-course-hero-buttons"><Link className="k4k-course-primary" href="/academy/lessons/reality-engine">START LESSON 01 <ArrowUpRight size={17}/></Link><Link className="k4k-course-outline" href="/academy/method">THE IDEA METHOD <ArrowRight size={17}/></Link></div>
     <div className="k4k-course-pillrow"><span>05 PRACTICAL LABS</span><span>08 TESTABLE PROMPTS</span><span>YOUR OWN PACE</span></div>
    </div>
    <div className="k4k-course-hero-media">
     <K4KReferencePhoto index={0} className="k4k-course-hero-photo"/>
     <span className="k4k-photo-chip">K4K / REFERENCE 01</span>
     <div className="k4k-course-hero-note"><span>IDENTITY LOCK</span><strong>ONE PERSON.<br/>MORE CONTROL.</strong></div>
    </div>
   </header>

   <section className="k4k-course-method-summary" aria-labelledby="idea-head">
    <div><span className="k4k-course-kicker">OUR ORIGINAL METHOD</span><h2 id="idea-head">THE <em>IDEA</em> STANDARD.</h2><p>Every visual goes through four intentional checks before delivery.</p></div>
    <div className="k4k-course-gates">{[
      ['I','INVESTIGATE','Choose the reference and objective'],
      ['D','DIRECT','Lock identity and define the change'],
      ['E','EXECUTE','Test prompts and record results'],
      ['A','AUDIT','Fix faults and verify the final image']
     ].map(g=><div key={g[0]}><strong>{g[0]}</strong><span>{g[1]}</span><small>{g[2]}</small></div>)}</div>
   </section>

   <LearningProgress/>

   <section className="k4k-course-module-section" id="curriculum">
    <div className="k4k-course-section-head"><div><span className="k4k-course-kicker">THE ACTUAL COURSE</span><h2>FIVE LABS.<br/><em>ONE SKILL SYSTEM.</em></h2></div><p>Step-by-step decisions, an original K4K prompt, a practical assignment and a quality check in every lesson.</p></div>
    <div className="k4k-course-module-grid">{k4kLessons.map(l=><Link href={'/academy/lessons/'+l.slug} className="k4k-course-module" key={l.slug}>
     <div className="k4k-course-module-visual"><K4KReferencePhoto index={l.image}/><span className="k4k-course-module-number">LAB {l.number} / 05</span></div>
     <div className="k4k-course-module-info"><small>{l.stage} · {l.duration}</small><h3>{l.title}</h3><p>{l.subtitle}</p><span>OPEN PRACTICAL LESSON <ArrowUpRight size={16}/></span></div>
    </Link>)}</div>
   </section>

   <section className="k4k-course-resources">
    <div><BookOpen size={27}/><span>THE PROMPT VAULT</span><h3>Control every detail.</h3><p>Eight original K4K templates to copy and adapt. Identity, framing, light, wardrobe, environment, retouch and review.</p><Link href="/prompts">OPEN PROMPT VAULT <ArrowUpRight size={18}/></Link></div>
    <div><ImageIcon size={27}/><span>YOUR REFERENCE STUDIO</span><h3>One creator. Three looks.</h3><p>Study the exact masked-creator examples used throughout these lessons: movement, identity and football atmosphere.</p><Link href="/academy/gallery">VIEW REFERENCE STUDY <ArrowUpRight size={18}/></Link></div>
   </section>
   <footer className="k4k-course-bottom">
    <p><ShieldCheck size={18}/> Your paid access stays connected to your account. Third-party AI generation credits are not included; outcomes and viral views are not guaranteed.</p>
    <nav><Link href="/login">SIGN IN</Link><Link href="/update-password">PASSWORD</Link><a href="mailto:hello@kreativestudios4k.com">SUPPORT</a><a href="https://billing.stripe.com/p/login/28E7sM93ubxrfkU05WeEo00" target="_blank" rel="noopener noreferrer">BILLING</a></nav>
   </footer>
  </div>
 </main>;
}
