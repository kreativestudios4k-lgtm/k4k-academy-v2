// Server-only fal.ai multi-model API contracts. Models are not customer-enabled
// until the authenticated K4K quote, reservation, reconciliation, and asset
// ingestion lifecycle has been extended for these job types.
import {assertResponsiblePrompt} from './fal-wan.mjs';
export const MULTIMODEL_CONTRACTS=Object.freeze({
 'kling-flash-t2v':Object.freeze({endpoint:'kling/v4/flash/text-to-video',kind:'video',rate:0.094,unit:'second',minSeconds:3,maxSeconds:20,resolutions:['720p'],aspects:['16:9','9:16','1:1','21:9'],schema:'prompt,duration,aspect_ratio,resolution'}),
 'seedance-25-t2v':Object.freeze({endpoint:'bytedance/seedance-2.5/us/text-to-video',kind:'video',rate:0.0214,unit:'1000_tokens',minSeconds:4,maxSeconds:30,resolutions:['480p','720p','1080p'],aspects:['16:9','9:16','1:1','4:3','3:4','21:9'],schema:'prompt,duration,aspect_ratio,resolution,generate_audio'}),
 'flux3-t2i':Object.freeze({endpoint:'blackforestlabs/flux-3/text-to-image',kind:'image',rate:0.048,unit:'megapixel',resolutions:['768sq','1k','1.5k','2k','4k'],aspects:['16:9','9:16','1:1','4:3','3:4'],schema:'prompt,aspect_ratio,resolution,output_format'}),
 'nano-banana-21-t2i':Object.freeze({endpoint:'google/nano-banana-2.1',kind:'image',rate:1,unit:'unit',resolutions:['1K','2K','4K'],aspects:['16:9','9:16','1:1','4:3','3:4'],schema:'prompt,aspect_ratio,resolution,output_format,num_images'})
});
const unsafeKeys=new Set(['__proto__','constructor','prototype']);
export function validatedMultimodelRequest(id,raw){
 const model=MULTIMODEL_CONTRACTS[id];if(!model)throw Error('MODEL_NOT_CONFIGURED');
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('INVALID_PROVIDER_INPUT');
 if(typeof raw.prompt!=='string'||!raw.prompt.trim()||raw.prompt.length>6000)throw Error('INVALID_PROMPT');
 assertResponsiblePrompt(raw.prompt);
 if(!model.resolutions.includes(raw.resolution)||!model.aspects.includes(raw.aspect_ratio))throw Error('INVALID_RESOLUTION');
 const allowed=new Set(model.schema.split(','));
 if(Object.keys(raw).some(x=>!allowed.has(x)||unsafeKeys.has(x)))throw Error('INVALID_PROVIDER_INPUT');
 const output={prompt:raw.prompt,aspect_ratio:raw.aspect_ratio,resolution:raw.resolution};
 if(model.kind==='video'){
  if(!Number.isSafeInteger(raw.duration)||raw.duration<model.minSeconds||raw.duration>model.maxSeconds)throw Error('REFERENCE_DURATION_OUT_OF_RANGE');
  output.duration=id==='seedance-25-t2v'?String(raw.duration):raw.duration;
  if(id==='seedance-25-t2v')output.generate_audio=raw.generate_audio!==false;
 }else{
  if(raw.output_format!==undefined&&!['jpeg','png'].includes(raw.output_format))throw Error('INVALID_OUTPUT_TYPE');
  output.output_format=raw.output_format||'png';
  if(id==='nano-banana-21-t2i'){
   if(raw.num_images!==undefined&&raw.num_images!==1)throw Error('INVALID_IMAGE_COUNT');
   output.num_images=1;
  }
 }
 return Object.freeze({endpoint:model.endpoint,kind:model.kind,input:Object.freeze(output)});
}
export function conservativeMultimodelQuote(id,input,{verifiedMaxUsd,estimatedMegapixels}={}){
 const model=MULTIMODEL_CONTRACTS[id];
 validatedMultimodelRequest(id,input);
 if(!model)throw Error('MODEL_NOT_CONFIGURED');
 let usd;
 if(model.unit==='second')usd=model.rate*input.duration;
 else if(model.unit==='unit')usd=model.rate;
 else if(model.unit==='megapixel'){
  // Model pricing is per rendered megapixel. No arbitrary pixel-size
  // conversion is safe; require upstream verified billable MP.
  if(!Number.isFinite(estimatedMegapixels)||estimatedMegapixels<=0||estimatedMegapixels>64)throw Error('PROVIDER_QUOTE_REQUIRED');
  usd=model.rate*estimatedMegapixels;
 }else throw Error('PROVIDER_QUOTE_REQUIRED'); // Seedance token cost is input-dependent.
 usd=Math.ceil(usd*1000000)/1000000;
 if(!Number.isFinite(verifiedMaxUsd)||verifiedMaxUsd<=0||verifiedMaxUsd>5||usd>verifiedMaxUsd)throw Error('PROVIDER_BUDGET_BLOCKED');
 return Object.freeze({usd,endpoint:model.endpoint,unit:model.unit,verifiedRateCard:false});
}
export function multimodelActivationStatus(id,env=process.env){
 const model=MULTIMODEL_CONTRACTS[id];if(!model)throw Error('MODEL_NOT_CONFIGURED');
 const preview=env.VERCEL_ENV==='preview'&&env.K4K_MULTIMODEL_PREVIEW==='true';
 const auth=typeof env.FAL_KEY==='string'&&!!env.FAL_KEY.trim();
 const creditPipeline=env.K4K_MULTIMODEL_CREDIT_LEDGER_VERIFIED==='true';
 const outputPipeline=env.K4K_MULTIMODEL_OUTPUT_INGESTION_VERIFIED==='true';
 const rateCard=env.K4K_MULTIMODEL_RATE_CARD_VERIFIED==='true';
 return Object.freeze({model:id,contractVerified:true,previewAllowed:preview&&auth,customerEnabled:false,
  blockers:[...(!preview?['PREVIEW_PILOT_DISABLED']:[]),...(!auth?['FAL_CREDENTIAL_MISSING']:[]),
   ...(!creditPipeline?['CREDIT_PIPELINE_PENDING']:[]),...(!outputPipeline?['OUTPUT_INGESTION_PENDING']:[]),
   ...(!rateCard?['RATE_CARD_PENDING']:[])]});
}
