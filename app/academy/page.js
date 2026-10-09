import LogoutButton from '../components/LogoutButton';
import Link from 'next/link';
import WelcomeVoice from './WelcomeVoice';
import {Play,ArrowRight,LockKeyhole,CalendarDays,CheckCircle2} from 'lucide-react';

export default function Academy(){
 return <main className="dash">
  <aside>
   <Link className="brand" href="/"><span>K4K</span> ACADEMY</Link>
   <nav><a className="active" href="/academy">My Workflows</a><a href="/academy/workflows/viral-character-swap">Workflow 01</a><a href="#coming-next">Workflow 02 · Soon</a></nav>
   <div style={{padding:"12px 0"}}><LogoutButton/></div>
   <div className="member"><small>MEMBERSHIP</small><b>CREATOR MEMBER</b><span>Private workflow library</span></div>
  </aside>
  <section className="dashmain">
   <WelcomeVoice/>
   <header><div><small>K4K CREATOR SYSTEM · MEMBERS ONLY</small><h1>WELCOME TO<br/><i>THE LAB.</i></h1><p style={{color:"#c1ccbc",maxWidth:620,lineHeight:1.7,marginTop:15}}>Your private K4K Academy learning space. Start with Workflow 01, then come back for a new workflow every week.</p></div><div className="avatar">K4K</div></header>
   <div className="sectiontitle"><div>YOUR WEEKLY WORKFLOWS</div><span>01 AVAILABLE · 02 COMING SOON</span></div>
   <div className="continue">
    <div><span><Play fill="currentColor"/></span></div>
    <section>
     <small><CheckCircle2 size={14} style={{verticalAlign:"middle",marginRight:6}}/> WORKFLOW 001 · AVAILABLE NOW</small>
     <h2>VIRAL CHARACTER SWAP</h2>
     <p>Watch the original reference video, create a consistent character sheet, use Higgsfield Genjutsu Motion Transfer, and compare your AI recreation. Includes ready-to-copy prompts and downloadable reference material.</p>
     <Link href="/academy/workflows/viral-character-swap">OPEN WORKFLOW 01 <ArrowRight/></Link>
    </section>
   </div>
   <article id="coming-next" style={{marginTop:24,padding:"clamp(22px,4vw,36px)",border:"1px solid #ffffff2b",borderRadius:16,background:"linear-gradient(125deg,#161d16,#0d120e)",display:"flex",flexWrap:"wrap",gap:20,alignItems:"center",justifyContent:"space-between"}}>
    <div style={{maxWidth:600}}>
     <small style={{display:"flex",alignItems:"center",gap:8,color:"#caff39",fontWeight:800,letterSpacing:2}}><LockKeyhole size={15}/> WORKFLOW 002 · COMING SOON</small>
     <h2 style={{fontSize:"clamp(24px,3.5vw,36px)",margin:"14px 0",color:"#f7f9f4"}}>YOUR NEXT CREATOR WORKFLOW</h2>
     <p style={{lineHeight:1.75,color:"#b9c7b4",margin:0}}>We're preparing the next practical AI creation lesson. It will appear here when released. No new purchase is needed while your membership is active.</p>
    </div>
    <span style={{border:"1px solid #caff3966",color:"#caff39",padding:"12px 18px",borderRadius:30,fontSize:12,fontWeight:900,letterSpacing:1}}>COMING SOON</span>
   </article>
   <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"24px 0",color:"#b9c7b4",lineHeight:1.7}}><CalendarDays size={20} color="#caff39" style={{flexShrink:0,marginTop:2}}/><p style={{margin:0}}><strong style={{color:"#f6f9f2"}}>One new workflow every week.</strong> New lessons are released to the private member library as they become ready. Release dates and lesson topics will be announced here.</p></div>
  </section>
 </main>
}