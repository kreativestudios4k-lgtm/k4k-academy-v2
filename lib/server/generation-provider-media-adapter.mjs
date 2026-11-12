// Server-only authenticated provider media retrieval boundary.
// An injected trusted provider client must retrieve the bytes using providerJobId.
// This module deliberately never fetches a URL returned by a provider or browser.
export function createGenerationProviderMediaAdapter({download,enabled=false,maxBytes=100*1024*1024}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return async function retrieve({providerJobId,verifiedStatus}={}){
  if(!enabled)throw Error('PROVIDER_MEDIA_DISABLED');
  if(verifiedStatus?.providerJobId!==providerJobId||verifiedStatus?.status!=='completed')throw Error('UNVERIFIED_PROVIDER_COMPLETION');
  if(typeof providerJobId!=='string'||!providerJobId.trim()||providerJobId.length>256)throw Error('INVALID_PROVIDER_JOB_ID');
  if(typeof download!=='function')throw Error('PROVIDER_DOWNLOAD_UNAVAILABLE');
  const result=await download({providerJobId,maxBytes});
  if(!result||result.contentType!=='video/mp4'||!(result.bytes instanceof Uint8Array))throw Error('INVALID_PROVIDER_MEDIA');
  const bytes=result.bytes;
  if(bytes.byteLength<1024||bytes.byteLength>maxBytes)throw Error('INVALID_PROVIDER_MEDIA_SIZE');
  if(String.fromCharCode(...bytes.subarray(4,8))!=='ftyp')throw Error('INVALID_MP4_HEADER');
  return Object.freeze({bytes,contentType:'video/mp4'});
 };
}
