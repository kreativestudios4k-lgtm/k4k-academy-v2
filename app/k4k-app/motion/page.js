import Link from 'next/link';
import MobileTemplateFeed from '../MobileTemplateFeed';
export const metadata={title:'K4K Motion — Use This Template',description:'Explore K4K uploaded reference videos and create your own version. Generated video outputs remain in My Generations.'};
export default function MotionTemplates(){return <main style={{minHeight:'100vh',background:'#08090b',color:'#fff'}}>
<section style={{maxWidth:1400,margin:'auto',padding:'32px 4% 20px',display:'flex',gap:24,flexWrap:'wrap',justifyContent:'space-between',alignItems:'center'}}>
<div><span style={{fontSize:11,letterSpacing:2,color:'#aaa'}}>K4K APP / CHARACTER SWAP</span><h1 style={{fontSize:'clamp(32px,5vw,58px)',margin:'8px 0 4px',letterSpacing:'-2px'}}>K4K Motion — Use This Template</h1><p style={{color:'#bbb',maxWidth:700}}>Explore our uploaded reference videos, then select “Use this template” to recreate a scene with your photos. Templates are separate from your generated videos.</p></div>
<nav style={{display:'flex',gap:14,flexWrap:'wrap',fontSize:13}}><Link style={{padding:'12px 16px',borderRadius:30,background:'#fff',color:'#111',fontWeight:800}} href="/k4k-app/videos">My Generations</Link><Link style={{padding:'12px 16px',borderRadius:30,border:'1px solid #777',color:'#fff'}} href="/k4k-app/create">Video Production</Link></nav></section>
<p style={{maxWidth:1400,margin:'0 auto',padding:'0 4% 15px',fontSize:12,color:'#aeb1bd'}}>Template generation currently uses K4K’s existing video service. Premium K4K Motion Lite, Pro and Ultra remain in API pilot and are not yet customer-enabled.</p>
<MobileTemplateFeed/></main>;}
