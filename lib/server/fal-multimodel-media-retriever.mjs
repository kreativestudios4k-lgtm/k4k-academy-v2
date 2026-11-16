// Bounded, non-redirecting download from a validated authenticated fal result.
// No customer URL, private-network host, cookies or credentials accepted.
import {verifyGenerationOutputBytes} from './generation-output-ingestion.mjs';
import {parseFalMultimodelOutput} from './fal-multimodel-media.mjs';
export function createFalMultimodelMediaRetriever({fetchImpl=fetch,enabled=false,allowedHosts}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return async function retrieve({model,authenticatedResult}={}){
  if(!enabled)throw Error('MULTIMODEL_MEDIA_RETRIEVAL_DISABLED');
  if(typeof fetchImpl!=='function')throw Error('PROVIDER_MEDIA_UNAVAILABLE');
  const media=parseFalMultimodelOutput(model,authenticatedResult,{allowedHosts});
  let response;
  try{response=await fetchImpl(media.url,{method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});}
  catch{throw Error('PROVIDER_MEDIA_REQUEST_FAILED');}
  if(!response?.ok||!response.body?.getReader)throw Error('PROVIDER_MEDIA_REQUEST_FAILED');
  const mime=(response.headers?.get('content-type')??'').split(';')[0].trim().toLowerCase();
  if(mime!==media.contentType)throw Error('INVALID_PROVIDER_MEDIA_TYPE');
  const length=response.headers?.get('content-length');
  if(length!==null&&length!==undefined){
   if(!/^\d+$/.test(length))throw Error('INVALID_PROVIDER_MEDIA_SIZE');
   const n=Number(length);
   if(!Number.isSafeInteger(n)||n<1024||n>media.maxBytes||(media.fileSize!==undefined&&media.fileSize!==n))
    throw Error('INVALID_PROVIDER_MEDIA_SIZE');
  }
  const reader=response.body.getReader(),parts=[];
  let size=0;
  try{
   while(true){
    const {done,value}=await reader.read();
    if(done)break;
    if(!(value instanceof Uint8Array))throw Error('INVALID_PROVIDER_MEDIA');
    size+=value.byteLength;
    if(size>media.maxBytes)throw Error('PROVIDER_MEDIA_TOO_LARGE');
    parts.push(value);
   }
  }catch{await reader.cancel().catch(()=>{});throw Error('PROVIDER_MEDIA_REQUEST_FAILED');}
  if(media.fileSize!==undefined&&size!==media.fileSize)throw Error('INVALID_PROVIDER_MEDIA_SIZE');
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  verifyGenerationOutputBytes(bytes,media.contentType);
  return Object.freeze({bytes,contentType:media.contentType});
 };
}
