// Server-side verification of an already-uploaded private MP4 output.
// This does not download files, create signed URLs or invoke an AI provider.
export function createGenerationOutputVerifier({storage,bucket='studio-generations',enabled=false,maxBytes=1024*1024*1024}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 return async function verifyOutput({userId,jobId,outputPath}={}){
  if(!enabled)throw Error('OUTPUT_VERIFICATION_DISABLED');
  const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  if(!uuid.test(userId??'')||!uuid.test(jobId??'')||outputPath!==userId+'/'+jobId+'.mp4')throw Error('INVALID_OUTPUT_PATH');
  if(!storage?.from)throw Error('STORAGE_UNAVAILABLE');
  const {data,error}=await storage.from(bucket).info(outputPath);
  if(error||!data)throw Error('OUTPUT_NOT_FOUND');
  const bytes=Number(data.size??data.metadata?.size);
  if(!Number.isSafeInteger(bytes)||bytes<1024||bytes>maxBytes)throw Error('INVALID_OUTPUT_SIZE');
  const mime=String(data.contentType??data.metadata?.mimetype??data.metadata?.contentType??'').toLowerCase().split(';')[0].trim();
  if(mime!=='video/mp4')throw Error('INVALID_OUTPUT_TYPE');
  return true;
 };
}
