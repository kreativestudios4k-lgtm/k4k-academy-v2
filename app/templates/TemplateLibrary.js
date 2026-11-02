'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import VideoPreview from '../k4k-app/VideoPreview';
import '../k4k-app/studio.css';
import './templates.css';

const templates=[
 {id:0,name:'Squad anthem',category:'Music',roles:'Group performance',label:'SQUAD'},
 {id:1,name:'The arrival',category:'Comedy',roles:'Solo entrance',label:'ENTRANCE'},
 {id:2,name:'Touchline energy',category:'Sports',roles:'Coach performance',label:'REACTION'},
 {id:3,name:'Celebration crew',category:'Music',roles:'Group dance',label:'CELEBRATION'},
 {id:4,name:'Money spread',category:'Comedy',roles:'Prop performance',label:'PROP'},
 {id:5,name:'The boss',category:'Comedy',roles:'Lead character',label:'REVEAL'},
 {id:6,name:'Press room',category:'Sports',roles:'Interview scene',label:'PRESS'},
 {id:7,name:'Metro entrance',category:'Comedy',roles:'Entrance scene',label:'STREET'},
 {id:8,name:'The group call',category:'Comedy',roles:'Multiple characters',label:'CAST'},
 {id:9,name:'Training ground',category:'Sports',roles:'Training scene',label:'TRAINING'}
];
const categories=['All','Music','Comedy','Sports'];
export default function TemplateLibrary(){
 const [category,setCategory]=useState('All');
 const [query,setQuery]=useState('');
 const filtered=useMemo(()=>templates.filter(t=>(category==='All'||t.category===category)&&`${t.name} ${t.roles} ${t.label} ${t.category}`.toLowerCase().includes(query.trim().toLowerCase())),[category,query]);
 return <main className="k4k-market">
  <header className="market-nav"><Link href="/" className="market-logo">K4K<span> APP</span><i>✳</i></Link><nav aria-label="Main navigation"><Link href="/">Discover</Link><Link href="/templates" aria-current="page">Templates</Link><Link href="/create">Studio</Link><Link href="/academy">Academy</Link></nav><Link href="/create" className="market-login">Start from scratch ↗</Link></header>
  <section className="template-hero"><div><span className="market-kicker">THE K4K REFERENCE VAULT</span><h1>Find the motion.<br/><em>Make it yours.</em></h1><p>Discover ready-to-remix scenes. Every template opens a focused workspace with its reference video preloaded—you only add your character and direction.</p><div className="template-hero-actions"><a href="#library" className="market-cta">Explore templates ↗</a><Link href="/create" className="market-outline">Create without a template</Link></div></div><div className="template-featured-grid"><Link href="/create?template=2"><img src="/videos/template-2.webp" alt="Touchline energy template preview"/><span>SPORTS / TOUCHLINE ENERGY</span></Link><Link href="/create?template=3"><img src="/videos/template-3.webp" alt="Celebration crew template preview"/><span>MUSIC / CELEBRATION CREW</span></Link><Link href="/create?template=8"><img src="/videos/template-8.webp" alt="Group call template preview"/><span>COMEDY / THE GROUP CALL</span></Link></div></section>
  <section id="library" className="market-section template-library">
   <div className="template-library-head"><div><span className="market-kicker">EXPLORE THE COLLECTION</span><h2>Ready when you are.</h2><p>10 original K4K references for motion-driven storytelling.</p></div><div className="template-library-stat"><strong>{String(templates.length).padStart(2,'0')}</strong><span>SCENES TO REMIX</span></div></div>
   <div className="template-controls"><label htmlFor="template-search">Find a scene<input id="template-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by action, category or character role"/></label><div className="template-filters" role="group" aria-label="Template category">{categories.map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}{c==='All'?` · ${templates.length}`:` · ${templates.filter(t=>t.category===c).length}`}</button>)}</div></div>
   <div className="template-count" role="status" aria-live="polite">{filtered.length} {filtered.length===1?'scene':'scenes'} shown</div>
   <div className="market-grid">{filtered.map(t=><article className="market-tile" key={t.id}><div className="market-video"><VideoPreview index={t.id} title={t.name}/><span className="market-tag">{t.category.toUpperCase()} / {t.label}</span></div><div className="market-tile-caption"><div><strong>{t.name}</strong><small>{t.roles}</small></div><span>↗</span></div><Link className="market-use" aria-label={`Use ${t.name} reference`} href={`/create?template=${t.id}`}>Remix this scene <span>↗</span></Link></article>)}</div>
   {filtered.length===0&&<div className="template-empty"><h2>No scenes found</h2><p>Try a broader term or explore the whole vault.</p><button onClick={()=>{setQuery('');setCategory('All')}}>Show all templates</button></div>}
   <p className="market-note">K4K template previews are muted and are creative reference clips. Selecting one does not spend credits. Real AI rendering is not yet active.</p>
  </section>
  <section className="template-outro"><div><span className="market-kicker">PREFER A BLANK CANVAS?</span><h2>Three distinct ways to create.</h2><p>Text to Video, Image to Video and Character Swap each have their own model options inside the studio. Choose the workflow that fits your idea.</p></div><Link className="market-cta" href="/create">Open K4K Studio ↗</Link></section>
  <footer className="market-footer"><Link href="/">← Discover K4K</Link><span>Generation is disabled in this free preview. No payment or provider call is made.</span><Link href="/academy">Existing students → Academy</Link></footer>
 </main>;
}
