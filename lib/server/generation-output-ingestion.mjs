// Server-only, disabled-by-default ingestion of a trusted provider output.
// This module does not authenticate provider events or fetch arbitrary URLs.
// The caller must supply a provider-authenticated stream/bytes, not a browser URL.
export function createGenerationOutputIngestor({storage, enabled=false, bucket='studio-generations', maxBytes=100*1024*1024}={}){
  if(typeof window!=='undefined') throw Error('SERVER_ONLY');
  const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  return async function ingest({userId,jobId,providerJobId,bytes,contentType='video/mp4'}={}){
    if(!enabled) throw Error('OUTPUT_INGESTION_DISABLED');
    if(!uuid.test(userId??'')||!uuid.test(jobId??'')||typeof providerJobId!=='string'||!providerJobId.trim()) throw Error('INVALID_JOB_IDENTITY');
    if(contentType!=='video/mp4') throw Error('INVALID_OUTPUT_TYPE');
    if(!(bytes instanceof Uint8Array)||bytes.byteLength<1024||bytes.byteLength>maxBytes) throw Error('INVALID_OUTPUT_SIZE');
    // MP4 ftyp box is at offset 4. Reject obvious non-video payloads.
    if(String.fromCharCode(...bytes.subarray(4,8))!=='ftyp') throw Error('INVALID_MP4_HEADER');
    if(!storage?.from) throw Error('STORAGE_UNAVAILABLE');
    const outputPath=userId+'/'+jobId+'.mp4';
    // Never overwrite an existing output; retries fail closed.
    const {error}=await storage.from(bucket).upload(outputPath,bytes,{contentType:'video/mp4',upsert:false,cacheControl:'private, no-store'});
    if(error) throw Error('OUTPUT_UPLOAD_FAILED');
    return Object.freeze({outputPath,providerJobId});
  };
}
