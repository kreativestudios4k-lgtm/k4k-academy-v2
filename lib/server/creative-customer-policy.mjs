// Customer model release policy. Default closed and independent of K4K Motion and owner QA.
export const CUSTOMER_CREATIVE_MODELS=Object.freeze({
 kling4_0:Object.freeze({dbModel:'kling-4-t2v',endpoint:'kling/v4/text-to-video',kind:'video',mime:'video/mp4',bucket:'studio-generations',quoteUsdMicros:1200000,duration:5,
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,duration:5,resolution:'720p'})}),
 nano_banana_2:Object.freeze({dbModel:'nano-banana-21-t2i',endpoint:'google/nano-banana-2.1',kind:'image',mime:'image/png',bucket:'studio-customer-images',quoteUsdMicros:1500000,
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,resolution:'1K',num_images:1,limit_generations:true,enable_web_search:false})}),
 flux_3_image:Object.freeze({dbModel:'flux3-t2i',endpoint:'blackforestlabs/flux-3/text-to-image',kind:'image',mime:'image/jpeg',bucket:'studio-customer-images',quoteUsdMicros:300000,
  input:(prompt,aspect)=>({prompt,aspect_ratio:aspect,resolution:'1k',output_format:'jpeg',enable_prompt_expansion:false})})
});
export const creativeCustomerRelease=(env=process.env,modelId)=>{
 if(!Object.hasOwn(CUSTOMER_CREATIVE_MODELS,modelId))return false;
 return env.K4K_CREATIVE_CUSTOMER_ENABLED==='true'&&env.K4K_CREATIVE_CUSTOMER_PRICE_APPROVED==='true'&&
 env.K4K_ENABLE_PRODUCTION_GENERATION==='true'&&env.K4K_PROVIDER_USE_APPROVED==='true'&&
 env.K4K_LIVE_CREDIT_ISOLATION_READY==='true'&&env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED==='true'&&
 env.VERCEL_ENV==='production'&&
 String(env.K4K_CREATIVE_CUSTOMER_MODELS||'').split(',').map(x=>x.trim()).includes(modelId);
};
export function creativeCustomerQuote(modelId,env=process.env){
 if(!creativeCustomerRelease(env,modelId))throw Error('CREATIVE_MODEL_NOT_LIVE');
 const model=CUSTOMER_CREATIVE_MODELS[modelId];
 const max=Number(env.K4K_GENERATION_MAX_USD);
 if(!Number.isFinite(max)||max<=0||max>5||model.quoteUsdMicros>Math.round(max*1000000))throw Error('PROVIDER_BUDGET_BLOCKED');
 return model;
}
