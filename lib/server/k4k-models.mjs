import {validateGenjutsuLightInput} from './genjutsu-light-provider.mjs';
export const K4K_MODELS=Object.freeze({
 lite:Object.freeze({label:'K4K Lite',modelId:'higgsfield/genjutsu-light/motion-transfer/v1.0',endpoint:'https://api.higgsfield.ai/higgsfield/genjutsu-light/motion-transfer/v1.0',maxSeconds:15,usdPerSecond:Object.freeze({'480p':0.05,'720p':0.10,'1080p':0.20})}),
 pro:Object.freeze({label:'K4K Pro',modelId:'higgsfield/genjutsu/motion-transfer/v1.0',endpoint:'https://api.higgsfield.ai/higgsfield/genjutsu/motion-transfer/v1.0',minSeconds:4,maxSeconds:30,usdPerSecond:Object.freeze({'480p':0.318,'720p':0.681,'1080p':1.632})})
});
export function validateK4KGeneration(tier,input){
 const model=K4K_MODELS[tier];
 if(!model)throw new Error('Only K4K Lite and K4K Pro are supported');
 return validateGenjutsuLightInput(input);
}
export function estimateK4KProviderCost(tier,{resolution='720p',sourceSeconds,referenceSeconds=0}){
 const model=K4K_MODELS[tier];
 if(!model||!Object.hasOwn(model.usdPerSecond,resolution)||!Number.isFinite(sourceSeconds)||sourceSeconds<(model.minSeconds??0.001)||sourceSeconds>model.maxSeconds||!Number.isFinite(referenceSeconds)||referenceSeconds<0)throw new Error('Unsupported model, resolution or duration');
 const seconds=Math.ceil(sourceSeconds);
 const billableSeconds=tier==='lite'?seconds+referenceSeconds:seconds;
 return Math.round(billableSeconds*model.usdPerSecond[resolution]*1000)/1000;
}
export function createK4KModelProvider({credentials,enabled=false,fetchImpl=fetch}={}){
 if(typeof window!=='undefined')throw new Error('Server only');
 return Object.freeze({
  async submit(tier,input){
   if(!enabled)throw new Error('Paid generation disabled');
   if(typeof credentials!=='string'||!/^[^:\s]+:[^:\s]+$/.test(credentials))throw new Error('Missing server credentials');
   const model=K4K_MODELS[tier];
   const payload=validateK4KGeneration(tier,input);
   const response=await fetchImpl(model.endpoint,{method:'POST',headers:{Authorization:'Key '+credentials,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000),cache:'no-store'});
   if(!response.ok)throw new Error('Generation provider error ('+response.status+')');
   const result=await response.json();
   if(!result||typeof result.request_id!=='string'||!['queued','in_progress','completed'].includes(result.status))throw new Error('Invalid generation provider response');
   return result;
  }
 });
}
