import {createHash} from 'node:crypto';
import {ownedMediaPath,validateReferenceList} from './generation-media.mjs';
import {verifyStudioMedia} from './studio-media-verification.mjs';
import {higgsfieldAuthorization} from './higgsfield-auth.mjs';
const TYPES={mp4:'video/mp4',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
import {HIGGSFIELD_INPUT_HOSTS} from './higgsfield-input-hosts.mjs';
export function validateHiggsfieldUploadLink(link){
 const upload=new URL(link?.upload_url),publicUrl=new URL(link?.public_url);
 for(const u of [upload,publicUrl])if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)throw Error('UNTRUSTED_UPLOAD_URL');
 if(!HIGGSFIELD_INPUT_HOSTS.includes(publicUrl.hostname)||publicUrl.search||!publicUrl.pathname.startsWith('/'))throw Error('UNTRUSTED_UPLOAD_URL');
 if(!/^[a-z0-9.-]+\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(upload.hostname))throw Error('UNTRUSTED_UPLOAD_URL');
 if(!link.upload_headers||typeof link.upload_headers!=='object'||Array.isArray(link.upload_headers))throw Error('INVALID_UPLOAD_HEADERS');
 for(const [key,value] of Object.entries(link.upload_headers)){
  if(!/^(content-type|x-amz-[a-z0-9-]+)$/i.test(key)||typeof value!=='string'||/[\r\n]/.test(value))throw Error('INVALID_UPLOAD_HEADERS');
 }
 return {uploadUrl:upload.href,publicUrl:publicUrl.href,headers:link.upload_headers};
}
export function createHiggsfieldReferenceTransfer({storageClient,credentials,fetchImpl=fetch}){
 return async({userId,jobId,videoPath,referencePaths,beforeTransfer=()=>{}})=>{
  const images=validateReferenceList(userId,referencePaths),video=ownedMediaPath(userId,videoPath,'video');
  const files=new Map();
  // Cache the exact downloaded bytes that were verified. Never re-read mutable
  // user storage after verification and never accept browser duration/evidence.
  const cached={storage:{from:bucket=>({download:async path=>{
   const key=bucket+'/'+path;
   if(!files.has(key)){
    const result=await storageClient.storage.from(bucket).download(path);
    if(result.error||!result.data)throw Error('MEDIA_NOT_FOUND');
    files.set(key,result.data);
   }
   return {data:files.get(key)};
  }})}};
  const verified=await verifyStudioMedia({client:cached,userId,videoPath,referencePaths});
  await beforeTransfer(verified.durationSeconds);
  const receipts=[];
  for(const item of [video,...images]){
   const bytes=new Uint8Array(await files.get(item.bucket+'/'+item.path).arrayBuffer());
   const contentType=TYPES[item.path.split('.').pop().toLowerCase()];
   const response=await fetchImpl('https://api.higgsfield.ai/files/generate-upload-url',{
    method:'POST',headers:{Authorization:higgsfieldAuthorization(credentials),'Content-Type':'application/json'},
    body:JSON.stringify({content_type:contentType}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)
   });
   if(!response.ok)throw Error('REFERENCE_TRANSFER_UNAVAILABLE');
   const link=validateHiggsfieldUploadLink(await response.json());
   const put=await fetchImpl(link.uploadUrl,{method:'PUT',headers:link.headers,body:bytes,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(60000)});
   if(!put.ok)throw Error('REFERENCE_TRANSFER_FAILED');
   receipts.push({url:link.publicUrl,sha256:createHash('sha256').update(bytes).digest('hex'),contentType,size:bytes.length});
  }
  return {input:{video_url:receipts[0].url,image_urls:receipts.slice(1).map(r=>r.url)},
   verifiedMedia:{userId,jobId,verified:true,seconds:verified.durationSeconds,contentType:'video/mp4',receipts}};
 };
}
