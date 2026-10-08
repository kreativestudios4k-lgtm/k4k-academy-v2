import LogoutButton from '../components/LogoutButton';
import Link from 'next/link';
import WelcomeVoice from './WelcomeVoice';
import {Play,ArrowRight} from 'lucide-react';

export default function Academy(){
 return <main className="dash">
  <aside>
   <Link className="brand" href="/"><span>K4K</span> ACADEMY</Link>
   <nav><a className="active" href="/academy">Academy</a><a href="/academy/workflows/viral-character-swap">Viral Video Workflow</a></nav>
   <div style={{padding:"12px 0"}}><LogoutButton/></div>
   <div className="member"><small>MEMBERSHIP</small><b>MEMBER ACCESS</b><span>Member access</span></div>
  </aside>
  <section className="dashmain">
   <WelcomeVoice/>
   <header><div><small>K4K CREATOR SYSTEM</small><h1>WELCOME TO<br/><i>THE LAB.</i></h1></div><div className="avatar">K4K</div></header>
   <div className="sectiontitle"><div>YOUR WORKFLOW</div><span>1 WORKFLOW</span></div>
   <div className="continue">
    <div><span><Play fill="currentColor"/></span></div>
    <section>
     <small>WORKFLOW 001 · VIRAL VIDEO</small>
     <h2>VIRAL CHARACTER SWAP</h2>
     <p>Learn the complete reference video → character sheet → Genjutsu Motion Transfer process to recreate a viral AI video.</p>
     <Link href="/academy/workflows/viral-character-swap">Open viral video workflow <ArrowRight/></Link>
    </section>
   </div>
  </section>
 </main>
}