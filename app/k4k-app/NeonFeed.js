'use client';
import {useState} from 'react';
import Link from 'next/link';

const NEON='#39ff14';
const INK='#040605';
const PAPER='#f1fbe9';
const MUTE='#96a391';

const HOOK_OF_THE_DAY='Make the moment yours.';

const TEMPLATES=[
 {id:0,title:'Night drive reveal',hook:'Your passenger finally smiles.',people:1,seconds:14,credits:300,tag:'Exclusive',tint:'#0c1a0a'},
 {id:1,title:'Pool float escape',hook:'Skyline, sunset, zero plans.',people:1,seconds:12,credits:240,tag:null,tint:'#0b1d10'},
 {id:2,title:'Bridge walk',hook:'One step at a time, above the mist.',people:1,seconds:15,credits:280,tag:'New',tint:'#101d0b'},
 {id:3,title:'Kitchen crew',hook:'Two chefs, one very hot pan.',people:2,seconds:10,credits:260,tag:null,tint:'#0c1a0a'},
];

const TABS=['Trending','New','Remix'];

export default function NeonFeed(){
 const [tab,setTab]=useState('Trending');
 return <div style={{minHeight:'100vh',background:INK,color:PAPER,fontFamily:'Arial,Helvetica,sans-serif'}}>
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'18px 5%',borderBottom:'1px solid #c8ff3a1f',flexWrap:'wrap'}}>
   <Link href="/" style={{fontFamily:'Georgia,serif',fontSize:26,color:PAPER,textDecoration:'none'}}>K4K<span style={{color:NEON}}> APP</span></Link>
   <nav aria-label="Feed tabs" style={{display:'flex',gap:22,fontFamily:'Georgia,serif',fontStyle:'italic',fontSize:17}}>
    {TABS.map(t=><button key={t} type="button" onClick={()=>setTab(t)} aria-pressed={tab===t} style={{background:'none',border:0,padding:0,cursor:'pointer',color:tab===t?PAPER:MUTE,borderBottom:tab===t?`2px solid ${NEON}`:'2px solid transparent',font:'inherit',paddingBottom:4}}>{t}</button>)}
   </nav>
   <Link href="/login" style={{border:`1px solid ${NEON}`,color:NEON,padding:'9px 16px',textDecoration:'none',fontSize:13,letterSpacing:'.04em'}}>Sign in</Link>
  </header>

  <div style={{padding:'14px 5%',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,borderBottom:'1px solid #ffffff12',flexWrap:'wrap'}}>
   <p style={{margin:0,fontFamily:'Georgia,serif',fontStyle:'italic',fontSize:20,textShadow:`0 0 18px ${NEON}66`}}>{HOOK_OF_THE_DAY}</p>
   <span style={{fontSize:12,color:MUTE,letterSpacing:'.12em'}}>NEW TEMPLATES EVERY WEEK</span>
  </div>

  <main style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:18,padding:'22px 5% 120px'}}>
   {TEMPLATES.map(t=><article key={t.id} style={{position:'relative',border:'1px solid #ffffff1f',background:t.tint,minHeight:440,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:20,boxShadow:`0 0 40px ${NEON}0d`}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:8}}>
     {t.tag?<span style={{background:PAPER,color:INK,fontSize:10,fontWeight:700,letterSpacing:'.16em',padding:'5px 8px',textTransform:'uppercase'}}>{t.tag}</span>:<span/>}
     <span style={{fontSize:11,color:MUTE,border:'1px solid #ffffff22',padding:'5px 8px'}}>{t.people} {t.people===1?'person':'people'} · {t.seconds} s</span>
    </div>
    <div>
     <p style={{margin:'0 0 8px',fontFamily:'Georgia,serif',fontSize:28,lineHeight:1.05}}>{t.title}</p>
     <p style={{margin:'0 0 16px',fontFamily:'Georgia,serif',fontStyle:'italic',color:PAPER,textShadow:`0 0 16px ${NEON}66`}}>{t.hook}</p>
     <p style={{margin:'0 0 14px',fontSize:13,color:MUTE}}>{t.credits} credits</p>
     <Link href={`/create?template=${t.id}`} style={{display:'block',textAlign:'center',background:NEON,color:INK,padding:'14px 16px',fontFamily:'Georgia,serif',fontSize:17,textDecoration:'none',boxShadow:`0 0 26px ${NEON}55`}}>Remix this template</Link>
    </div>
   </article>)}
  </main>

  <nav aria-label="Main" style={{position:'fixed',left:0,right:0,bottom:0,display:'flex',justifyContent:'space-around',alignItems:'center',background:'#060a07f2',borderTop:'1px solid #ffffff1c',padding:'10px 4% calc(10px + env(safe-area-inset-bottom,0px))',zIndex:50}}>
   <Link href="/" style={{color:PAPER,textDecoration:'none',fontSize:12}}>Home</Link>
   <Link href="/k4k-app/videos" style={{color:MUTE,textDecoration:'none',fontSize:12}}>Videos</Link>
   <Link href="/create" style={{background:NEON,color:INK,padding:'10px 22px',textDecoration:'none',fontWeight:700,boxShadow:`0 0 24px ${NEON}66`}}>Create</Link>
   <Link href="/k4k-app/credits" style={{color:MUTE,textDecoration:'none',fontSize:12}}>Credits</Link>
   <Link href="/login" style={{color:MUTE,textDecoration:'none',fontSize:12}}>Sign in</Link>
  </nav>
 </div>;
}
