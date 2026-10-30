"use client";
import { useEffect, useState } from "react";
const starter = [
 {title:"Football Video Call",views:"10M+",duration:"10s",slots:3},
 {title:"Backstage Football Scene",views:"12M",duration:"16s",slots:4},
 {title:"Cinematic Waterfront",views:"6M",duration:"28s",slots:1}
];
export default function StudioPilot(){
 const [selected,setSelected]=useState<number|null>(null);
 const [tab,setTab]=useState<"templates"|"community">("templates");
 const [references,setReferences]=useState<File[]>([]);
 const [communityVideo,setCommunityVideo]=useState<File|null>(null);
 const [title,setTitle]=useState("");
 const [apiStatus,setApiStatus]=useState("Checking server configuration…");
 useEffect(()=>{let active=true;fetch("/api/studio/status",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Status unavailable");return r.json()}).then(data=>{if(active)setApiStatus(data.configured?"Server credentials configured · generation locked":"Server credentials missing · generation locked")}).catch(()=>{if(active)setApiStatus("Status unavailable · generation locked")});return()=>{active=false}},[]);
 return <main style={{minHeight:"100vh",background:"#090911",color:"#f7f5ff",padding:"40px max(20px,5vw)",fontFamily:"system-ui,sans-serif"}}>
 <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
 <strong style={{fontSize:22}}>✦ K4K <span style={{color:"#a78bfa"}}>AI STUDIO</span></strong>
 <span style={{border:"1px solid #514070",borderRadius:99,padding:"7px 12px",fontSize:12}}>PRIVATE PREVIEW · NO CHARGES</span>
 </header>
 <p role="status" style={{color:"#c6b5ff",fontSize:13,marginTop:20}}>{apiStatus}</p>
 <section style={{textAlign:"center",padding:"55px 0 35px"}}>
 <div style={{color:"#ad91ff",fontSize:12,letterSpacing:3}}>CREATE • REMIX • SHARE</div>
 <h1 style={{fontSize:"clamp(30px,5vw,58px)",margin:"15px auto",maxWidth:750}}>Your next viral video starts here.</h1>
 <p style={{color:"#a5a1b4",maxWidth:570,margin:"auto"}}>Start with three creator-tested templates or submit your own for the community.</p>
 </section>
 <nav style={{display:"flex",gap:10,marginBottom:28}}>
 {(["templates","community"] as const).map(t=><button key={t} onClick={()=>{setTab(t);setSelected(null)}} style={{background:tab===t?"#7250df":"#24202f",color:"white",padding:"12px 18px",border:0,borderRadius:10,cursor:"pointer"}}>{t==="templates"?"Viral Templates":"Community Upload"}</button>)}
 </nav>
 {tab==="templates" ? selected===null ? <section><h2>Viral templates <small style={{color:"#a5a1b4",fontWeight:400}}> · 28M+ creator-reported views</small></h2>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:18}}>
 {starter.map((t,i)=><article key={t.title} style={{border:"1px solid #393245",background:"#191723",borderRadius:18,overflow:"hidden"}}>
 <div style={{height:235,background:["linear-gradient(130deg,#253f63,#0e1321)","linear-gradient(130deg,#4a4d35,#151a17)","linear-gradient(130deg,#73878c,#1a343d)"][i],display:"grid",placeItems:"center",fontSize:64}}>▶</div>
 <div style={{padding:18}}><strong>{t.title}</strong><p style={{color:"#b8afca",fontSize:13}}>{t.views} views · {t.duration}</p>
 <button onClick={()=>{setSelected(i);setReferences([])}} style={{width:"100%",padding:12,border:0,borderRadius:10,color:"white",background:"#7250df",cursor:"pointer"}}>Remake template</button></div></article>)}</div></section>
 : <section style={{maxWidth:680,margin:"auto"}}><button onClick={()=>setSelected(null)} style={{background:"transparent",border:0,color:"#b6a2ff",cursor:"pointer"}}>← Back to templates</button>
 <h2>Remake: {starter[selected].title}</h2><p style={{color:"#aaa4b7"}}>Upload up to {starter[selected].slots} character reference images. Your files remain in your browser in this preview.</p>
 <label style={{display:"block",border:"1px dashed #8e78bc",borderRadius:15,padding:28,margin:"20px 0"}}>
 <strong>Choose character images</strong><input style={{display:"block",marginTop:15,maxWidth:"100%"}} type="file" accept="image/*" multiple onChange={e=>setReferences(Array.from(e.target.files||[]).slice(0,starter[selected].slots))}/>
 </label><p>{references.length} / {starter[selected].slots} reference images selected</p>
 <p style={{color:"#a5a1b4"}}>Engine: Higgsfield Genjutsu Object Swap · API connection pending</p>
 <button disabled style={{padding:"13px 20px",background:"#51446f",border:0,color:"#cfc5df",borderRadius:10}}>Generate — awaiting secure API setup</button></section>
 : <section style={{maxWidth:700,margin:"auto",background:"#181622",padding:24,borderRadius:18,border:"1px solid #393245"}}>
 <h2>Share your viral template</h2><p style={{color:"#aaa4b7"}}>Community submissions will require an account, rights confirmation and moderation before appearing publicly.</p>
 <label style={{display:"block",margin:"20px 0"}}>Template title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={90} placeholder="Give your template a name" style={{display:"block",width:"100%",marginTop:8,padding:13,background:"#252232",color:"white",border:"1px solid #554b65",borderRadius:9}}/></label>
 <label style={{display:"block",padding:25,border:"1px dashed #74618e",borderRadius:12}}>Upload MP4 / MOV (4–30 seconds)<input type="file" accept="video/mp4,video/quicktime" style={{display:"block",marginTop:15,maxWidth:"100%"}} onChange={e=>setCommunityVideo(e.target.files?.[0]||null)}/></label>
 {communityVideo&&<p style={{color:"#b8afca"}}>Selected: {communityVideo.name}</p>}
 <label style={{display:"block",margin:"20px 0",fontSize:13}}><input type="checkbox" disabled/> I own this video or have permission to share it for remixes (available after authentication)</label>
 <button disabled style={{background:"#51446f",border:0,color:"#cfc5df",padding:14,borderRadius:10}}>Submit for review — coming soon</button>
 </section>}
 <footer style={{color:"#888195",fontSize:12,marginTop:65,borderTop:"1px solid #282432",paddingTop:20}}>K4K AI Studio pilot · No uploads sent to a server · No payments or credits charged</footer>
 </main>
}