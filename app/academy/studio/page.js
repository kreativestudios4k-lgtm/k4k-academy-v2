import Link from 'next/link';
import {ArrowLeft,ArrowUpRight,Clapperboard,LockKeyhole,ShieldCheck,Sparkles} from 'lucide-react';
import {IdeaHeader} from '../../components/IdeaUI';
import K4KReferencePhoto from '../../components/K4KReferencePhoto';
import CharacterSwapStudio from './CharacterSwapStudio';
export const dynamic='force-dynamic';
export const metadata={
 title:'Character Swap Studio — K4K Academy',
 description:'Private K4K IDEA workflow to preview a reference video, assign character sheets and create Genjutsu prompts. Media stays in the browser.',
 robots:{index:false,follow:false}
};
export default function AcademyCharacterSwapStudio(){
 return <main className="k4k-classroom k4k-creator-studio"><IdeaHeader privateArea/>
  <div className="k4k-course-shell">
   <nav className="k4k-course-breadcrumb"><Link href="/academy"><ArrowLeft size={16}/> BACK TO ACADEMY</Link><span>PAID MEMBER TOOL / K4K IDEA</span><Link href="/academy/lessons/viral-character-swap">WORKFLOW LESSON <ArrowUpRight size={15}/></Link></nav>
   <header className="k4k-studio-hero">
    <div className="k4k-studio-hero-copy">
     <span className="k4k-course-kicker"><Sparkles size={15}/> YOUR CREATIVE WORKSPACE</span>
     <h1>CHARACTER<br/><em>SWAP STUDIO.</em></h1>
     <p>From your video reference to a precise Genjutsu-ready prompt. Build a believable swap using the K4K IDEA method—without uploading your private media to the Academy.</p>
     <div className="k4k-studio-hero-badges"><span><Clapperboard size={15}/> OBJECT SWAP / MOTION TRANSFER</span><span><LockKeyhole size={15}/> LOCAL FILE PREVIEW</span><span><ShieldCheck size={15}/> NO AI CREDIT CHARGE</span></div>
    </div>
    <div className="k4k-studio-hero-visual" aria-hidden="true">
     <div className="k4k-studio-hero-visual-one"><K4KReferencePhoto index={0}/></div>
     <div className="k4k-studio-hero-visual-two"><K4KReferencePhoto index={1}/></div>
     <div className="k4k-studio-hero-visual-three"><K4KReferencePhoto index={2}/></div>
     <div className="k4k-studio-hero-visual-caption"><span>VIDEO</span><b>→</b><span>IDENTITY</span><b>→</b><span>DIRECT</span></div>
    </div>
   </header>
   <CharacterSwapStudio/>
  </div>
 </main>;
}
