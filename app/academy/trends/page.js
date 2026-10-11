import Link from 'next/link';
import {ArrowLeft,ArrowRight,CheckCircle2,Clock3,Sparkles,Clapperboard} from 'lucide-react';
import {weeklyTrend} from '../../../lib/academy-course';

export const metadata={title:'Trend of the Week | K4K Academy',robots:{index:false,follow:false}};

export default function AcademyTrendsPage(){
 const t=weeklyTrend;
 return <main className="k4kLessonPage">
  <div className="k4kLessonNav"><Link href="/academy#trend-of-the-week"><ArrowLeft size={17}/> Back to Academy</Link><Link href="/academy#course-topics">Course Topics <ArrowRight size={16}/></Link></div>
  <section className="k4kLessonHero k4kTrendHero"><img src={t.image} alt={t.imageAlt} width="1920" height="1080"/>
    <div className="k4kLessonHeroCopy"><span className="academyKicker"><Sparkles size={16}/> TREND OF THE WEEK · {t.week}</span><h1>{t.title}</h1><p>{t.subtitle}</p><div className="k4kLessonMeta"><span><Clock3 size={16}/> Editor's pick · {t.week}</span></div></div>
  </section>
  <div className="k4kLessonContents">
   <div className="k4kLessonMain">
    <section className="k4kLessonSection"><span className="academyKicker">WHY THIS TECHNIQUE MATTERS</span><h2>This week's creative focus</h2><p>{t.why}</p><p className="k4kTrendDisclaimer">{t.disclaimer}</p></section>
    <section className="k4kLessonSection"><span className="academyKicker">SKILLS TO PRACTISE</span><h2>What you will work on</h2><div className="k4kLessonCheckGrid">{t.learn.map(x=><div key={x}><CheckCircle2 size={19}/><span>{x}</span></div>)}</div></section>
    <section className="k4kLessonSection"><span className="academyKicker">THIS WEEK'S WORKSHOP</span><h2>Follow the 5-step challenge</h2><div className="k4kLessonBlocks">{t.steps.map((step,i)=><article className="k4kLessonBlock" key={step.title}><div className="k4kLessonNumber">{String(i+1).padStart(2,'0')}</div><div><h3>{step.title}</h3><p>{step.body}</p></div></article>)}</div></section>
    <section className="k4kLessonSection k4kLessonPrompt"><span className="academyKicker">PROMPT LAB</span><h2>Your motion-transfer prompt</h2><pre>{t.prompt}</pre><Link href="/prompts">Open K4K Prompt Vault <ArrowRight size={16}/></Link></section>
    <section className="k4kLessonSection k4kLessonAssignment"><span className="academyKicker">PRACTICAL BRIEF</span><h2>Weekly creator challenge</h2><p>{t.challenge}</p><ul>{t.deliverables.map(x=><li key={x}>{x}</li>)}</ul></section>
    <div className="k4kLessonNavigation"><Link href="/academy#course-topics"><ArrowLeft size={16}/><span><small>EXPLORE MORE</small><strong>Course Topics</strong></span></Link><Link href={t.related.href}><span><small>VIDEO WALKTHROUGH</small><strong>Workflow 01</strong></span><ArrowRight size={16}/></Link></div>
   </div>
   <aside className="k4kLessonAside"><div className="k4kLessonAsideCard"><span className="academyKicker">THIS WEEK'S THEME</span><h3>Motion + identity</h3><p>Focus on believable movement and one stable character. Compare your output with the original at the same timestamp, not just the opening frame.</p></div><Link className="k4kLessonRelated" href={t.related.href}><Clapperboard size={18}/>{t.related.label}<ArrowRight size={15}/></Link></aside>
  </div>
 </main>;
}
