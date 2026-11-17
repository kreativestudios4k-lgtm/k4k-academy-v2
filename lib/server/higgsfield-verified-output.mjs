// Retrieve a completed Higgsfield MP4 from the authenticated developer API.
// Provider JSON only authorises a fixed, request-matched CDN path; no SSRF,
// redirects, user-controlled domains, oversized or non-MP4 responses.
import {verifyGenerationOutputBytes} from './generation-output-ingestion.mjs';
const REQUEST=/^[A-Za-z0-9_-]{1,128}$/;
const MAX_BYTES=100*1024*1024;
const CDN='d3u0tzju9qaucj.cloudfront.net';
function videoUrl(url,id){
 if(typeof url!=='string')throw Error('PROVIDER_OUTPUT_URL_INVALID');
 let u;try{u=new URL(url)}catch{throw Error('PROVIDER_OUTPUT_URL_INVALID')}
 if(u.protocol!=='https:'||u.hostname!==CDN||u.username||u.password||u.search||u.hash||u.port
  ||!u.pathname.split('/').includes(id)||!/^\/[a-f0-9-]+\/[A-Za-z0-9_-]+\/[a-f0-9-]+\.mp4$/i.test(u.pathname))
  throw Error('PROVIDER_OUTPUT_URL_UNTRUSTED');
 return u.href;
}
export function createHiggsfieldVerifiedOutputRetriever({provider,fetchImpl=fetch,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return Object.freeze({
  async retrieve({providerRequestId,expectedKind='video'}={}){
   if(!enabled)throw Error('HIGGSFIELD_OUTPUT_RETRIEVAL_DISABLED');
   if(!REQUEST.test(providerRequestId??'')||expectedKind!=='video'||typeof provider?.status!=='function')
    throw Error('INVALID_PROVIDER_JOB_ID');
   const status=await provider.status(providerRequestId);
   if(status?.request_id!==providerRequestId||status.status!=='completed')
    throw Error('PROVIDER_COMPLETION_NOT_VERIFIED');
   const url=videoUrl(status.video?.url,providerRequestId);
   let response;
   try{response=await fetchImpl(url,{method:'GET',headers:{Accept:'video/mp4'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(45000)})}
   catch{throw Error('PROVIDER_MEDIA_UNAVAILABLE')}
   const type=(response?.headers?.get('content-type')||'').split(';')[0].trim().toLowerCase();
   const declaredLength=response?.headers?.get('content-length');
   const expected=declaredLength===null?null:Number(declaredLength);
   if(response?.status!==200||type!=='video/mp4'||(expected!==null&&(!Number.isSafeInteger(expected)||expected<1024||expected>MAX_BYTES)))
    throw Error('PROVIDER_OUTPUT_INVALID');
   if(!response.body?.getReader)throw Error('PROVIDER_OUTPUT_UNAVAILABLE');
   const reader=response.body.getReader();const chunks=[];let total=0;
   try{
    while(true){
     const {done,value}=await reader.read();if(done)break;
     if(!(value instanceof Uint8Array))throw Error('PROVIDER_OUTPUT_INVALID');
     total+=value.byteLength;if(total>MAX_BYTES)throw Error('PROVIDER_OUTPUT_TOO_LARGE');
     chunks.push(value);
    }
   }finally{reader.releaseLock()}
   if(total<1024||(expected!==null&&total!==expected))throw Error('PROVIDER_OUTPUT_LENGTH_MISMATCH');
   const bytes=new Uint8Array(total);let cursor=0;
   for(const chunk of chunks){bytes.set(chunk,cursor);cursor+=chunk.length}
   verifyGenerationOutputBytes(bytes,'video/mp4');
   return Object.freeze({contentType:'video/mp4',bytes,providerRequestId});
  }
 });
}
