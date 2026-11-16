// K4K's public model discovery catalog. Model appearance does not imply enabled paid API access.
// Entries mirror models actually discovered in the connected Higgsfield catalog on 2026-11-16.
// Do NOT infer Higgsfield REST paths from these model IDs; use official model-specific docs.
export const CREATION_MODELS=Object.freeze([
 {id:'wan-prime',name:'Wan 3.0 Prime',provider:'fal.ai',kind:'video',category:'video-edit',description:'Reference-driven motion and character replacement',status:'active',duration:[2,15],resolution:['720p'],refs:8,modes:['Reference video'],aspect:['9:16','16:9','1:1'],cta:'/k4k-app/creator'},
 {id:'genjutsu',name:'Genjutsu Motion',provider:'Higgsfield',kind:'video',category:'video-edit',description:'Recast a scene with 1–8 image references while preserving motion',status:'api-pilot',duration:[4,30],resolution:['480p','720p','1080p'],refs:8,modes:['Motion transfer'],aspect:['source']},
 {id:'seedance_2_5',name:'Seedance 2.5',provider:'Bytedance',kind:'video',category:'video-create',description:'Text, omni-reference, video editing and extension',status:'integration-pending',duration:[4,30],resolution:['480p','720p','1080p','4k'],refs:30,modes:['Text to video','Omni-reference','Video edit','Extend'],aspect:['9:16','16:9','1:1','4:3','3:4','21:9']},
 {id:'seedance_2_5_flash',name:'Seedance 2.5 Flash',provider:'Bytedance',kind:'video',category:'video-create',description:'Faster reference video and editing workflows',status:'integration-pending',duration:[4,30],resolution:['480p','720p'],refs:10,modes:['Text to video','Omni-reference','Video edit','Extend'],aspect:['9:16','16:9','1:1']},
 {id:'kling4_0',name:'Kling 4.0',provider:'Kling',kind:'video',category:'video-create',description:'Create with text, ordered keyframes and video references',status:'integration-pending',duration:[3,30],resolution:['720p','1080p'],refs:10,modes:['Text to video','Image to video','Reference to video','Video edit'],aspect:['9:16','16:9','1:1','21:9']},
 {id:'kling_4_0_flash',name:'Kling 4.0 Flash',provider:'Kling',kind:'video',category:'video-create',description:'Fast 720p image animation and reference editing',status:'integration-pending',duration:[3,20],resolution:['720p'],refs:10,modes:['Text to video','Image to video','Reference to video','Video edit'],aspect:['9:16','16:9','1:1']},
 {id:'nano_banana_2',name:'Nano Banana 2',provider:'Google',kind:'image',category:'image',description:'Photorealistic image creation and edits with references',status:'integration-pending',resolution:['1k','2k','4k'],refs:14,modes:['Text to image','Image edit'],aspect:['9:16','16:9','1:1','4:3','3:4']},
 {id:'flux_3_image',name:'FLUX 3 Image',provider:'Black Forest Labs',kind:'image',category:'image',description:'High-quality image generation with up to 10 references',status:'integration-pending',resolution:['1k','2k','4k'],refs:10,modes:['Text to image','Image edit'],aspect:['9:16','16:9','1:1','4:3','3:4']},
 {id:'gpt_image_2_6',name:'GPT Image 2.6',provider:'OpenAI',kind:'image',category:'image',description:'Photorealistic images, text rendering and edits',status:'integration-pending',resolution:['1k','2k','4k'],refs:16,modes:['Text to image','Image edit'],aspect:['9:16','16:9','1:1','4:3','3:4']},
 {id:'kling_omni_image',name:'Kling O1 Image',provider:'Kling',kind:'image',category:'image',description:'Image generation and guided visual editing',status:'integration-pending',resolution:['1k','2k'],refs:10,modes:['Text to image','Image edit'],aspect:['9:16','16:9','1:1','4:3','3:4']}
]);
export function creationModels(kind){return CREATION_MODELS.filter(x=>x.kind===kind)}
export function creationBrief(model,options={}){
 if(!model||!CREATION_MODELS.some(x=>x.id===model.id))throw Error('MODEL_UNSUPPORTED');
 const prompt=String(options.prompt||'').trim().slice(0,10000);
 if(!prompt)throw Error('PROMPT_REQUIRED');
 const mode=model.modes.includes(options.mode)?options.mode:model.modes[0];
 const resolution=model.resolution.includes(options.resolution)?options.resolution:model.resolution[0];
 const aspect=model.aspect.includes(options.aspect)?options.aspect:model.aspect[0];
 const duration=model.duration?Math.min(model.duration[1],Math.max(model.duration[0],Math.round(Number(options.duration)||model.duration[0]))):undefined;
 const references=Math.min(model.refs,Math.max(0,Number(options.references)||0));
 return ['K4K APP · Creative brief','Model: '+model.name,'Provider: '+model.provider,'Workflow: '+mode,'Resolution: '+resolution,'Aspect: '+aspect,...(duration?['Duration: '+duration+'s']:[]),'Reference images: '+references,'Creative direction:',prompt].join('\n');
}
