import LogoutButton from '../components/LogoutButton';
import Link from 'next/link';
import WelcomeVoice from './WelcomeVoice';
import GooglePasswordReminder from './GooglePasswordReminder';
import LearningProgress from './LearningProgress';
import {ArrowRight,LockKeyhole,CalendarDays,CheckCircle2,LifeBuoy,BookOpen} from 'lucide-react';

export const dynamic='force-dynamic';
export default function Academy(){
 const workflowTwoAvailable=Date.now()>=new Date('2026-10-11T23:00:00.000Z').getTime();
 return <main className="dash">
  <aside>
   <Link className="brand" href="/"><span>K4K</span> ACADEMY</Link>
   <nav><Link className="active" href="/academy">My Workflows</Link><Link href="/academy/workflows/viral-character-swap">Workflow 01</Link><Link href="/academy/workflows/puskas-character-swap">Workflow 02 · {workflowTwoAvailable?'Available':'Monday'}</Link><Link href="/prompts">Prompt Vault</Link><Link href="/mentor">AI Instructor</Link></nav>
   <div style={{padding:"12px 0",display:"grid",gap:12}}><Link href="/update-password" style={{color:"#caff39",fontSize:13,fontWeight:800,textDecoration:"underline"}}>Change Password</Link><LogoutButton/></div>
   <div className="member"><small>MEMBERSHIP</small><b>CREATOR MEMBER</b><span>Private workflow library</span></div>
  </aside>
  <section className="dashmain">
   <div className="academyMobileNav"><Link href="/academy/workflows/viral-character-swap">Workflow 01</Link><Link href="/academy/workflows/puskas-character-swap">Workflow 02</Link><Link href="/prompts">Prompts</Link><Link href="/update-password">Password</Link></div>
   <GooglePasswordReminder/>
   <WelcomeVoice/>
   <header><div><small>K4K CREATOR SYSTEM · MEMBERS ONLY</small><h1>WELCOME TO<br/><i>THE LAB.</i></h1><p style={{color:"#c1ccbc",maxWidth:620,lineHeight:1.7,marginTop:15}}>Your private K4K Academy learning space. Start with Workflow 01, then come back for a new workflow every week.</p></div><div className="avatar">K4K</div></header>
   <LearningProgress workflowTwoAvailable={workflowTwoAvailable}/>
   <div className="sectiontitle"><div>YOUR WEEKLY WORKFLOWS</div><span>{workflowTwoAvailable?'02 WORKFLOWS AVAILABLE':'01 AVAILABLE · 02 MONDAY 12 OCT'}</span></div>
   <div className="continue">
    <div className="workflowCover"><img src="https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/06017105-11b5-47e6-aafd-f942478ead64.jpg" alt="Multi-angle character sheet from Dembow Party Workflow 01" loading="lazy"/><span className="workflowCoverLabel">WORKFLOW 001 · REAL EXAMPLE</span></div>
    <section>
     <small><CheckCircle2 size={14} style={{verticalAlign:"middle",marginRight:6}}/> WORKFLOW 001 · AVAILABLE NOW · 5 STEPS</small>
     <h2>DEMBOW PARTY · CHARACTER SWAP</h2>
     <p>Watch the 46-second original street-performance video alongside the 16-second AI recreation. Download the exact military-jacket and pink-shorts character sheet, then follow the Higgsfield Genjutsu workflow with ready-to-copy prompts.</p>
     <Link href="/academy/workflows/viral-character-swap">OPEN WORKFLOW 01 <ArrowRight/></Link>
    </section>
   </div>
   <article id="coming-next" style={{marginTop:24,padding:"clamp(22px,4vw,36px)",border:"1px solid #ffffff2b",borderRadius:16,background:"linear-gradient(125deg,#161d16,#0d120e)",display:"flex",flexWrap:"wrap",gap:20,alignItems:"center",justifyContent:"space-between"}}>
    <div style={{flex:"1 1 290px",maxWidth:650}}>
     <small style={{display:"flex",alignItems:"center",gap:8,color:"#caff39",fontWeight:800,letterSpacing:2}}>{workflowTwoAvailable?<CheckCircle2 size={15}/>:<LockKeyhole size={15}/>} WORKFLOW 002 · {workflowTwoAvailable?'AVAILABLE NOW':'UNLOCKS MONDAY 12 OCTOBER'}</small>
     <h2 style={{fontSize:"clamp(24px,3.5vw,36px)",margin:"14px 0",color:"#f7f9f4"}}>THE PUSKÁS CHARACTER SWAP</h2>
     <p style={{lineHeight:1.75,color:"#b9c7b4",margin:0}}>Recreate a historic football goal with a new character while preserving the original camera work, football movement and realistic body proportions. Includes the original video, AI result, multi-angle character sheet and a Genjutsu prompt.</p>
     <Link href="/academy/workflows/puskas-character-swap" style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:20,color:workflowTwoAvailable?"#101510":"#caff39",background:workflowTwoAvailable?"#caff39":"transparent",border:"1px solid #caff39",padding:"12px 16px",borderRadius:8,fontSize:12,fontWeight:900,textDecoration:"none"}}>{workflowTwoAvailable?'OPEN WORKFLOW 02':'PREVIEW RELEASE DATE'} <ArrowRight size={16}/></Link>
    </div>
    <div style={{flex:"0 1 260px",width:"100%",maxWidth:280,alignSelf:"stretch",minHeight:170,overflow:"hidden",borderRadius:12,border:"1px solid #ffffff24",background:"#232d22"}}>
     <img src="https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/4b7dae04-8bad-475f-b0d7-fe4a884a46a0.jpg" alt="Workflow 02 football character sheet preview" loading="lazy" style={{width:"100%",height:"100%",maxHeight:260,objectFit:"cover",objectPosition:"top"}}/>
    </div>
   </article>
   <div className="academyHelp"><div><LifeBuoy size={22}/><div><strong>Need help accessing your membership?</strong><p>Already paid? Don't buy again. We can help with login, password and subscription questions.</p></div></div><a href="mailto:hello@kreativestudios4k.com?subject=K4K%20Academy%20member%20support">CONTACT SUPPORT <ArrowRight size={16}/></a></div>
   <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"24px 0",color:"#b9c7b4",lineHeight:1.7}}><CalendarDays size={20} color="#caff39" style={{flexShrink:0,marginTop:2}}/><p style={{margin:0}}><strong style={{color:"#f6f9f2"}}>One new workflow every week.</strong> New lessons are released to the private member library as they become ready. Release dates and lesson topics will be announced here.</p></div>
  </section>
 </main>
}