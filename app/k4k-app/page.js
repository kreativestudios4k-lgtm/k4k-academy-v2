import Link from 'next/link';
import './studio.css';
const templates=[
 {name:'Character Swap',type:'Identity',symbol:'◉',description:'Replace characters while preserving motion.'},
 {name:'Image to Video',type:'Animate',symbol:'▣',description:'Bring your still frames to life.'},
 {name:'Text to Video',type:'Create',symbol:'✦',description:'Start with a cinematic idea.'},
 {name:'Motion Transfer',type:'Motion',symbol:'↗',description:'Direct movements from a reference.'},
 {name:'Object Swap',type:'Edit',symbol:'◇',description:'Change an object while keeping the scene.'},
 {name:'Prompt Coach',type:'Enhance',symbol:'⌘',description:'Improve your generation instructions.'}
];
export const metadata={title:'K4K APP — AI Video Studio',description:'Explore K4K AI video workflows and templates.'};
export default function StudioHome(){
 return <main className="studio"><aside className="sidebar"><Link className="brand" href="/k4k-app">K4K<span> APP</span></Link><p className="navlabel">WORKSPACE</p><a className="navactive" href="#create">✦ Create</a><a href="#templates">▦ Templates</a><Link href="/academy/studio">◉ Character Swap</Link><Link href="/academy">▤ My Academy</Link><div className="sidefoot">Built for creators.<br/>Powered by imagination.</div></aside>
 <section className="main"><header className="topbar"><span>CREATIVE STUDIO <b>/ DISCOVER</b></span><Link href="/academy">My account ↗</Link></header>
 <div className="content"><div className="eyebrow">THE NEXT GENERATION OF CREATION</div><h1>Imagine it.<br/><em>Make it move.</em></h1><p className="intro">Your creative universe for AI video. Choose a workflow, bring your references, and create without limits to your imagination.</p>
 <div id="create" className="createpanel"><div className="paneltop"><span className="online">● STUDIO WORKSPACE</span><span>01 / 03</span></div><h2>What will you create today?</h2><p>Start from scratch or jump into a guided workflow.</p><div className="actions"><Link className="primary" href="/academy/studio">Open Character Swap ↗</Link><a className="secondary" href="#templates">Explore templates ↓</a></div><small>Video generation is available only where your account and enabled integrations permit it. No credits are charged by this page.</small></div>
 <div className="sectionhead" id="templates"><div><div className="eyebrow">CURATED WORKFLOWS</div><h2>Explore the studio</h2></div><span>6 CREATIVE TOOLS</span></div>
 <div className="cards">{templates.map((t,i)=><Link key={t.name} className={'template tile'+i} href={t.name==='Prompt Coach'?'/academy/studio':'/academy/studio'}><div className="art"><span>{t.symbol}</span><div className="artglow"/></div><div className="cardbody"><small>{t.type.toUpperCase()}</small><h3>{t.name} <span>↗</span></h3><p>{t.description}</p></div></Link>)}</div>
 <footer>© 2026 K4K APP · <Link href="/academy">Member workspace</Link></footer></div></section></main>;
}