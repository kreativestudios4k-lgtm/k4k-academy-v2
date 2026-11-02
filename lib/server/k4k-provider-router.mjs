// Preview-only server adapter. Build verified provider requests without submitting.
 // The customer-facing names remain K4K only; pricing/reservation is handled by
 // server policy before this adapter may ever be called.
const HOST = 'https://api.higgsfield.ai';
export const PROVIDER_MODELS = Object.freeze({
 create:{label:'K4K Create',path:'alibaba/wan-3.0-prime/reference-to-video'},
 lite:{label:'K4K Motion Lite',path:'higgsfield/genjutsu-light/motion-transfer/v1.0'},
 pro:{label:'K4K Motion Pro',path:'higgsfield/genjutsu/motion-transfer/v1.0'}
});
function checkedUrl(value, allowedOrigins) {
 if(typeof value!=='string') throw new Error('Invalid media URL');
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||u.hash||!allowedOrigins.includes(u.origin))
  throw new Error('Media origin not trusted');
 return u.href;
}
export function buildK4KProviderRequest({model,videoUrls,imageUrls,prompt,durationSeconds,allowedMediaOrigins}) {
 if(!Object.hasOwn(PROVIDER_MODELS,model)) throw new Error('Unsupported K4K model');
 if(!Array.isArray(allowedMediaOrigins)||!allowedMediaOrigins.length) throw new Error('Trusted origins required');
 if(typeof prompt!=='string'||prompt.length>1200||!prompt.trim()) throw new Error('Invalid prompt');
 if(!Array.isArray(imageUrls)||imageUrls.length<1||imageUrls.length>8) throw new Error('Provide 1-8 reference images');
 if(!Array.isArray(videoUrls)||videoUrls.length!==1) throw new Error('Exactly one source video required for preview');
 const images=imageUrls.map(u=>checkedUrl(u,allowedMediaOrigins));
 const source=checkedUrl(videoUrls[0],allowedMediaOrigins);
 const item=PROVIDER_MODELS[model];
 // Trusted server media inspection is mandatory. Never trust browser duration.
 if(!Number.isInteger(durationSeconds)||durationSeconds<2||durationSeconds>10) throw new Error('Inspected duration 2-10s required');
 if(model==='create') {
  return Object.freeze({url:HOST+'/'+item.path,model,body:Object.freeze({
   prompt:prompt.trim(),image_urls:images,video_urls:[source],duration:durationSeconds,
   resolution:'720p',aspect_ratio:'adaptive',generate_audio:false,enable_thinking:false
  })});
 }
 if(durationSeconds<4) throw new Error('Motion source must be at least 4s');
 return Object.freeze({url:HOST+'/'+item.path,model,body:Object.freeze({
  video_url:source,image_urls:images,prompt:prompt.trim(),resolution:'720p'
 })});
}
// This module does NOT call fetch and cannot charge the Higgsfield account.
// Paid submissions require the reviewed atomic ledger and explicit feature activation.
