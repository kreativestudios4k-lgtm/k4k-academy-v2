// Server-only, disabled-by-default ingestion of a trusted provider output.
// The caller must supply provider-authenticated bytes, never a browser URL.
// Storage is private; no client-controlled bucket or path is accepted.
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const MIME=Object.freeze({'video/mp4':{extension:'mp4',maxBytes:100*1024*1024},'image/png':{extension:'png',maxBytes:20*1024*1024},'image/jpeg':{extension:'jpg',maxBytes:20*1024*1024}});
export function verifyGenerationOutputBytes(bytes,contentType){
 const format=MIME[contentType];
 if(!format)throw Error('INVALID_OUTPUT_TYPE');
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<1024||bytes.byteLength>format.maxBytes)throw Error('INVALID_OUTPUT_SIZE');
 const has=(offset,signature)=>signature.every((n,i)=>bytes[offset+i]===n);
 const mp4=contentType==='video/mp4'&&has(4,[0x66,0x74,0x79,0x70]);
 const png=contentType==='image/png'&&has(0,[137,80,78,71,13,10,26,10])&&has(12,[73,72,68,82])&&bytes.byteLength>=33;
 const jpeg=contentType==='image/jpeg'&&has(0,[0xff,0xd8,0xff])&&has(bytes.length-2,[0xff,0xd9]);
 if(!(mp4||png||jpeg))throw Error(contentType==='video/mp4'?'INVALID_MP4_HEADER':'INVALID_OUTPUT_HEADER');
 return format.extension;
}
export function createGenerationOutputIngestor({storage,enabled=false,bucket='studio-generations',maxBytes=100*1024*1024}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return async function ingest({userId,jobId,providerJobId,bytes,contentType='video/mp4'}={}){
  if(!enabled)throw Error('OUTPUT_INGESTION_DISABLED');
  if(!UUID.test(userId??'')||!UUID.test(jobId??'')||typeof providerJobId!=='string'||!providerJobId.trim())throw Error('INVALID_JOB_IDENTITY');
  const extension=verifyGenerationOutputBytes(bytes,contentType);
  if(bytes.byteLength>maxBytes)throw Error('INVALID_OUTPUT_SIZE');
  if(!storage?.from)throw Error('STORAGE_UNAVAILABLE');
  const outputPath=userId+'/'+jobId+'.'+extension;
  // Upload with upsert=false so a retry can never replace delivered media.
  const {error}=await storage.from(bucket).upload(outputPath,bytes,{contentType,upsert:false,cacheControl:'0'});
  if(error)throw Error('OUTPUT_UPLOAD_FAILED');
  return Object.freeze({outputPath,providerJobId});
 };
}
