// Server-only Genjutsu Light API adapter. No browser access and no implicit submissions.
// A trusted coordinator must first authenticate the customer, verify owned media,
// reserve credits atomically, enforce spending limits, and explicitly enable billing.
export const GENJUTSU_LIGHT_MODEL='higgsfield/genjutsu-light/motion-transfer/v1.0';
export const GENJUTSU_LIGHT_ENDPOINT='https://api.higgsfield.ai/higgsfield/genjutsu-light/motion-transfer/v1.0';
export const GENJUTSU_LIGHT_USD_PER_SECOND=Object.freeze({'480p':0.05,'720p':0.10,'1080p':0.20});
function validHttps(value){
 if(typeof value!=='string'||value.length>2083)return false;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function validateGenjutsuLightInput(input){
 if(!input||typeof input!=='object')throw new Error('Missing generation input');
 const {video_url,image_urls,prompt='',resolution='720p'}=input;
 if(!validHttps(video_url))throw new Error('Invalid source video URL');
 if(!Array.isArray(image_urls)||image_urls.length<1||image_urls.length>8||new Set(image_urls).size!==image_urls.length||!image_urls.every(validHttps))throw new Error('Provide 1–8 distinct HTTPS image URLs');
 if(typeof prompt!=='string'||prompt.length>10000)throw new Error('Invalid prompt');
 if(!Object.hasOwn(GENJUTSU_LIGHT_USD_PER_SECOND,resolution))throw new Error('Unsupported resolution');
 return {video_url,image_urls,prompt,resolution};
}
export function estimateGenjutsuLightCost({resolution='720p',outputSeconds,referenceSeconds=0}){
 if(!Object.hasOwn(GENJUTSU_LIGHT_USD_PER_SECOND,resolution)||!Number.isFinite(outputSeconds)||outputSeconds<=0||outputSeconds>15||!Number.isFinite(referenceSeconds)||referenceSeconds<0)throw new Error('Invalid duration or resolution');
 return Math.round((Math.ceil(outputSeconds)+referenceSeconds)*GENJUTSU_LIGHT_USD_PER_SECOND[resolution]*100)/100;
}
export function createGenjutsuLightProvider({credentials,fetchImpl=fetch,enabled=false,maxUsd=null,verifiedOutputSeconds=null,verifiedReferenceSeconds=null}={}){
 if(typeof window!=='undefined')throw new Error('Server only');
 async function submit(input){
  if(!enabled)throw new Error('Paid AI generation is disabled');
  if(!credentials||!/^[^:\s]+:[^:\s]+$/.test(credentials))throw new Error('Higgsfield server credentials not configured');
  const payload=validateGenjutsuLightInput(input);
  // A billable test must have a verified duration and a positive, finite USD cap.
  // Never rely on the prompt or user-supplied duration for this spending guard.
  if(!Number.isFinite(maxUsd)||maxUsd<=0||maxUsd>5)throw new Error('Verified USD spending cap required');
  if(!Number.isFinite(verifiedOutputSeconds)||verifiedOutputSeconds<=0||!Number.isFinite(verifiedReferenceSeconds)||verifiedReferenceSeconds<0)throw new Error('Verified media duration required');
  const estimatedUsd=estimateGenjutsuLightCost({resolution:payload.resolution,outputSeconds:verifiedOutputSeconds,referenceSeconds:verifiedReferenceSeconds});
  if(estimatedUsd>maxUsd)throw new Error('Provider cost exceeds authorized spending cap');
  const response=await fetchImpl(GENJUTSU_LIGHT_ENDPOINT,{
   method:'POST',headers:{Authorization:'Key '+credentials,'Content-Type':'application/json'},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(30000),cache:'no-store'
  });
  if(!response.ok)throw new Error('Higgsfield submission failed ('+response.status+')');
  const result=await response.json();
  if(!result||typeof result.request_id!=='string'||!['queued','in_progress','completed'].includes(result.status))throw new Error('Unexpected Higgsfield response');
  return result;
 }
 return Object.freeze({submit});
}
