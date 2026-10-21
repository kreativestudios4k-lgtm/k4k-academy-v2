import Link from 'next/link';
import {ArrowUpRight,ShieldCheck} from 'lucide-react';
import {IdeaHeader} from '../../components/IdeaUI';
import K4KReferencePhoto from '../../components/K4KReferencePhoto';
export const metadata={title:'K4K Creator Reference Studio — Academy',robots:{index:false,follow:false}};
const images=[
 {title:'THE MOVING CITY',subtitle:'Identity + believable motion',desc:'Your masked-creator portrait in a street with moving background figures. Use it to study focus, natural camera blur and visual consistency.',href:'/academy/lessons/reality-engine'},
 {title:'THE IDENTITY ANCHOR',subtitle:'Face, glasses and clothing',desc:'Your clean close-up reference preserves the visible eye region, black balaclava, glasses and jacket geometry before any outfit change.',href:'/academy/lessons/wardrobe-lock'},
 {title:'THE LOCKER-ROOM SCENE',subtitle:'Environmental storytelling',desc:'Your cinematic football setting demonstrates warm practical lights, geometry, subject scale and believable contact with a ball. Treat it as a separate concept image—not a wardrobe-preserving before/after.',href:'/academy/lessons/scene-transfer'}
];
export default function Gallery(){
 return <main className="k4k-classroom"><IdeaHeader privateArea/><div className="k4k-course-shell">
  <nav className="k4k-course-breadcrumb"><Link href="/academy">← YOUR STUDIO</Link><span>VISUAL REFERENCE LAB</span></nav>
  <header style={{padding:'42px 0 20px'}}><span className="k4k-course-kicker">K4K ACADEMY / YOUR CREATOR IMAGES</span><h1 style={{fontSize:'clamp(44px,6vw,88px)',letterSpacing:'-.08em',lineHeight:'.9',margin:'18px 0'}}>ONE IDENTITY.<br/><span style={{color:'#caff39'}}>THREE CREATIVE DIRECTIONS.</span></h1><p style={{fontSize:15,lineHeight:1.75,color:'#b9c9b2',maxWidth:740}}>These are your original uploaded creator references. Our method uses them to demonstrate control of identity, camera and environment. Students make their own authorised examples rather than copying a PDF or claiming someone else’s result.</p></header>
  <div className="k4k-reference-gallery">{images.map((x,i)=><article key={x.title}><K4KReferencePhoto index={i}/><div><span className="k4k-course-kicker">REFERENCE 0{i+1} / K4K</span><h3>{x.title}</h3><p style={{color:'#caff39',fontWeight:850}}>{x.subtitle}</p><p>{x.desc}</p><Link href={x.href}>LEARN THE WORKFLOW <ArrowUpRight size={16}/></Link></div></article>)}</div>
  <div className="k4k-lesson-objective"><span>IDENTITY IS THE CONTROL VARIABLE</span><h2>Preserve the same masked creator. Change only what the brief allows.</h2><p><ShieldCheck size={15} style={{display:'inline',verticalAlign:'middle'}}/> Photorealistic AI images may be synthetic. Do not present them as authentic footage of a real event.</p></div>
  <div style={{padding:'20px 0 70px'}}><Link className="k4k-course-primary" href="/academy">BACK TO THE FULL COURSE <ArrowUpRight size={18}/></Link></div>
 </div></main>;
}
