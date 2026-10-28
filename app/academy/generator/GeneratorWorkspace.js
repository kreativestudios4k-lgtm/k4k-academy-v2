'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
const templates=[
 {id:'swap',title:'Viral Character Swap',tag:'Reference video + character sheets',description:'Map replacement characters to people in your reference clip.'},
 {id:'award',title:"Ballon d’Or Moment",tag:'Football awards meme',description:'Plan a dramatic trophy reveal or funny award moment.'},
 {id:'entrance',title:'Stadium Entrance',tag:'Football cinematic',description:'Direct a player entrance with matching kit and camera motion.'},
 {id:'custom',title:'Create from Scratch',tag:'Custom idea',description:'Start with your own concept, shot and action.'}
];
const key='k4k-generator-preview-drafts-v1';
export default function GeneratorWorkspace(){
 const [locks,setLocks]=useState({identity:true,wardrobe:true,background:true,motion:true,props:true});const [mapping,setMapping]=useState('Person on left → image 1\nPerson on right → image 2');const [qa,setQa]=useState({});const [selected,setSelected]=useState('swap'),[prompt,setPrompt]=useState(''),[drafts,setDrafts]=useState([]),[title,setTitle]=useState(''),[video,setVideo]=useState(''),[images,setImages]=useState([]),[notice,setNotice]=useState('');
 useEffect(()=>{try{const x=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(x))setDrafts(x.slice(0,30))}catch{}},[]);
 const template=templates.find(x=>x.id===selected);
 const compiled=['K4K PRECISION SWAP — '+template.title,'Character mapping:',mapping,'Preserve exactly:',...Object.entries(locks).filter(([,on])=>on).map(([name])=>'- '+name),'Requested changes:',prompt,'Do not modify unrelated people, faces, objects, camera timing or scenery. Maintain frame-to-frame consistency.'].join('\n');
 const save=()=>{const item={mapping,locks,id:Date.now(),template:selected,title:title.trim()||template.title,prompt:prompt.trim(),created:new Date().toISOString()};const next=[item,...drafts].slice(0,30);setDrafts(next);try{localStorage.setItem(key,JSON.stringify(next));setNotice('Draft saved in this browser. Media files are not saved.')}catch{setNotice('Browser storage is unavailable; draft is only kept for this session.')}};
 const remove=id=>{const next=drafts.filter(x=>x.id!==id);setDrafts(next);try{localStorage.setItem(key,JSON.stringify(next))}catch{}};
 const box={background:'#151a26',border:'1px solid #343b4b',borderRadius:18,padding:22};
 const input={width:'100%',padding:13,borderRadius:10,border:'1px solid #515c70',background:'#0d111a',color:'#fff'};
 return <section style={{color:'#f5f7fb',paddingBottom:60}}>
  <div style={{...box,background:'linear-gradient(125deg,#1b263a,#171824)',marginBottom:22}}>
   <span style={{color:'#b7c8ff',fontSize:12,letterSpacing:2}}>K4K AI STUDIO / SAFE PREVIEW</span>
   <h1 style={{fontSize:'clamp(30px,5vw,56px)',margin:'12px 0'}}>CREATE YOUR NEXT VIRAL VIDEO.</h1>
   <p style={{maxWidth:680,color:'#c5ccda'}}>Choose a template, prepare your reference and character images, then save a project. Real AI rendering and paid credits are not connected yet.</p>
   <p style={{color:'#ffcf8b',fontSize:13}}>Preview mode · No charges · No AI generations · No media uploaded</p>
  </div>
  <h2 style={{margin:'22px 0 14px'}}>1. Choose a viral template</h2>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
  {templates.map(t=><button key={t.id} onClick={()=>{setSelected(t.id);setNotice('')}} aria-pressed={selected===t.id} style={{...box,textAlign:'left',cursor:'pointer',color:'#fff',border:selected===t.id?'2px solid #a5baff':'1px solid #343b4b'}}>
   <span style={{fontSize:12,color:'#aebfe6'}}>{t.tag}</span><h3 style={{margin:'10px 0'}}>{t.title}</h3><p style={{fontSize:13,color:'#c5ccda'}}>{t.description}</p><strong style={{color:'#b6caff'}}>{selected===t.id?'✓ Selected':'Choose template →'}</strong>
  </button>)}</div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:16,marginTop:22}}>
   <div style={box}><h2>2. Prepare your video</h2><label style={{display:'block',margin:'18px 0 8px'}}>Project name</label><input style={input} value={title} onChange={e=>setTitle(e.target.value)} maxLength={90} placeholder="My football video"/>
   <label style={{display:'block',margin:'18px 0 8px'}}>Reference video (local preview only)</label><input style={input} type="file" accept="video/*" onChange={e=>setVideo(e.target.files?.[0]?.name||'')}/>{video&&<p style={{fontSize:12}}>Selected: {video}</p>}
   <label style={{display:'block',margin:'18px 0 8px'}}>Character images (local preview only)</label><input style={input} type="file" accept="image/*" multiple onChange={e=>setImages(Array.from(e.target.files||[]).map(f=>f.name))}/>{images.length>0&&<p style={{fontSize:12}}>{images.length} image(s) selected</p>}
   <p style={{fontSize:12,color:'#aeb6c6'}}>Files never leave your device in this preview. They are not included when saving a draft.</p>
   </div>
   <div style={box}><h2>3. Direct your scene</h2><p style={{color:'#c5ccda',fontSize:14}}>Describe what must stay the same and what should change.</p><textarea style={{...input,minHeight:175,resize:'vertical'}} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Keep the original camera motion and background. Replace the main character using image 1. Preserve the trophy and exact timing."/>
   <div style={{margin:'18px 0',borderTop:'1px solid #343b4b',paddingTop:15}}><h3>Precision Controls</h3><p style={{fontSize:13,color:'#c5ccda'}}>Lock what must not change. These instructions will be included in your generation prompt.</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10}}>{Object.entries(locks).map(([name,on])=><label key={name} style={{fontSize:13,textTransform:'capitalize'}}><input type="checkbox" checked={on} onChange={e=>setLocks(v=>({...v,[name]:e.target.checked}))}/> {name}</label>)}</div><label style={{display:'block',margin:'16px 0 8px'}}>Who replaces whom?</label><textarea style={{...input,minHeight:85}} value={mapping} onChange={e=>setMapping(e.target.value)}/><button onClick={()=>{navigator.clipboard?.writeText(compiled).then(()=>setNotice('Precision prompt copied.')).catch(()=>setNotice('Copy unavailable in this browser.'))}} style={{...input,marginTop:12,cursor:'pointer'}}>Copy precision prompt</button><details style={{marginTop:12}}><summary>Review compiled instructions</summary><pre style={{whiteSpace:'pre-wrap',fontSize:12}}>{compiled}</pre></details></div><button onClick={save} style={{...input,background:'#a5baff',color:'#111827',fontWeight:800,cursor:'pointer',marginTop:14}}>Save project draft</button>
   <button disabled style={{...input,opacity:.5,marginTop:10,cursor:'not-allowed'}}>Generate video — API connection pending</button>
   {notice&&<p role="status" style={{color:'#a5e6bb'}}>{notice}</p>}
   <p style={{fontSize:12,color:'#aeb6c6'}}>Generation credits: not enabled. No balance is assigned or deducted.</p>
   <Link href="/academy/studio" style={{color:'#b6caff'}}>Open existing prompt builder →</Link>
   </div>
  </div>
  <div style={{...box,marginTop:22}}><h2>4. Quality check before publishing</h2><p style={{fontSize:13,color:'#c5ccda'}}>Use this checklist when you review an actual render. This preview does not automatically analyze video frames.</p>{['Faces remain consistent','Correct people replaced','Wardrobe matches references','Props and trophy remain correct','Motion and background preserved','No distorted hands or flicker'].map(label=><label key={label} style={{display:'block',padding:'8px 0'}}><input type="checkbox" checked={!!qa[label]} onChange={e=>setQa(v=>({...v,[label]:e.target.checked}))}/> {label}</label>)}<p style={{color:'#b6caff'}}>{Object.values(qa).filter(Boolean).length}/6 checks completed</p></div><div style={{...box,marginTop:22}}><h2>Saved projects <span style={{fontSize:13,color:'#b6caff'}}>({drafts.length})</span></h2><p style={{fontSize:13,color:'#c5ccda'}}>Drafts are stored only in this browser, not in your Academy account.</p>
  {drafts.length===0?<p>No projects saved yet. Create your first draft above.</p>:<div style={{display:'grid',gap:10}}>{drafts.map(d=><div key={d.id} style={{borderTop:'1px solid #343b4b',paddingTop:12,display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{d.title}</strong><p style={{fontSize:12,color:'#c5ccda'}}>{templates.find(t=>t.id===d.template)?.title||'Template'} · {new Date(d.created).toLocaleString()}</p><button onClick={()=>{setSelected(d.template);setTitle(d.title);setPrompt(d.prompt);setMapping(d.mapping||'');setLocks(d.locks||locks);setNotice('Draft loaded. Re-select your files if needed.');window.scrollTo({top:0,behavior:'smooth'})}} style={{color:'#b6caff',background:'transparent',border:0,cursor:'pointer'}}>Load draft</button></div><button onClick={()=>remove(d.id)} style={{color:'#ffb9b9',background:'transparent',border:0,cursor:'pointer'}}>Delete</button></div>)}</div>}
  </div>
 </section>;
}