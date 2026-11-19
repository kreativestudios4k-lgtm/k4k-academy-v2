import Link from 'next/link';
import {ArrowUpRight,BriefcaseBusiness,Film,ShieldCheck,Clapperboard,Image as ImageIcon} from 'lucide-react';
import PreviewShell from '../PreviewShell';
import StudioSidebar from '../StudioSidebar';
import {CREATION_MODELS} from '../../../lib/creation-studio-catalog.mjs';
import './business-studio.css';

export const metadata={
 title:'Business Studio — Seedance | K4K APP',
 description:'Explore Seedance for commercial video ideas, brand campaigns and cinematic storytelling. Model options and availability are confirmed inside the K4K creation workspace.'
};
const ids=['seedance_2_5_flash','seedance_2_5'];
const models=ids.map(id=>CREATION_MODELS.find(model=>model.id===id)).filter(Boolean);
const workflows=[
 {name:'Product commercials',detail:'Build product-focused scenes with clear brand direction and camera movement.',Icon:BriefcaseBusiness},
 {name:'Brand campaigns',detail:'Turn a campaign idea into a sequence of cinematic creative briefs.',Icon:Film},
 {name:'Creator storytelling',detail:'Develop references and narrative concepts for social-first advertising.',Icon:Clapperboard}
];
export default function BusinessStudio(){
 return <PreviewShell active="Creator" dashboard>
  <div className="k4k-business-layout">
   <StudioSidebar active="business"/>
   <div className="k4k-business-main">
    <header className="k4k-business-hero">
     <span className="k4k-business-eyebrow">K4K APP / BUSINESS STUDIO</span>
     <h1>Make your brand<br/><em>impossible to ignore.</em></h1>
     <p>Commercial-quality creative direction, a dedicated Seedance model selection and a clear path from concept to video. Select a supported workflow, review the generation quote and create when the provider is enabled for your account.</p>
     <div className="k4k-business-hero-actions">
      <Link href="/k4k-app/create?kind=video&model=seedance_2_5_flash" className="k4k-business-primary">Open Seedance workspace <ArrowUpRight size={17}/></Link>
      <Link href="/k4k-app/credits" className="k4k-business-secondary">Plans & credits</Link>
     </div>
     <div className="k4k-business-highlights">
      <span><ShieldCheck size={15}/> API access checked before charging</span>
      <span><Film size={15}/> Reference-led workflows where supported</span>
      <span><ImageIcon size={15}/> Model-specific quality settings</span>
     </div>
    </header>
    <section className="k4k-business-models" aria-labelledby="business-models-title">
     <div className="k4k-business-section-head"><div><span className="k4k-business-eyebrow">SELECT YOUR MODEL</span><h2 id="business-models-title">Seedance for business</h2></div><p>Quality and duration reflect K4K's current verified catalogue, not a guarantee of API access.</p></div>
     <div className="k4k-business-model-grid">
      {models.map(model=><article key={model.id} className="k4k-business-model">
       <div className="k4k-business-demo">{model.demoUrl?<video controls muted playsInline preload="metadata" src={model.demoUrl} aria-label={model.name+' sample video'}/>:<span>{model.name}</span>}<small>DEMO / NOT YOUR GENERATION</small></div>
       <div className="k4k-business-model-body">
        <h3>{model.name}</h3>
        <p>{model.description}</p>
        <div className="k4k-business-meta"><span>Resolution <strong>{model.resolution.join(' / ')}</strong></span><span>Length <strong>{model.duration?model.duration.join('–')+' seconds':'Varies'}</strong></span><span>References <strong>{model.refs>0?'Up to '+model.refs+' images':'Text only'}</strong></span></div>
        <Link href={'/k4k-app/create?kind=video&model='+encodeURIComponent(model.id)}>Choose {model.name} <ArrowUpRight size={16}/></Link>
       </div>
      </article>)}
     </div>
    </section>
    <section className="k4k-business-workflows" aria-labelledby="business-workflows-title">
     <div className="k4k-business-section-head"><div><span className="k4k-business-eyebrow">YOUR CREATIVE BRIEF</span><h2 id="business-workflows-title">Built for commercial ideas</h2></div></div>
     <div className="k4k-business-workflow-grid">{workflows.map(({name,detail,Icon})=><article key={name}><Icon size={23}/><h3>{name}</h3><p>{detail}</p></article>)}</div>
    </section>
    <p className="k4k-business-safety">Seedance 2.5 currently lists 480p for its active text-to-video configuration; Seedance 2.5 Flash lists up to 720p. Higher resolutions must not be advertised until the provider confirms K4K supports them. Premium generation is only possible when the selected workflow is enabled and a verified credit quote is available. Commercial usage rights depend on the provider's terms.</p>
   </div>
  </div>
 </PreviewShell>;
}
