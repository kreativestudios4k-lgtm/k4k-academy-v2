// K4K's public model discovery catalog. Model appearance does not imply enabled paid API access.
//
// The model declarations now live one per file in lib/creation-catalog/models/,
// each checked against the field contract in lib/creation-catalog/define.mjs at
// module load. This file stays the single import path for the studio and keeps
// the selection, grouping, pricing and brief helpers.
export {CREATION_MODELS} from './creation-catalog/index.mjs';
import {CREATION_MODELS} from './creation-catalog/index.mjs';

export function creationModels(kind){return CREATION_MODELS.filter(x=>x.kind===kind)}
// Only one customer-facing Cinema model. Legacy endpoints/IDs stay supported.
// Never silently switch a legacy paid job or an existing customer URL to another provider.
const HIDDEN_LEGACY_DISPLAY_MODELS=new Set(['kling4_0','kling_4_0_flash']);
export function publicCreationModels(kind){return creationModels(kind).filter(m=>!HIDDEN_LEGACY_DISPLAY_MODELS.has(m.id))}
export function publicCreationModelGroups(kind){
 const models=publicCreationModels(kind);
 return kind==='video'?[{id:'swap',title:'Character Swap · K4K Motion',models:models.filter(x=>x.category==='premium-motion')},{id:'production',title:'Video Production',models:models.filter(x=>x.category==='video-create')}]:[{id:'image',title:'Image Production',models}]
}

export function creationModelGroups(kind){const models=creationModels(kind);return kind==='video'?[{id:'swap',title:'Character Swap · K4K Motion',models:models.filter(x=>x.category==='premium-motion')},{id:'production',title:'Video Production',models:models.filter(x=>x.category==='video-create')}]:[{id:'image',title:'Image Production',models}]}
export function motionProviderEstimate(model,sourceSeconds,resolution='480p'){
 const rate=model?.ratesUsdPerSecond?.[resolution]??model?.usdPerSecond;
 if(!model?.premium||!model.resolution.includes(resolution)||!Number.isFinite(rate)||!Number.isFinite(sourceSeconds)||sourceSeconds<4||sourceSeconds>30)throw Error('MOTION_ESTIMATE_INVALID');
 const billedSeconds=Math.min(Math.ceil(sourceSeconds),model.motionModel==='lite'?15:30);
 return {usd:Math.round(rate*billedSeconds*1000000)/1000000,billedSeconds,sourceSeconds,provider:'K4K Motion',model:model.motionModel||'ultra',rateUsdPerSecond:rate,customerPriceApproved:false};
}
export function creationBrief(model,options={}){
 if(!model||!CREATION_MODELS.some(x=>x.id===model.id))throw Error('MODEL_UNSUPPORTED');
 const prompt=String(options.prompt||'').trim().slice(0,10000);
 if(!prompt)throw Error('PROMPT_REQUIRED');
 const mode=model.modes.includes(options.mode)?options.mode:model.modes[0];
 const resolution=model.resolution.includes(options.resolution)?options.resolution:model.resolution[0];
 const aspect=model.aspect.includes(options.aspect)?options.aspect:model.aspect[0];
 const duration=model.duration?Math.min(model.duration[1],Math.max(model.duration[0],Math.round(Number(options.duration)||model.duration[0]))):undefined;
 const references=Math.min(model.refs,Math.max(0,Number(options.references)||0));
 return ['K4K APP · Creative brief','Model: '+model.name,...(model.premium?[]:['Provider: '+model.provider]),'Workflow: '+mode,'Resolution: '+resolution,'Aspect: '+aspect,...(duration?['Duration: '+duration+'s']:[]),'Reference images: '+references,'Creative direction:',prompt].join('\n');
}
