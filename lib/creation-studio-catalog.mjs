// K4K's public model discovery catalog. Model appearance does not imply enabled paid API access.
// Entries mirror models actually discovered in the connected Higgsfield catalog on 2026-11-16.
// Do NOT infer Higgsfield REST paths from these model IDs; use official model-specific docs.
export const CREATION_MODELS=Object.freeze([
 // Premium K4K Motion is available through the separately gated, signed-credit Director route.
 // K4K Motion is the customer-facing name for both tiers. Keep the upstream vendor and
 // its model names out of every customer-visible field here: name, provider, description.
 // providerModelId stays, because routing needs it and customers never see it.
 {id:'k4k-motion-lite',demoUrl:'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/24559df4-f9e6-406b-ba15-f7bdacfba6fc.mp4',demoDurationSec:7,demoAspect:'16:9',name:'K4K Motion Lite',provider:'K4K Motion',kind:'video',category:'premium-motion',description:'First 15 seconds of your source · preserves original audio · lower credit cost',status:'active',duration:[4,30],resolution:['480p','720p','1080p'],refs:8,modes:['Motion transfer'],aspect:['source'],premium:true,motionModel:'lite',cta:'/k4k-app/motion?model=lite',providerModelId:'higgsfield/genjutsu-light/motion-transfer/v1.0',usdPerSecond:0.0739,ratesUsdPerSecond:{'480p':0.0739,'720p':0.1471,'1080p':0.2936}},
 {id:'k4k-motion-ultra',demoUrl:'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/b7002873-323b-4c9c-b7e2-b869f9307a2a.mp4',demoDurationSec:6,demoAspect:'9:16',name:'K4K Motion Pro',provider:'K4K Motion',kind:'video',category:'premium-motion',description:'Full motion transfer · 4–30-second source · premium detail',status:'active',duration:[4,30],resolution:['480p','720p','1080p'],refs:8,modes:['Motion transfer'],aspect:['source'],premium:true,motionModel:'ultra',cta:'/k4k-app/motion?model=ultra',providerModelId:'higgsfield/genjutsu/motion-transfer/v1.0',usdPerSecond:0.154,ratesUsdPerSecond:{'480p':0.154,'720p':0.3446,'1080p':0.8346}},
 // Existing customer generation remains fal/Wan, now grouped as a standard video model.
 {id:'wan-prime',demoUrl:'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/e65c2d3c-9d38-4c81-b737-d955819b794c.mp4',demoDurationSec:5,demoAspect:'16:9',name:'Wan 3',provider:'Wan 3.0 Prime via fal.ai',kind:'video',category:'video-create',description:'Create and remix reference-led videos with your chosen character photos · Wan-powered',status:'active',duration:[2,15],resolution:['720p'],refs:8,modes:['Reference video'],aspect:['source'],cta:'/k4k-app/creator'},
 {id:'seedance_2_5',demoUrl:'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/30f0a8e3-976f-40f8-9baf-17301d2fe35d.mp4',demoDurationSec:5,demoAspect:'16:9',name:'Seedance 2.5',provider:'Bytedance',kind:'video',category:'video-create',description:'Live text-to-video · 5 seconds · 480p · no generated audio · 20 credits',status:'provider-verified',duration:[5,5],resolution:['480p'],refs:0,modes:['Text to video'],aspect:['9:16','16:9','1:1']},
 {id:'seedance_2_5_flash',demoUrl:'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/83bc6bb4-2f04-4df6-98c5-4e8bb2b31bca.mp4',demoDurationSec:7,demoAspect:'16:9',name:'Seedance 2.5 Flash',provider:'Bytedance',kind:'video',category:'video-create',description:'Faster reference video and editing workflows',status:'provider-verified',duration:[4,30],resolution:['480p','720p'],refs:10,modes:['Text to video','Omni-reference','Video edit','Extend'],aspect:['9:16','16:9','1:1']},
 {id:'kling4_0',name:'Kling 4.0',provider:'Kling',kind:'video',category:'video-create',description:'Live text-to-video · 5 seconds · 720p · 12 credits',status:'provider-verified',duration:[5,5],resolution:['720p'],refs:0,modes:['Text to video'],aspect:['9:16','16:9','1:1']},
 {id:'kling4_hf',name:'K4K Cinema',provider:'Higgsfield',displayProvider:'Powered by Kling 4.0',kind:'video',category:'video-create',demoUrl:'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOy5W2p4yZzTs2NXN4l8PDBwQY/42c52fd5-5fbe-48d8-afcf-3c61ed838d2f.mp4',demoDurationSec:7,demoAspect:'16:9',description:'Cinematic text-to-video · powered by Kling 4.0 · 3–30 seconds · 720p or 1080p. Reference media is not yet supported in this workflow.',status:'provider-verified',duration:[3,30],resolution:['720p','1080p'],refs:0,modes:['Text to video'],aspect:['9:16','16:9','1:1','21:9']},
 {id:'kling_4_0_flash',name:'Kling 4.0 Flash',provider:'Kling',kind:'video',category:'video-create',description:'Fast 720p image animation and reference editing',status:'provider-verified',duration:[3,20],resolution:['720p'],refs:10,modes:['Text to video','Image to video','Reference to video','Video edit'],aspect:['9:16','16:9','1:1']},
 {id:'nano_banana_2',name:'Nano Banana 2.1',provider:'Google',kind:'image',category:'image',description:'Live text-to-image · one 1K PNG · 15 credits',status:'provider-verified',resolution:['1K'],refs:0,modes:['Text to image'],aspect:['9:16','16:9','1:1','4:3','3:4']},
 {id:'flux_3_image',name:'FLUX 3 Image',provider:'Black Forest Labs',kind:'image',category:'image',description:'Live text-to-image · one 1K JPEG · 3 credits',status:'provider-verified',resolution:['1K'],refs:0,modes:['Text to image'],aspect:['9:16','16:9','1:1','4:3','3:4']},
 {id:'gpt_image_2_6',name:'GPT Image 2.6',provider:'OpenAI',kind:'image',category:'image',description:'Photorealistic images, text rendering and edits',status:'provider-verified',resolution:['1K','2K','4K'],refs:16,modes:['Text to image','Image edit'],aspect:['9:16','16:9','1:1','4:3','3:4']},
 {id:'kling_omni_image',name:'Kling O1 Image',provider:'Kling',kind:'image',category:'image',description:'Image generation and guided visual editing',status:'provider-verified',resolution:['1k','2k'],refs:10,modes:['Image edit'],aspect:['9:16','16:9','1:1','4:3','3:4']}
]);
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
