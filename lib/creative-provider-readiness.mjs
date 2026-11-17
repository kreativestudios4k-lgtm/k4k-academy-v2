// Verified fal.ai endpoint identifiers, separated from customer dispatch permissions.
// These IDs are model catalog facts, NOT an authorization to spend provider funds.
export const VERIFIED_CREATIVE_MODELS=Object.freeze({
 seedance_2_5:{provider:'fal',media:'video',endpoints:{'Text to video':'bytedance/seedance-2.5/us/text-to-video','Omni-reference':'bytedance/seedance-2.5/us/reference-to-video','Video edit':'bytedance/seedance-2.5/us/reference-to-video','Extend':'bytedance/seedance-2.5/us/reference-to-video'},pricing:{unit:'1000 tokens',usd:0.0214,estimate:'unverified-token-usage'}},
 seedance_2_5_flash:{provider:'fal',media:'video',endpoints:{'Text to video':'bytedance/seedance-2.5/flash/text-to-video','Omni-reference':'bytedance/seedance-2.5/flash/reference-to-video','Video edit':'bytedance/seedance-2.5/flash/reference-to-video','Extend':'bytedance/seedance-2.5/flash/reference-to-video'},pricing:null},
 kling4_0:{provider:'fal',media:'video',endpoints:{'Text to video':'kling/v4/text-to-video','Image to video':'kling/v4/image-to-video','Reference to video':'kling/v4/reference-to-video','Video edit':'kling/v4/video-to-video/edit'},pricing:{unit:'seconds',usd:0.157,estimate:'rate-reference-only'}},
 kling_4_0_flash:{provider:'fal',media:'video',endpoints:{'Text to video':'kling/v4/flash/text-to-video','Image to video':'kling/v4/flash/image-to-video','Reference to video':'kling/v4/flash/reference-to-video','Video edit':'kling/v4/flash/video-to-video'},pricing:null},
 nano_banana_2:{provider:'fal',media:'image',endpoints:{'Text to image':'google/nano-banana-2.1','Image edit':'google/nano-banana-2.1/edit'},pricing:{unit:'units',usd:1,estimate:'rate-reference-only'}},
 flux_3_image:{provider:'fal',media:'image',endpoints:{'Text to image':'blackforestlabs/flux-3/text-to-image','Image edit':'blackforestlabs/flux-3/edit-image'},pricing:{unit:'megapixels',usd:0.048,estimate:'rate-reference-only'}},
 gpt_image_2_6:{provider:'fal',media:'image',endpoints:{'Text to image':'openai/gpt-image-2.6/flare/text-to-image','Image edit':'openai/gpt-image-2.6/flare/edit'},pricing:null},
 kling_omni_image:{provider:'fal',media:'image',endpoints:{'Image edit':'fal-ai/kling-image/o1'},pricing:null}
});
export function creativeModelReadiness(modelId,mode){
 const model=VERIFIED_CREATIVE_MODELS[modelId];
 if(!model)return {status:'unmapped',canGenerate:false};
 const endpoint=model.endpoints[mode];
 if(!endpoint)return {status:'unsupported-mode',canGenerate:false};
 return {status:'provider-endpoint-verified',endpoint,provider:model.provider,media:model.media,pricing:model.pricing,canGenerate:false,requires:['production-provider-credentials','verified-output-storage','atomic-credit-reservation','failure-refunds','per-model-price-and-budget-approval','signed-customer-quote','end-to-end-test']};
}
