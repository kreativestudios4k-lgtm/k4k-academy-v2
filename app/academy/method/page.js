import Link from 'next/link';
import {ArrowUpRight,ArrowRight,CheckCircle2} from 'lucide-react';
import {IdeaHeader,IdeaFooter,IdeaKicker,IdeaLink} from '../../components/IdeaUI';
import {ideaSteps,noHype} from '../../../lib/k4k-idea';
export const metadata={title:'The K4K IDEA Method — Four Quality Gates',robots:{index:false,follow:false}};
export default function IdeaMethod(){
const log=`K4K IDEA / CREATIVE PRODUCTION RECORD

I / INVESTIGATE
Project objective:
Who is this for?
Reference material & permission:
Target platform + one-shot length:

D / DIRECT
Subject and character identity:
Wardrobe / proportions:
Camera / action / light:
Must remain unchanged:

E / EXECUTE
Model / tool:
Inputs and prompt version:
Duration, aspect ratio, credits:
Test result and faults:

A / AUDIT
Opening / mid-point / ending:
Face / hands / physics / background:
Audio & source usage:
What I changed:
Final export / disclosure:`;
return <main className="ideaPage"><IdeaHeader privateArea/><div className="idea-wrap">
 <header className="idea-subhero"><IdeaKicker>THE K4K STUDIO SYSTEM / 001</IdeaKicker><h1 className="idea-display">THE METHOD<br/>IS THE <em>VALUE.</em></h1><p>Four quality gates that make AI production teachable. Not a tool trick or a guarantee. A repeatable sequence of decisions, files and checks.</p><IdeaLink href="#first-step">LEARN THE FOUR STAGES</IdeaLink></header>
 <section className="idea-section" style={{paddingTop:30}}><div className="idea-marker"><span>00 / THE IDEA FORMULA</span><span>OUTPUTS OVER HYPE</span></div><div className="idea-method-grid" style={{borderColor:'#ffffff4a',marginTop:38}}>{ideaSteps.map(s=><a href={'#step-'+s.key} key={s.key} className="idea-method-card" style={{borderColor:'#ffffff35',minHeight:250,color:'#f2f2e8'}}><div><span className="numeral">{s.index} / 04</span><div className="letter" style={{color:'#d0ff6b',fontSize:'clamp(78px,9vw,145px)'}}>{s.key}</div></div><div><span className="stage" style={{color:'#d0ff6b'}}>{s.sub}</span><h3>{s.name}</h3></div></a>)}</div></section>
 <div id="first-step" className="idea-marker"><span>01 / THE FOUR GATES</span><span>MAKE A FILE AT EACH STAGE</span></div>
 {ideaSteps.map(s=><article id={'step-'+s.key} key={s.key} className="idea-step-article"><div className="step-num">GATE {s.index}<div className="idea-numbers" style={{fontSize:80,marginTop:35}}>{s.key}</div></div><div><h2>{s.name}<em>{s.sub}</em></h2></div><div><p style={{fontSize:19,color:'#f1f1e9'}}>{s.line}</p><p>{s.lead}</p><ol>{s.tasks.map(t=><li key={t}>{t}</li>)}</ol><div className="idea-step-artifact"><div><span>THE REQUIRED OUTPUT</span><strong>{s.artifact}</strong></div><div><span>PASS / FAIL CHECK</span><strong>{s.gate}</strong></div></div><p className="idea-note">Practical tools: {s.tool}</p></div></article>)}
 <section className="idea-section" id="record"><div className="idea-marker"><span>02 / YOUR PROJECT RECORD</span><span>ONE SHEET FOR EVERY PROJECT</span></div><div className="idea-section-header"><h2 className="idea-display">WRITE IT<br/><em>DOWN.</em></h2><p>Keeping a record turns a lucky generation into something you can actually improve. Copy the template before opening a generation platform.</p></div><div className="idea-brief"><div className="idea-brief-head"><span>K4K / PROJECT PRODUCTION LOG</span><span>REUSABLE TEMPLATE</span></div><div className="idea-brief-body"><h3>THE PRODUCTION PAPER TRAIL.</h3><pre>{log}</pre><Link href="/prompts" className="idea-utility" style={{color:'#d0ff6b'}}>GET CONTROLLED PROMPT TEMPLATES <ArrowUpRight size={16}/></Link></div></div></section>
 <section className="idea-section" style={{paddingTop:0}}><div className="idea-ethics"><div><IdeaKicker>HONEST PRACTICE</IdeaKicker><h3>WHAT THIS<br/>DOESN'T DO.</h3></div><div><ul>{noHype.map(s=><li key={s}>{s}</li>)}</ul><IdeaLink href="/academy/gallery" variant="outline">READ REAL PRODUCTION CASES</IdeaLink></div></div></section>
 </div><IdeaFooter privateArea/></main>
}