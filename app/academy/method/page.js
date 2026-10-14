import Link from 'next/link';
import {ArrowLeft,ArrowRight,CheckCircle2,Clapperboard,Download,ShieldCheck,BookOpen,Image as ImageIcon} from 'lucide-react';
import {frameMethod,realProjects,honestPromise} from '../../../lib/k4k-real-work';

export const metadata={title:'The K4K FRAME Method | K4K Academy',robots:{index:false,follow:false}};
const label={fontSize:11,letterSpacing:'.2em',fontWeight:900,color:'#baff45',textTransform:'uppercase'};
export default function MethodPage(){
 return <main className="k4kFramePage">
  <nav className="k4kFrameNav" aria-label="Academy method navigation">
   <Link href="/academy"><ArrowLeft size={16}/> My Academy</Link>
   <div><Link href="/academy/gallery">Project Gallery <ArrowRight size={15}/></Link><Link href="/prompts">Prompt Vault</Link></div>
  </nav>
  <header className="k4kFrameHero">
   <span className="k4kFrameKicker">PRIVATE MEMBER STUDIO / PRODUCTION SYSTEM 01</span>
   <h1>NOT A MAGIC<br/>PROMPT. <em>A METHOD.</em></h1>
   <p>K4K FRAME is a five-stage checklist drawn from real character-swap, football and creator-avatar projects. It teaches the work <strong>before and after</strong> pressing Generate.</p>
   <div className="k4kFrameLetterRow">{frameMethod.map(s=><a key={s.letter} href={'#step-'+s.number} title={s.title}><strong>{s.letter}</strong><small>{s.tag}</small></a>)}</div>
   <a className="k4kFrameAction" href="#step-01">START THE METHOD <ArrowRight size={18}/></a>
  </header>
  <section className="k4kFrameIntro"><div><span style={label}>THE LEARNING CONTRACT</span><h2>MAKE SOMETHING.<br/><em>PROVE HOW.</em></h2></div>
   <div><p>Every stage produces a file you can inspect. By the end you should have a reference map, a character identity sheet, a saved test, an iteration log and a final export. If one stage fails, you know what to fix.</p><p>No guaranteed views, magic settings or hidden “one-click” claims.</p></div></section>
  <section className="k4kFrameSteps" aria-label="Five practical stages">
   {frameMethod.map(s=><article id={'step-'+s.number} className="k4kFrameStep" key={s.letter}>
    <div className="k4kFrameStepInitial">{s.letter}<span>{s.number} / 05</span></div>
    <div className="k4kFrameStepBody"><span style={label}>{s.tag}</span><h2>{s.title}</h2><p>{s.description}</p><h3>DO THE WORK</h3>
     <ol>{s.actions.map(action=><li key={action}>{action}</li>)}</ol>
     <div className="k4kFrameOutput"><div><small>YOU MUST PRODUCE</small><strong>{s.output}</strong></div><div><small>QUALITY GATE</small><strong>{s.check}</strong></div></div>
    </div></article>)}
  </section>
  <section className="k4kFramePractice" id="practice">
   <div><span style={label}>YOUR FIRST PROJECT / APPROX. 8 SECONDS</span><h2>ONE PERSON.<br/>ONE ACTION.<br/><em>ONE FINISHED CLIP.</em></h2><p>Start with footage you record yourself: a friend walking, a seated portrait or a simple hand gesture. Keep it short enough to assess every frame. Never start by replacing an entire football squad.</p>
    <div className="k4kFramePracticeLinks"><Link href="/academy/workflows/viral-character-swap">FOLLOW A FILMED EXAMPLE <ArrowRight size={16}/></Link><Link href="/prompts">GET THE TEMPLATES <ArrowRight size={16}/></Link></div>
   </div>
   <div className="k4kFramePracticeVisual"><img src={realProjects[2].cover} alt="A real K4K multi-angle reference sheet used to plan a character identity" loading="lazy"/><span>REAL REFERENCE · CHARACTER CONSISTENCY</span></div>
  </section>
  <section className="k4kFrameWorksheet" id="template">
   <span style={label}>THE K4K PROJECT RECORD</span><h2>THE PROJECT SHEET YOU ACTUALLY NEED.</h2><p>Copy this simple record into Notes before every generation. A prompt without a reference, output and revision record is not a repeatable workflow.</p>
   <pre>{`K4K FRAME / PRODUCTION RECORD

PROJECT & DATE:
INTENDED AUDIENCE / PLATFORM:
SOURCE FOOTAGE & PERMISSION:
SHOT / TIMING NOTES:
CHARACTER & WARDROBE REFERENCES:
AI TOOL / MODEL / MODE:
PROMPT VERSION:
RESULT VIDEO OR IMAGE:
COST / RENDERS USED:
THREE THINGS THAT WORKED:
THREE THINGS TO CORRECT:
FINAL EXPORT SETTINGS:
AI DISCLOSURE / RIGHTS CHECK:`}</pre>
   <Link href="/academy/gallery">COMPARE WITH REAL K4K PROJECTS <ArrowRight size={18}/></Link>
  </section>
  <section className="k4kFrameHonesty"><div><ShieldCheck size={28}/><h2>THE HONEST BIT.</h2></div><ul>{honestPromise.map(line=><li key={line}><CheckCircle2 size={17}/>{line}</li>)}</ul></section>
  <footer className="k4kFrameFooter"><Link href="/academy">← MEMBER DASHBOARD</Link><Link href="/academy/gallery">SEE THE REAL PROJECT GALLERY →</Link></footer>
  <style>{`
  .k4kFramePage{font-family:Arial,Helvetica,sans-serif;background:#06080d;color:#f5f7fa;min-height:100vh;padding:0 clamp(20px,5vw,88px);overflow-x:hidden}.k4kFramePage *{box-sizing:border-box}.k4kFramePage a{text-decoration:none}.k4kFramePage :is(a,button):focus-visible{outline:2px solid #baff45;outline-offset:5px}
  .k4kFrameNav{position:static;width:auto;height:auto;min-height:78px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid #ffffff2c;padding:0;z-index:auto}.k4kFrameNav a{display:inline-flex;gap:9px;align-items:center;color:#d7e3f3;font-size:12px;font-weight:800}.k4kFrameNav>div{display:flex;gap:24px;flex-wrap:wrap}
  .k4kFrameHero{padding:clamp(75px,10vw,160px) 0 120px;background:radial-gradient(ellipse at 80% 28%,#244b894a,transparent 60%)}.k4kFrameKicker{color:#baff45;font-size:11px;letter-spacing:.23em;font-weight:900}.k4kFrameHero h1{font-size:clamp(55px,9.1vw,151px);line-height:.88;letter-spacing:-.092em;margin:36px 0;max-width:1200px}.k4kFrameHero h1 em,.k4kFrameIntro h2 em,.k4kFramePractice h2 em{font-style:normal;color:transparent;-webkit-text-stroke:1px #f2f4fc}.k4kFrameHero>p{font-size:clamp(16px,1.7vw,21px);line-height:1.75;color:#afbdcf;max-width:740px;margin-bottom:45px}.k4kFrameHero strong{color:#f5f7fa}
  .k4kFrameLetterRow{display:grid;grid-template-columns:repeat(5,1fr);max-width:1050px;border:1px solid #ffffff2b;border-radius:16px;overflow:hidden;margin-bottom:36px}.k4kFrameLetterRow>a{padding:21px 18px;background:#161d29;border-right:1px solid #ffffff22;display:flex;flex-direction:column;gap:12px}.k4kFrameLetterRow>a:last-child{border:0}.k4kFrameLetterRow strong{font-size:clamp(43px,7vw,88px);line-height:.9;letter-spacing:-.08em}.k4kFrameLetterRow small{font-size:10px;line-height:1.5;color:#b9c6d6}.k4kFrameLetterRow>a:hover{background:#223146}.k4kFrameAction{display:inline-flex;align-items:center;gap:35px;background:#baff45;color:#080b08;padding:18px 24px;border-radius:99px;font-size:12px;font-weight:900}
  .k4kFrameIntro{display:grid;grid-template-columns:1fr 1fr;gap:9%;border-top:1px solid #ffffff36;padding:65px 0 90px}.k4kFrameIntro h2,.k4kFramePractice h2{font-size:clamp(44px,6vw,93px);line-height:.95;letter-spacing:-.08em;margin:25px 0}.k4kFrameIntro p{font-size:17px;line-height:1.85;color:#b6c1d1}
  .k4kFrameSteps{border-top:1px solid #ffffff30}.k4kFrameStep{scroll-margin-top:30px;display:grid;grid-template-columns:minmax(100px,.25fr) 1fr;gap:8%;padding:68px 0;border-bottom:1px solid #ffffff2c}.k4kFrameStepInitial{font-size:clamp(110px,15vw,230px);line-height:.8;letter-spacing:-.09em;color:#c3d3e8;font-weight:950}.k4kFrameStepInitial span{display:block;font-size:11px;letter-spacing:.23em;color:#baff45;margin-top:35px}.k4kFrameStepBody h2{font-size:clamp(37px,5vw,73px);letter-spacing:-.07em;line-height:.95;margin:18px 0}.k4kFrameStepBody>p{font-size:17px;max-width:750px;line-height:1.75;color:#bac5d4}.k4kFrameStepBody h3{font-size:11px;letter-spacing:.21em;color:#e1e8f2;margin:34px 0 14px}.k4kFrameStepBody ol{padding-left:22px;line-height:1.85;color:#d7dfed;font-size:15px}.k4kFrameStepBody li{padding-left:7px;margin:8px 0}.k4kFrameOutput{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:35px}.k4kFrameOutput>div{background:#111925;border:1px solid #ffffff30;padding:25px;border-radius:13px}.k4kFrameOutput small{display:block;color:#baff45;font-size:10px;letter-spacing:.17em;font-weight:800;margin-bottom:10px}.k4kFrameOutput strong{font-size:15px;line-height:1.5}
  .k4kFramePractice{display:grid;grid-template-columns:1.05fr .95fr;gap:6%;padding:115px 0;align-items:center}.k4kFramePractice>div>p{line-height:1.8;color:#bac8d7;font-size:16px}.k4kFramePracticeVisual{border:1px solid #ffffff3b;border-radius:23px;overflow:hidden;background:#161921}.k4kFramePracticeVisual img{display:block;width:100%;max-height:520px;object-fit:contain}.k4kFramePracticeVisual span{font-size:10px;letter-spacing:.2em;color:#b3bfd1;display:block;padding:16px}.k4kFramePracticeLinks{display:flex;flex-wrap:wrap;gap:15px;margin-top:26px}.k4kFramePracticeLinks a,.k4kFrameWorksheet>a{display:inline-flex;align-items:center;gap:12px;border:1px solid #ffffff6b;border-radius:99px;padding:15px 20px;font-size:11px;font-weight:900}
  .k4kFrameWorksheet{background:#131b28;border:1px solid #ffffff30;border-radius:24px;padding:clamp(25px,5vw,75px);margin-bottom:90px}.k4kFrameWorksheet h2{font-size:clamp(32px,5vw,68px);line-height:1.05;letter-spacing:-.07em;max-width:900px}.k4kFrameWorksheet>p{color:#c1ccda;line-height:1.8;max-width:770px}.k4kFrameWorksheet pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#060a10;border:1px solid #ffffff2e;color:#e9f1fd;line-height:1.95;padding:clamp(17px,3vw,35px);border-radius:14px;white-space:pre-wrap;font-size:clamp(11px,1.3vw,14px);margin:26px 0}.k4kFrameHonesty{border-top:1px solid #ffffff35;padding:65px 0;display:grid;grid-template-columns:.7fr 1.3fr;gap:8%}.k4kFrameHonesty h2{font-size:clamp(35px,4vw,58px);letter-spacing:-.06em}.k4kFrameHonesty svg{color:#baff45}.k4kFrameHonesty ul{padding:0;list-style:none}.k4kFrameHonesty li{display:flex;gap:14px;line-height:1.7;font-size:14px;color:#cad5e4;margin:12px 0}.k4kFrameHonesty li svg{flex-shrink:0;margin-top:4px}.k4kFrameFooter{display:flex;justify-content:space-between;gap:25px;flex-wrap:wrap;padding:30px 0 50px;border-top:1px solid #ffffff2b;color:#c0cede;font-size:11px;font-weight:800}
  @media(max-width:760px){.k4kFrameNav>div{gap:13px}.k4kFrameHero{padding:80px 0}.k4kFrameLetterRow{grid-template-columns:repeat(5,minmax(0,1fr))}.k4kFrameLetterRow>a{padding:13px 5px;text-align:center;align-items:center}.k4kFrameLetterRow strong{font-size:45px}.k4kFrameLetterRow small{font-size:8px;letter-spacing:0}.k4kFrameIntro,.k4kFramePractice,.k4kFrameHonesty{grid-template-columns:1fr;gap:22px}.k4kFrameStep{grid-template-columns:1fr;gap:28px;padding:55px 0}.k4kFrameStepInitial{font-size:92px}.k4kFrameStepInitial span{display:inline-block;margin-left:20px}.k4kFrameOutput{grid-template-columns:1fr}.k4kFramePractice{padding:75px 0}.k4kFrameHero h1{font-size:clamp(53px,11vw,83px)}}
  @media(prefers-reduced-motion:reduce){.k4kFramePage *{scroll-behavior:auto!important}}
  `}</style>
 </main>
}