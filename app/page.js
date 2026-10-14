import Link from 'next/link';
import {ArrowUpRight,ArrowRight,ArrowDown,Check,ShieldCheck,MoveRight,Plus,Minus} from 'lucide-react';
import {IdeaHeader,IdeaFooter,IdeaKicker,IdeaLink} from './components/IdeaUI';
import {ideaSteps,studioCases,syllabus,noHype} from '../lib/k4k-idea';

const checkout='https://buy.stripe.com/dRmbJ293u6d7egQ8CseEo0n';
const questions=[
 ['Is K4K Academy an AI video generator?','No. K4K Academy is a learning space. You use compatible third-party creation tools yourself; some require a separate paid account or generation credits.'],
 ['What will I actually learn?','How to write a brief, build consistent references, choose the right production method, test a short generation, detect faults and finish a responsible export.'],
 ['Is there a guarantee my videos will go viral?','No. We teach production and review methods. We do not guarantee views, followers, sales, employment or a flawless AI result.'],
 ['Are there lessons I can start today?','Yes. Members have access to six self-paced learning topics, reusable prompts, a practical production casebook and two project-specific workflow lessons. All training is text-first in this redesign.'],
 ['Where are the images and videos?','The new website deliberately does not display photos or video embeds. Learning examples are explained through detailed written production notes, prompts and quality-control steps. You produce and review your own files in your chosen tools.'],
 ['Can I cancel my membership?','Yes. Subscriptions renew monthly. You can manage renewal and cancellation through the secure Stripe billing portal. Your exact payment terms appear during checkout.'],
 ['What if I have already paid?','Do not buy again. Use the same email as your payment receipt to log in or contact Academy support for account access help.']
];

export const metadata={title:'K4K Academy — Learn to Direct AI Video | IDEA Method',description:'Learn a practical, responsible AI video production method. Four stages: Investigate, Direct, Execute, Audit. Real prompts, quality gates and self-paced creator education.'};
export default function Home(){
 return <main className="ideaSite" id="top">
 <IdeaHeader/>
 <section className="idea-hero"><div className="idea-wrap idea-hero-main">
  <IdeaKicker>K4K ACADEMY / THE SCHOOL FOR CREATIVE DIRECTION</IdeaKicker>
  <h1 className="idea-xl">A BETTER<br/><span>IDEA</span> IS<br/>NOT ENOUGH.</h1>
  <div className="idea-hero-bottom"><div className="idea-hero-actions"><IdeaLink href="#method">DISCOVER OUR METHOD</IdeaLink><IdeaLink href="#membership" variant="outline">EXPLORE MEMBERSHIP</IdeaLink></div>
   <div className="idea-hero-side"><div className="idea-eyebrow">THE PRINCIPLE / 001</div><p>AI can produce an image. A creator must know what to ask for, what to keep, what to correct and when to stop. That's what we teach.</p></div>
  </div>
  <div className="idea-hero-meta"><span>NO SHORTCUTS. NO GUARANTEED VIRALITY.</span><span>SCROLL TO UNDERSTAND OUR PROCESS ↓</span><span>ONLINE / INTERNATIONAL</span></div>
 </div></section>
 <section className="idea-light idea-section" id="method"><div className="idea-wrap"><div className="idea-marker"><span>01 / THE METHODOLOGY</span><span>FOUR STEPS · ONE STANDARD</span></div>
  <div className="idea-section-header"><h2 className="idea-display">GOOD WORK<br/>IS <em>DESIGNED.</em></h2><p>We developed K4K IDEA to teach something repeatable: the decisions behind an AI production. Four stages. Four outputs. Four points where you must check the quality before moving on.</p></div>
  <div className="idea-method-grid">{ideaSteps.map((s)=><Link key={s.key} href="/academy/method" className="idea-method-card"><div><div className="numeral">{s.index} / 04</div><div className="letter">{s.key}</div></div><div><span className="stage">{s.sub}</span><h3>{s.name}</h3><p>{s.line}</p></div></Link>)}</div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,flexWrap:'wrap',paddingTop:30}}><p style={{fontSize:13,lineHeight:1.8,maxWidth:650,color:'#666',margin:0}}>Every stage produces evidence: a written brief, a character or scene plan, a logged test and a reviewed final file. Reading alone does not make the project finished.</p><IdeaLink href="#syllabus">SEE THE LEARNING PATH</IdeaLink></div>
 </div></section>
 <section className="idea-section" id="about"><div className="idea-wrap"><div className="idea-marker"><span>02 / THE POSITION</span><span>MORE DIRECTION. LESS HYPE.</span></div>
  <div className="idea-section-header"><h2 className="idea-display">THE TOOL<br/>IS <em>NOT</em><br/>THE TEACHER.</h2><p>We focus on the decisions a serious creator can improve: shot intention, reference quality, character consistency, real physics, the right tool, and a final review.</p></div>
  <div className="idea-metric-strip"><div><strong>04</strong><span>MEASURABLE IDEA STAGES</span></div><div><strong>06</strong><span>SELF-PACED STUDY TOPICS</span></div><div><strong>02</strong><span>PROJECT-SPECIFIC WORKFLOW LESSONS</span></div></div>
  <div style={{padding:'80px 0 0',display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:22}}>
   <span className="idea-kicker">WHAT'S INSIDE OUR TEACHING</span>
   {studioCases.slice(0,3).map((p)=><Link className="idea-case-row" key={p.id} href="#membership"><div><small>{p.id} / {p.tag}</small><div><strong>{p.name}</strong></div></div><p>{p.risk} Learn how to recognise and address the problem.</p><ArrowUpRight size={23}/></Link>)}
  </div>
  <div style={{paddingTop:32,display:'flex',alignItems:'center',justifyContent:'space-between',gap:18,flexWrap:'wrap'}}><p className="idea-note">The production casebook contains written studies, not client testimonials or media previews.</p><IdeaLink href="#membership" variant="outline">ACCESS THE CASEBOOK</IdeaLink></div>
 </div></section>
 <section className="idea-section" id="syllabus" style={{background:'#161613'}}><div className="idea-wrap"><div className="idea-marker"><span>03 / THE EDUCATION</span><span>A STRUCTURED PATH, NOT A PROMPT DUMP.</span></div>
  <div className="idea-section-header"><h2 className="idea-display">LEARN IT.<br/><em>BUILD IT.</em><br/>CHECK IT.</h2><p>Start with the fundamentals. Finish with a process you can explain. Each topic includes a study guide, a template, an exercise and a practical quality gate.</p></div>
  <div className="idea-syllabus">{syllabus.map(s=><Link key={s.index} href="#membership" className="idea-syllabus-row"><span>{s.index}</span><div><h3>{s.name}</h3><p>{s.description}</p></div><small>STAGE {s.stage} · {s.outcome}</small><ArrowUpRight size={21}/></Link>)}</div>
  <p className="idea-note" style={{paddingTop:27}}>Designed for self-paced work. External generation software, credits and licences are not included in the membership.</p>
 </div></section>
 <section className="idea-section" id="standards"><div className="idea-wrap"><div className="idea-marker"><span>04 / THE STANDARD</span><span>BE CLEAR ABOUT WHAT YOU'RE BUYING</span></div>
   <div className="idea-ethics" style={{marginTop:50}}><div><IdeaKicker>REALISTIC EXPECTATIONS</IdeaKicker><h3>WE DON'T SELL<br/>VIRAL DREAMS.</h3></div><div><p className="idea-body">One prompt isn't a career, and a generated video isn't automatically good. A successful lesson is one where you understand what you made, what failed and how to improve it.</p><ul>{noHype.map(item=><li key={item}>{item}</li>)}</ul></div></div>
 </div></section>
 <section className="idea-pricing" id="membership"><div className="idea-wrap"><div className="idea-marker"><span>05 / THE MEMBERSHIP</span><span>BUILD YOUR CREATIVE STANDARD</span></div>
  <div className="idea-price-grid"><div><h2>LEARN TO<br/>MAKE IT<br/><em style={{fontFamily:'Georgia,serif',fontWeight:400}}>count.</em></h2><p>Membership includes the IDEA method, six foundation-to-delivery topics, real production case studies, working prompt templates and existing practical workflow lessons.</p><p style={{fontSize:13,color:'#47572c'}}>No compulsory live bookings. No guaranteed earnings. No additional course charge for published member lessons.</p></div>
   <div className="idea-price-card"><span>CREATOR MEMBERSHIP / MONTHLY</span><strong>£7.99<small> / MO</small></strong><p>Recurring membership. Secure checkout handled by Stripe. Final price, currency and terms are confirmed at checkout. External AI-tool credits are not included.</p><a className="idea-button" href={checkout}>BECOME A MEMBER <ArrowUpRight size={19}/></a><p style={{margin:'19px 0 0',fontSize:12}}><ShieldCheck size={14} style={{verticalAlign:'middle'}}/> Already paid? <Link href="/login" style={{color:'#d0ff6b',textDecoration:'underline'}}>Sign in to your account.</Link></p></div>
  </div>
 </div></section>
 <section className="idea-section" id="questions"><div className="idea-wrap"><div className="idea-marker"><span>06 / THE QUESTIONS</span><span>NO SMALL PRINT GAMES</span></div><div className="idea-section-header"><h2 className="idea-display">BEFORE<br/>YOU <em>BEGIN.</em></h2><p>These are the questions that should be answered clearly before anyone pays for a course.</p></div>
  <div className="idea-faq">{questions.map(([q,a],i)=><details key={q}><summary><span style={{color:'#a7a7a0',fontSize:12,marginRight:20}}>{String(i+1).padStart(2,'0')}</span><span style={{flex:1}}>{q}</span></summary><p>{a}</p></details>)}</div>
  <div style={{paddingTop:42,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}><IdeaLink href="/login" variant="outline">MEMBER SIGN IN</IdeaLink><a style={{textDecoration:'underline',fontSize:13}} href="mailto:hello@kreativestudios4k.com">Ask Academy support ↗</a></div>
 </div></section>
 <IdeaFooter/>
 </main>;
}
