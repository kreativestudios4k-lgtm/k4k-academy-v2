// Customer model release policy. Default closed and independent of K4K Motion and owner QA.
export const CUSTOMER_CREATIVE_MODELS=Object.freeze({
 // Founder-only pilot: 5s 480p no-audio Seedance is token billed. The credit
 // reservation below is a controlled pilot price, NOT an actual provider quote.
 seedance_2_5:Object.freeze({dbModel:'seedance-25-t2v',endpoint:'bytedance/seedance-2.5/us/text-to-video',kind:'video',mime:'video/mp4',bucket:'studio-generations',quoteUsdMicros:2000000,duration:5,providerBilling:'variable-tokens-owner-pilot',
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,duration:'5',resolution:'480p',generate_audio:false,draft:false})}),
 kling4_0:Object.freeze({dbModel:'kling-4-t2v',endpoint:'kling/v4/text-to-video',kind:'video',mime:'video/mp4',bucket:'studio-generations',quoteUsdMicros:1200000,duration:5,
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,duration:5,resolution:'720p'})}),
 nano_banana_2:Object.freeze({dbModel:'nano-banana-21-t2i',endpoint:'google/nano-banana-2.1',kind:'image',mime:'image/png',bucket:'studio-customer-images',quoteUsdMicros:1500000,
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,resolution:'1K',num_images:1,output_format:'png',limit_generations:true,enable_web_search:false,safety_tolerance:'3'})}),
 flux_3_image:Object.freeze({dbModel:'flux3-t2i',endpoint:'blackforestlabs/flux-3/text-to-image',kind:'image',mime:'image/jpeg',bucket:'studio-customer-images',quoteUsdMicros:300000,
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,resolution:'1k',output_format:'jpeg',enable_prompt_expansion:false})})
});
export const creativeCustomerRelease=(env=process.env,modelId,userId=null)=>{
 if(!Object.hasOwn(CUSTOMER_CREATIVE_MODELS,modelId))return false;
 const isOwner=userId==='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
 const isSeedance=modelId==='seedance_2_5';
 const ownerOnly=env.K4K_CREATIVE_OWNER_PILOT_ONLY!=='false';
 // Public unlock applies ONLY to the three individually approved fixed-output models.
 // Seedance stays restricted to the founder regardless of the public rollout switch.
 if(isSeedance&&(!isOwner||env.K4K_SEEDANCE_OWNER_PILOT_APPROVED!=='true'))return false;
 if(ownerOnly&&!isOwner)return false;
 const ledgerReady=isSeedance
  ?isOwner&&env.K4K_CREATIVE_OWNER_LEDGER_QA_ISOLATED==='true'
  :ownerOnly
   ?isOwner&&env.K4K_CREATIVE_OWNER_LEDGER_QA_ISOLATED==='true'
   :env.K4K_CREATIVE_PUBLIC_LEDGER_APPROVED==='true';
 return ledgerReady&&env.K4K_CREATIVE_CUSTOMER_ENABLED==='true'&&
 env.K4K_CREATIVE_CUSTOMER_PRICE_APPROVED==='true'&&
 env.K4K_ENABLE_PRODUCTION_GENERATION==='true'&&
 env.K4K_PROVIDER_USE_APPROVED==='true'&&
 env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED==='true'&&
 env.VERCEL_ENV==='production'&&
 String(env.K4K_CREATIVE_CUSTOMER_MODELS||'').split(',').map(x=>x.trim()).includes(modelId);
};
export function creativeCustomerQuote(modelId,env=process.env,userId=null){
 if(!creativeCustomerRelease(env,modelId,userId))throw Error('CREATIVE_MODEL_NOT_LIVE');
 const model=CUSTOMER_CREATIVE_MODELS[modelId];
 const max=Number(env.K4K_GENERATION_MAX_USD);
 if(!Number.isFinite(max)||max<=0||max>5||model.quoteUsdMicros>Math.round(max*1000000))throw Error('PROVIDER_BUDGET_BLOCKED');
 return model;
}
