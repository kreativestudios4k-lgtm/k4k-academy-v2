// Server-only, disabled-by-default signed media delivery for isolated multimodel jobs.
// A browser cannot select a storage path, MIME, model or customer identity.
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const FORMATS=Object.freeze({
 'video/mp4':Object.freeze({extension:'mp4',kind:'video',limit:100*1024*1024}),
 'image/png':Object.freeze({extension:'png',kind:'image',limit:20*1024*1024}),
 'image/jpeg':Object.freeze({extension:'jpg',kind:'image',limit:20*1024*1024})
});
export function validatedMultimodelOutputPath(job,userId,jobId){
 if(!UUID.test(userId??'')||!UUID.test(jobId??''))throw Error('INVALID_JOB');
 if(!job||job.id!==jobId||job.user_id!==userId)throw Error('JOB_NOT_FOUND');
 if(job.status!=='completed')throw Error('JOB_NOT_COMPLETED');
 const format=FORMATS[job.output_mime];
 if(!format||job.media_kind!==format.kind)throw Error('INVALID_OUTPUT_TYPE');
 const path=userId+'/'+jobId+'.'+format.extension;
 if(job.output_path!==path)throw Error('INVALID_OUTPUT_PATH');
 return Object.freeze({path,format,mime:job.output_mime});
}
export function createMultimodelPrivateDelivery({jobStore,storage,enabled=false,bucket='studio-generations',expiresIn=120}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return Object.freeze({
  async getSignedUrl({userId,jobId,download=false}={}){
   if(!enabled)throw Error('MULTIMODEL_DELIVERY_DISABLED');
   if(!UUID.test(userId??'')||!UUID.test(jobId??''))throw Error('INVALID_JOB');
   if(!jobStore?.getOwnedJob||!storage?.from)throw Error('DELIVERY_UNAVAILABLE');
   if(!Number.isSafeInteger(expiresIn)||expiresIn<15||expiresIn>300)throw Error('INVALID_SIGNED_URL_EXPIRY');
   const job=await jobStore.getOwnedJob(userId,jobId);
   const {path,format,mime}=validatedMultimodelOutputPath(job,userId,jobId);
   if(job.provider_request_id===null||typeof job.provider_request_id!=='string'||!job.provider_request_id.trim())throw Error('PROVIDER_NOT_RECORDED');
   const object=storage.from(bucket);
   if(typeof object?.info!=='function'||typeof object?.createSignedUrl!=='function')throw Error('DELIVERY_UNAVAILABLE');
   const {data:details,error:infoError}=await object.info(path);
   if(infoError||!details)throw Error('OUTPUT_NOT_FOUND');
   const bytes=Number(details.size??details.metadata?.size);
   const storedMime=String(details.contentType??details.metadata?.mimetype??details.metadata?.contentType??'').split(';')[0].trim().toLowerCase();
   if(!Number.isSafeInteger(bytes)||bytes<1024||bytes>format.limit)throw Error('INVALID_OUTPUT_SIZE');
   if(storedMime!==mime)throw Error('INVALID_OUTPUT_TYPE');
   const fileName='K4K-'+jobId+'.'+format.extension;
   const {data,error}=download===true?
    await object.createSignedUrl(path,expiresIn,{download:fileName}):
    await object.createSignedUrl(path,expiresIn);
   const signedUrl=data?.signedUrl;
   if(error||typeof signedUrl!=='string')throw Error('SIGNED_URL_UNAVAILABLE');
   let parsed;try{parsed=new URL(signedUrl);}catch{throw Error('SIGNED_URL_UNAVAILABLE');}
   // Supabase SDK may return a relative signed URL depending on version/config;
   // fail closed rather than returning an unexpected scheme or credential URL.
   if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.hash)throw Error('SIGNED_URL_UNAVAILABLE');
   return Object.freeze({url:signedUrl,expiresIn,contentType:mime,...(download===true?{fileName}:{})});
  }
 });
}
