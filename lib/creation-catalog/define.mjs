// The field contract every catalogue entry is checked against, at module load.
//
// A model declares what it supports and the studio renders exactly that, so
// adding a model is a new file in models/ plus a line in index.mjs -- no studio
// change, no second hardcoded list. The point of validating here is that a
// malformed declaration fails the build instead of rendering a broken control
// or quoting a price the provider will refuse.
//
// Unknown fields are rejected on purpose: a typo like `resolutions` would
// otherwise be silently ignored and the model would offer one resolution.

const FIELDS=new Set(['id','name','provider','displayProvider','kind','category','description','status','duration','resolution','refs','modes','aspect','premium','motionModel','cta','providerModelId','usdPerSecond','ratesUsdPerSecond','demoUrl','demoDurationSec','demoAspect']);
const KINDS=new Set(['video','image']);
const CATEGORIES=new Set(['premium-motion','video-create','image']);
const STATUSES=new Set(['active','provider-verified']);
const MOTION_TIERS=new Set(['lite','ultra']);

const bad=(id,why)=>{throw Error(`CATALOG_INVALID[${id||'?'}]: ${why}`)};
const isText=v=>typeof v==='string'&&v.trim().length>0;
const isTextList=v=>Array.isArray(v)&&v.length>0&&v.every(isText);
const isCount=v=>Number.isInteger(v)&&v>=0;
const isRate=v=>Number.isFinite(v)&&v>0;

export function defineModel(model){
 if(!model||typeof model!=='object')bad(null,'declaration must be an object');
 const id=model.id;
 if(!isText(id))bad(null,'id is required');

 for(const key of Object.keys(model))if(!FIELDS.has(key))bad(id,`unknown field "${key}"`);

 if(!KINDS.has(model.kind))bad(id,`kind must be one of ${[...KINDS].join(', ')}`);
 if(!CATEGORIES.has(model.category))bad(id,`category must be one of ${[...CATEGORIES].join(', ')}`);
 if(!STATUSES.has(model.status))bad(id,`status must be one of ${[...STATUSES].join(', ')}`);
 for(const key of ['name','provider','description'])if(!isText(model[key]))bad(id,`${key} is required`);
 if('displayProvider' in model&&!isText(model.displayProvider))bad(id,'displayProvider must be non-empty when present');
 if('cta' in model&&!isText(model.cta))bad(id,'cta must be non-empty when present');

 // What the studio renders its controls from.
 for(const key of ['resolution','modes','aspect'])if(!isTextList(model[key]))bad(id,`${key} must be a non-empty list of strings`);
 if(!isCount(model.refs))bad(id,'refs must be an integer of 0 or more');

 // Duration is a video concept. An image model carrying one would render a
 // length control that means nothing; a video model without one gives
 // creationBrief no duration to resolve.
 if(model.kind==='video'){
  const d=model.duration;
  if(!Array.isArray(d)||d.length!==2)bad(id,'a video model needs duration as [min,max]');
  const [min,max]=d;
  if(!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min)bad(id,`duration [${min}, ${max}] must be whole seconds with 1 <= min <= max`);
 }else if('duration' in model)bad(id,'an image model must not declare duration');

 // Premium tiers are the only priced entries, and the only ones motionProviderEstimate
 // will quote. A resolution offered in the picker with no rate behind it would
 // throw at quote time, in front of the customer.
 if(model.premium===true){
  if(!MOTION_TIERS.has(model.motionModel))bad(id,`a premium model needs motionModel as one of ${[...MOTION_TIERS].join(', ')}`);
  if(!isRate(model.usdPerSecond))bad(id,'usdPerSecond must be a positive number');
  if(!isText(model.providerModelId))bad(id,'a premium model needs providerModelId for routing');
  if(!isText(model.cta))bad(id,'a premium model needs a cta');
  const rates=model.ratesUsdPerSecond;
  if(!rates||typeof rates!=='object')bad(id,'a premium model needs ratesUsdPerSecond');
  for(const res of model.resolution)if(!isRate(rates[res]))bad(id,`ratesUsdPerSecond is missing a positive rate for the offered resolution "${res}"`);
  for(const res of Object.keys(rates))if(!model.resolution.includes(res))bad(id,`ratesUsdPerSecond carries "${res}", which the model does not offer`);
 }else{
  if('premium' in model)bad(id,'premium must be true or omitted');
  for(const key of ['motionModel','usdPerSecond','ratesUsdPerSecond'])if(key in model)bad(id,`${key} belongs to a premium model only`);
 }

 // A demo tile needs all three fields or none: the grid sizes the tile from
 // the aspect and duration before the file loads.
 if('demoUrl' in model){
  if(!isText(model.demoUrl)||!model.demoUrl.startsWith('https://'))bad(id,'demoUrl must be an https URL');
  if(!isRate(model.demoDurationSec))bad(id,'demoUrl needs demoDurationSec');
  if(!isText(model.demoAspect))bad(id,'demoUrl needs demoAspect');
 }else for(const key of ['demoDurationSec','demoAspect'])if(key in model)bad(id,`${key} needs a demoUrl beside it`);

 return model;
}
