import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {IdeaHeader,IdeaFooter,IdeaKicker,IdeaLink} from '../../components/IdeaUI';
import {weeklyTrend as t} from '../../../lib/academy-course';
export const metadata={title:'Creative Brief Lab | K4K Academy',robots:{index:false,follow:false}};
export default function CreativeBrief(){
return <main className="ideaPage"><IdeaHeader privateArea/><div className="idea-wrap">
<header className="idea-subhero"><IdeaKicker>STUDIO ASSIGNMENT / CURATED PRACTICE</IdeaKicker><h1 className="idea-display">LESS TREND.<br/><em>MORE CRAFT.</em></h1><p>{t.title}. A structured brief for making recognisable motion while protecting character identity, scale and camera consistency.</p><p className="idea-note">CURATED EDITORIAL PRACTICE / {t.week}. Not a live automated trend ranking.</p></header>
<section className="ideaModuleSection"><span className="idea-kicker">01 / WHY IT MATTERS</span><h2>The creative intention.</h2><p>{t.why}</p><p>{t.disclaimer}</p></section>
<section className="ideaModuleSection"><span className="idea-kicker">02 / WHAT TO PRACTISE</span><h2>Four skills you can test.</h2><div className="ideaModuleColumns">{t.learn.map((s,i)=><div className="idea-bullet-card" key={s}><div className="idea-eyebrow">SKILL {String(i+1).padStart(2,'0')}</div><h3>{s}</h3></div>)}</div></section>
<section className="ideaModuleSection"><span className="idea-kicker">03 / THE EXPERIMENT</span><h2>Five actions. One output.</h2><div className="ideaModuleList">{t.steps.map((s,i)=><article key={s.title}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{s.title}</h3><p>{s.body}</p></div></article>)}</div></section>
<section className="ideaModuleSection"><span className="idea-kicker">04 / YOUR WORK</span><h2>The controlled prompt.</h2><p>Use this only with material you own or have the right to adapt. Record model, duration, cost and any failure you observe.</p><pre>{t.prompt}</pre></section>
<section className="ideaModuleSection"><span className="idea-kicker">05 / THE FINAL CHECK</span><h2>Make something that survives review.</h2><p>{t.challenge}</p><ul>{t.deliverables.map(s=><li key={s}>{s}</li>)}</ul><div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:30}}><IdeaLink href="/academy/method">THE IDEA QUALITY GATES</IdeaLink><IdeaLink href="/prompts" variant="outline">PROMPT LIBRARY</IdeaLink></div></section>
</div><IdeaFooter privateArea/></main>;
}