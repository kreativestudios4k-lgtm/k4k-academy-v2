'use client';
import {Film,Images,Play,Sparkles} from 'lucide-react';
import './model-selection-animation.css';

// Show the user's supplied clip only when the selected catalog model has a demoUrl.
// For other models, this is branded CSS motion, never an invented provider result.
export default function ModelSelectionAnimation({model}){
 const variant=model.premium?'motion':model.kind==='image'?'image':model.id.startsWith('seedance')?'cinematic':model.id.includes('kling')?'kinetic':'flow';
 return <section key={model.id} className="kcs-model-animation" aria-label={'Animated preview of '+model.name}>
  <div className="kcs-model-animation-header">
   <span><Sparkles size={14}/> MODEL SHOWCASE</span>
   <span>{model.demoUrl?'MODEL DEMO · '+(model.demoDurationSec||'')+'s':'ANIMATED MODEL INTRO'}</span>
  </div>
  <div className="kcs-model-animation-stage">
   {model.demoUrl?
    <video key={model.id} src={model.demoUrl} autoPlay muted loop playsInline preload="metadata" aria-label={model.name+' demo video'}/>:
    <div className={'kcs-model-animation-art kcs-model-animation-'+variant} key={model.id} aria-hidden="true">
     <div className="kcs-model-animation-orbit first"/>
     <div className="kcs-model-animation-orbit second"/>
     <div className="kcs-model-animation-stripe one"/>
     <div className="kcs-model-animation-stripe two"/>
     <div className="kcs-model-animation-stripe three"/>
     <div className="kcs-model-animation-core">
      {model.kind==='image'?<Images size={35} strokeWidth={1.4}/>:<Film size={35} strokeWidth={1.4}/>}
      <b>K4K</b>
     </div>
     <div className="kcs-model-animation-scan"/>
    </div>}
   <div className="kcs-model-animation-shade"/>
   <div className="kcs-model-animation-overlay">
    <span>{model.kind==='image'?'IMAGE MODEL':'VIDEO MODEL'}</span>
    <strong>{model.name}</strong>
    <small>{model.demoUrl?<><Play size={12}/> Autoplay demo · {model.demoAspect||'16:9'} source</>:'Interface animation · not generated output'}</small>
   </div>
  </div>
 </section>;
}
