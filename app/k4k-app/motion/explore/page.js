import MobileTemplateFeed from '../../MobileTemplateFeed';
import Link from 'next/link';
export const metadata={title:'Explore K4K Motion templates | K4K APP',description:'Explore original K4K Motion videos, then open a selected scene in Director Studio.'};
export default function MotionExplore(){
 return <main className="k4k-motion-explore">
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap',padding:'13px clamp(16px,3vw,46px)',background:'#101215',borderBottom:'1px solid #343a3d',fontFamily:'Arial,Helvetica,sans-serif',color:'#f4f6f2'}}>
   <Link href="/k4k-app/motion" style={{color:'#d6ff69',textDecoration:'none',fontWeight:900,fontSize:14}}>K4K Motion / Director Studio</Link>
   <span style={{fontSize:12,color:'#bec8c1'}}>Explore original motion scenes below · Select one to start casting</span>
  </div>
  <MobileTemplateFeed motionIntegrated/>
 </main>
}
