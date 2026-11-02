// Explicitly simulated beta flow. No network, payments, credits or provider calls.
export const DEMO_MODELS=Object.freeze(['K4K Create','K4K Motion Lite','K4K Motion Pro']);
export const MODE_MODELS=Object.freeze({
 'Text to video':Object.freeze(['K4K Create']),
 'Image to video':Object.freeze(['K4K Create']),
 'Character swap':Object.freeze(['K4K Motion Lite','K4K Motion Pro'])
});
export function modelsForMode(mode){return MODE_MODELS[mode]||[];}
export function simulateK4KJourney({model,mode,prompt,imageCount,hasTemplate}){
 if(!modelsForMode(mode).includes(model)) return {ok:false,error:'Choose a model supported by this creation workflow.'};
 if(typeof prompt!=='string'||prompt.trim().length<5||prompt.length>1800)
  return {ok:false,error:'Enter at least five characters of creative direction.'};
 if(!['Text to video','Image to video','Character swap'].includes(mode))
  return {ok:false,error:'Choose a creation mode.'};
 if(mode!=='Text to video'&&imageCount<1)
  return {ok:false,error:'Upload at least one reference image to test this mode.'};
 return {
  ok:true,model,mode,
  steps:['Input checks simulated','Payment confirmation simulated','Credit reservation simulated','Provider readiness simulated','Video delivery simulated'],
  templateLoaded:Boolean(hasTemplate),
  simulatedChargeGbpPence:0,
  realGeneration:false
 };
}
