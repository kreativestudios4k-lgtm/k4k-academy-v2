// Server-only parser for authenticated fal queue RESULT payloads.
// Parsing a provider result alone does NOT authenticate arbitrary URLs.
import {MULTIMODEL_CONTRACTS} from './fal-multimodel-contracts.mjs';
const MIME=new Set(['image/jpeg','image/png']);
const SAFE_HOSTS=new Set(['v3b.fal.media','storage.googleapis.com']);
function validatedProviderUrl(value,allowedHosts=SAFE_HOSTS){
 let url;try{url=new URL(value);}catch{throw Error('INVALID_PROVIDER_MEDIA_URL');}
 if(url.protocol!=='https:'||!allowedHosts.has(url.hostname)||url.username||url.password||url.port||url.hash)
  throw Error('UNTRUSTED_PROVIDER_MEDIA_HOST');
 // Public GCS is a shared host; only the documented falserverless bucket is allowed.
 if(url.hostname==='storage.googleapis.com'&&!url.pathname.startsWith('/falserverless/'))
  throw Error('UNTRUSTED_PROVIDER_MEDIA_PATH');
 if(!url.pathname.startsWith('/')||url.pathname.includes('..'))throw Error('UNTRUSTED_PROVIDER_MEDIA_PATH');
 return url.href;
}
export function parseFalMultimodelOutput(model,result,{allowedHosts}={}){
 const config=MULTIMODEL_CONTRACTS[model];
 if(!config)throw Error('MODEL_NOT_CONFIGURED');
 if(!result||typeof result!=='object'||Array.isArray(result)||result.error||result.error_type)
  throw Error('INVALID_PROVIDER_RESULT');
 const file=config.kind==='video'
  ?result.video
  :(Array.isArray(result.images)&&result.images.length===1?result.images[0]:null);
 if(!file||typeof file!=='object'||Array.isArray(file))throw Error('INVALID_PROVIDER_RESULT');
 const inferred=config.kind==='video'?'video/mp4':null;
 const mime=file.content_type??inferred;
 if(config.kind==='video'&&mime!=='video/mp4')throw Error('INVALID_PROVIDER_MEDIA_TYPE');
 if(config.kind==='image'&&!MIME.has(mime))throw Error('INVALID_PROVIDER_MEDIA_TYPE');
 const limit=config.kind==='video'?100*1024*1024:20*1024*1024;
 const fileSize=file.file_size;
 if(fileSize!==undefined&&(!Number.isSafeInteger(fileSize)||fileSize<1024||fileSize>limit))
  throw Error('INVALID_PROVIDER_MEDIA_SIZE');
 const hosts=allowedHosts===undefined?SAFE_HOSTS:new Set(allowedHosts);
 if(hosts.size===0)throw Error('UNTRUSTED_PROVIDER_MEDIA_HOST');
 const url=validatedProviderUrl(file.url,hosts);
 return Object.freeze({url,contentType:mime,maxBytes:limit,...(fileSize!==undefined?{fileSize}:{})});
}
