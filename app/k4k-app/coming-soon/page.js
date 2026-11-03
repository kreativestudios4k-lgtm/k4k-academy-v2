import Link from 'next/link';
import VideoPreview from '../VideoPreview';
export const metadata={title:'Coming Soon | K4K APP'};
const features=[
 ['AI Video Generator','Create videos with AI models directly inside K4K APP.'],
 ['Character & Face Swap','Replace characters while keeping the original scene and motion.'],
 ['Viral Template Studio','Turn trending references into reusable creator workflows.'],
 ['Credit Wallet','Manage generation credits and usage in one place.'],
 ['Creator Community','Share templates and discover new creative ideas.']
];
export default function ComingSoon(){return <main style={{minHeight:'100vh',background:'#090a13',color:'#f5f4ff',padding:'32px max(20px,6vw)',fontFamily:'Arial,sans-serif'}}>
 <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
  <Link href="/k4k-app" style={{color:'white',fontSize:22,fontWeight:800,textDecoration:'none'}}>K4K APP</Link>
  <Link href="/academy" style={{color:'#b9acff'}}>Existing student access →</Link>
 </header>
 <section style={{maxWidth:780,margin:'80px auto 48px',textAlign:'center'}}>
  <p style={{letterSpacing:3,fontSize:12,color:'#a897ff'}}>NEW CREATOR FEATURES</p>
  <h1 style={{fontSize:'clamp(42px,7vw,76px)',lineHeight:1.08,margin:'18px 0'}}>Coming soon.</h1>
  <p style={{color:'#b9b9ca',fontSize:19,lineHeight:1.6}}>We are building the next generation of K4K creator tools. These features are not available yet. Existing students can continue using the Academy separately.</p>
 </section>
 <section style={{maxWidth:980,margin:'0 auto 42px',padding:24,border:'1px solid #51466f',borderRadius:20,background:'#171527'}}>
  <p style={{color:'#bbaeff',fontSize:12,fontWeight:700,letterSpacing:2}}>FEATURED TEMPLATE · PREVIEW ONLY</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:24,alignItems:'center'}}>
   <div style={{maxWidth:360,aspectRatio:'9 / 16',background:'#080912',borderRadius:16,overflow:'hidden'}}><VideoPreview index={0} title="Squad anthem template preview"/></div>
   <div><h2 style={{fontSize:30,margin:'0 0 12px'}}>Squad anthem</h2>
    <p style={{color:'#c2bfd2',lineHeight:1.7}}>A viral group-video remix template. Watch the example now; character replacement and AI video generation are coming soon.</p>
    <p style={{color:'#bbaeff',fontWeight:700}}>COMING SOON · GENERATION DISABLED</p>
    <Link href="/create?template=0" style={{color:'#ded6ff'}}>Open creator workspace preview →</Link>
   </div>
  </div>
 </section>
 <section style={{maxWidth:980,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:16}}>
  {features.map(([name,description])=><article key={name} style={{padding:24,background:'#171827',border:'1px solid #333249',borderRadius:18}}>
   <span style={{fontSize:11,color:'#bbaeff',fontWeight:700,letterSpacing:1}}>COMING SOON</span>
   <h2 style={{fontSize:20,margin:'16px 0 8px'}}>{name}</h2>
   <p style={{color:'#b9b9ca',lineHeight:1.5}}>{description}</p>
  </article>)}
 </section>
 <footer style={{maxWidth:980,margin:'48px auto',display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
  <Link href="/k4k-app" style={{color:'#bbaeff'}}>← Back to K4K APP</Link>
  <Link href="/academy" style={{color:'#bbaeff'}}>Go to my Academy →</Link>
 </footer>
 </main>}
