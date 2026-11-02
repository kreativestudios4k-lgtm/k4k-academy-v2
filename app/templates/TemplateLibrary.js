"use client";
import {useState} from 'react';
import Link from 'next/link';
import VideoPreview from '../k4k-app/VideoPreview';
import '../k4k-app/studio.css';
import './templates.css';
const templates=[
{id:0,name:'Squad anthem',category:'Music',roles:'Group performance'},
{id:1,name:'The arrival',category:'Comedy',roles:'Solo entrance'},
{id:2,name:'Touchline energy',category:'Sports',roles:'Coach performance'},
{id:3,name:'Celebration crew',category:'Music',roles:'Group dance'},
{id:4,name:'Money spread',category:'Comedy',roles:'Prop performance'},
{id:5,name:'The boss',category:'Comedy',roles:'Lead character'},
{id:6,name:'Press room',category:'Sports',roles:'Interview scene'},
{id:7,name:'Metro entrance',category:'Comedy',roles:'Entrance scene'},
{id:8,name:'The group call',category:'Comedy',roles:'Multiple characters'},
{id:9,name:'Training ground',category:'Sports',roles:'Training scene'}];
export default function TemplateLibrary(){
const [category,setCategory]=useState('All');const [query,setQuery]=useState('');
const filtered=templates.filter(t=>(category==='All'||t.category===category)&&`${t.name} ${t.roles}`.toLowerCase().includes(query.trim().toLowerCase()));
return <main className="k4k-market"><header className="market-nav"><Link href="/" className="market-logo">K4K<span> APP</span></Link><nav aria-label="Main navigation"><Link href="/">Explore</Link><Link href="/templates" aria-current="page">Templates</Link><Link href="/create">Create video</Link><Link href="/academy">Academy</Link></nav></header>
<section className="market-section template-library"><span className="market-kicker">START WITH A SCENE</span><h1>Find your next creation.</h1><p>Choose a reference. Add your characters. Shape the story.</p><div className="template-controls"><label htmlFor="template-search">Search templates<input id="template-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search scenes or characters"/></label><div className="template-filters" role="group" aria-label="Template category">{['All','Music','Comedy','Sports'].map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div></div>
<p role="status" aria-live="polite">{filtered.length} {filtered.length===1?'template':'templates'}</p>
<div className="market-grid">{filtered.map(t=><article className="market-tile" key={t.id}><div className="market-video"><VideoPreview index={t.id} title={t.name}/><span className="market-tag">{t.category}</span></div><div className="market-tile-caption"><div><strong>{t.name}</strong><small>{t.roles}</small></div></div><Link className="market-use" aria-label={`Use ${t.name} template`} href={`/create?template=${t.id}`}>Use this template ↗</Link></article>)}</div>
{filtered.length===0&&<div className="template-empty"><h2>No matching templates</h2><p>Try another scene or browse the full collection.</p><button onClick={()=>{setQuery('');setCategory('All')}}>Show all templates</button></div>}
<p className="market-note">References are included automatically when you open a template. Generation is not yet available in this preview.</p></section><footer className="market-footer"><Link href="/create">Create from scratch ↗</Link><Link href="/academy">Existing students → Academy</Link></footer></main>;}
