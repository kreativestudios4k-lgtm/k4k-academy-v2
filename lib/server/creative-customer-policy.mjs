// Customer model release policy. Default closed and independent of K4K Motion and owner QA.
export const CUSTOMER_CREATIVE_MODELS=Object.freeze({
 // Public beta: 5s 480p silent video. fal.ai invoices by generated tokens.
 // Quote is K4K's fixed 20-credit customer price / $2 risk reservation,
 // not a guaranteed or measured provider charge.
 seedance_2_5:Object.freeze({dbModel:'seedance-25-t2v',endpoint:'bytedance/seedance-2.5/us/text-to-video',kind:'video',mime:'video/mp4',bucket:'studio-generations',quoteUsdMicros:2000000,duration:5,providerBilling:'variable-tokens-public-beta',
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,duration:'5',resolution:'480p',generate_audio:false,draft:false})}),
 kling4_0:Object.freeze({dbModel:'kling-4-t2v',endpoint:'kling/v4/text-to-video',kind:'video',mime:'video/mp4',bucket:'studio-generations',quoteUsdMicros:1200000,duration:5,
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,duration:5,resolution:'720p'})}),
 // Separate Higgsfield Kling 4.0 endpoint: never silently replace the existing fal.ai Kling flow.
 kling4_hf:Object.freeze({provider:'higgsfield',dbModel:'kling-4-hf-t2v',endpoint:'kling-video/v4.0/text-to-video',kind:'video',mime:'video/mp4',bucket:'studio-generations',
  pricingUsdMicrosPerSecond:Object.freeze({'720p':125700,'1080p':187900}),minDuration:3,maxDuration:30,
  aspects:Object.freeze(['21:9','16:9','9:16','1:1']),
  input:(prompt,aspect,selection)=>({prompt,aspect_ratio:aspect,duration:selection.duration,resolution:selection.resolution})}),
 nano_banana_2:Object.freeze({dbModel:'nano-banana-21-t2i',endpoint:'google/nano-banana-2.1',kind:'image',mime:'image/png',bucket:'studio-customer-images',quoteUsdMicros:1500000,
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,resolution:'1K',num_images:1,output_format:'png',limit_generations:true,enable_web_search:false,safety_tolerance:'3'})}),
 flux_3_image:Object.freeze({dbModel:'flux3-t2i',endpoint:'blackforestlabs/flux-3/text-to-image',kind:'image',mime:'image/jpeg',bucket:'studio-customer-images',quoteUsdMicros:300000,
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,resolution:'1k',output_format:'jpeg',enable_prompt_expansion:false})})
});
export const creativeCustomerRelease=(env=process.env,modelId,userId=null)=>{
 if(!Object.hasOwn(CUSTOMER_CREATIVE_MODELS,modelId))return false;
 const isOwner=userId==='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
 const isSeedance=modelId==='seedance_2_5';
 const isHiggsfieldKling=modelId==='kling4_hf';
 const higgsfieldOwnerPreview=isHiggsfieldKling&&isOwner&&env.VERCEL_ENV==='preview'&&env.K4K_KLING_HIGGSFIELD_PREVIEW_ENABLED==='true';
 if(isHiggsfieldKling&&(env.K4K_KLING_HIGGSFIELD_RATE_APPROVED!=='true'||(!higgsfieldOwnerPreview&&env.K4K_KLING_HIGGSFIELD_PUBLIC_ENABLED!=='true')))return false;
 const ownerOnly=env.K4K_CREATIVE_OWNER_PILOT_ONLY!=='false';
 // Seedance requires its own deliberate public switch and existing public wallet
 // approval. Turning it off never disables the other three customer models.
 const publicSeedance=isSeedance&&env.K4K_SEEDANCE_PUBLIC_ENABLED==='true';
 if(isSeedance&&!publicSeedance&&(!isOwner||env.K4K_SEEDANCE_OWNER_PILOT_APPROVED!=='true'))return false;
 if(ownerOnly&&!isOwner)return false;
 const ledgerReady=ownerOnly
  ?isOwner&&env.K4K_CREATIVE_OWNER_LEDGER_QA_ISOLATED==='true'
  :env.K4K_CREATIVE_PUBLIC_LEDGER_APPROVED==='true';
 if(publicSeedance&&env.K4K_SEEDANCE_PUBLIC_PRICE_APPROVED!=='true')return false;
 return ledgerReady&&env.K4K_CREATIVE_CUSTOMER_ENABLED==='true'&&
 env.K4K_CREATIVE_CUSTOMER_PRICE_APPROVED==='true'&&
 env.K4K_ENABLE_PRODUCTION_GENERATION==='true'&&
 env.K4K_PROVIDER_USE_APPROVED==='true'&&
 env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED==='true'&&
 (env.VERCEL_ENV==='production'||higgsfieldOwnerPreview)&&
 String(env.K4K_CREATIVE_CUSTOMER_MODELS||'').split(',').map(x=>x.trim()).includes(modelId);
};
export function creativeCustomerQuote(modelId,env=process.env,userId=null,selection={}){
 if(!creativeCustomerRelease(env,modelId,userId))throw Error('CREATIVE_MODEL_NOT_LIVE');
 const model=CUSTOMER_CREATIVE_MODELS[modelId];
 let selected=model;
 if(modelId==='kling4_hf'){
  const {duration,resolution}=selection;
  if(!Number.isSafeInteger(duration)||duration<model.minDuration||duration>model.maxDuration||
     !Object.hasOwn(model.pricingUsdMicrosPerSecond,resolution))throw Error('INVALID_INPUT');
  selected=Object.freeze({...model,duration,resolution,quoteUsdMicros:model.pricingUsdMicrosPerSecond[resolution]*duration});
 }
 const max=Number(env.K4K_GENERATION_MAX_USD);
 if(!Number.isFinite(max)||max<=0||max>5||selected.quoteUsdMicros>Math.round(max*1000000))throw Error('PROVIDER_BUDGET_BLOCKED');
 return selected;
}
