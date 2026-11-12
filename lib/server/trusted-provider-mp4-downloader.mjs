// Server-only bounded media downloader. The URL MUST originate from an
// authenticated provider API response, never from a customer or browser.
// The caller must configure the exact approved CDN hostnames from provider docs.
export function createTrustedProviderMp4Downloader({fetchImpl,resolveTrustedUrl,allowedHosts=[],enabled=false,maxBytes=100*1024*1024}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 const hosts=new Set(allowedHosts);
 return async function download({providerJobId}={}){
  if(!enabled)throw Error('PROVIDER_DOWNLOAD_DISABLED');
  if(typeof fetchImpl!=='function'||typeof resolveTrustedUrl!=='function'||hosts.size===0)throw Error('PROVIDER_DOWNLOAD_UNAVAILABLE');
  if(typeof providerJobId!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(providerJobId))throw Error('INVALID_PROVIDER_JOB_ID');
  const rawUrl=await resolveTrustedUrl({providerJobId});
  let url;
  try{url=new URL(rawUrl)}catch{throw Error('INVALID_PROVIDER_MEDIA_URL')}
  if(url.protocol!=='https:'||!hosts.has(url.hostname)||url.username||url.password||url.port||url.hash)throw Error('UNTRUSTED_PROVIDER_MEDIA_HOST');
  const response=await fetchImpl(url.href,{method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response?.ok||!response.body?.getReader)throw Error('PROVIDER_MEDIA_REQUEST_FAILED');
  const mime=(response.headers?.get?.('content-type')??'').split(';')[0].trim().toLowerCase();
  if(mime!=='video/mp4')throw Error('INVALID_PROVIDER_MEDIA_TYPE');
  const advertised=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(advertised)&&advertised>maxBytes)throw Error('PROVIDER_MEDIA_TOO_LARGE');
  const reader=response.body.getReader();
  const chunks=[];let size=0;
  try{
   while(true){
    const {done,value}=await reader.read();
    if(done)break;
    if(!(value instanceof Uint8Array))throw Error('INVALID_PROVIDER_MEDIA');
    size+=value.byteLength;
    if(size>maxBytes)throw Error('PROVIDER_MEDIA_TOO_LARGE');
    chunks.push(value);
   }
  }catch(error){await reader.cancel().catch(()=>{});throw error}
  if(size<1024)throw Error('INVALID_PROVIDER_MEDIA_SIZE');
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  if(String.fromCharCode(...bytes.subarray(4,8))!=='ftyp')throw Error('INVALID_MP4_HEADER');
  return Object.freeze({bytes,contentType:'video/mp4'});
 };
}
