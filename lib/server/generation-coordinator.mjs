// Explicitly gated generation lifecycle. Never submit to a paid provider
// without a separately reviewed and enabled provider adapter.
export function createGenerationCoordinator({store,provider,enabled=false}){
 if(typeof window!=='undefined')throw Error('Server only');
 return Object.freeze({
  async reserve({userId,jobId,requestKey,credits}){
   if(!enabled)throw Error('GENERATION_DISABLED');
   if(!Number.isSafeInteger(credits)||credits<=0)throw Error('INVALID_CREDITS');
   const job=await store.read(userId,jobId);
   if(!job||job.user_id!==userId||job.status!=='draft')throw Error('INVALID_JOB');
   // The caller MUST verify actual media, duration and trusted pricing
   // immediately before invoking this method.
   return store.reserve(userId,jobId,requestKey,credits);
  },
  async submit(){
   // Paid submissions intentionally unavailable in Preview.
   throw Error('PROVIDER_SUBMISSION_DISABLED');
  },
  async finish({userId,jobId,outcome,outputPath}){
   if(!enabled)throw Error('GENERATION_DISABLED');
   if(outcome==='completed'&&!outputPath)throw Error('OUTPUT_NOT_VERIFIED');
   // Only trusted server-side provider callbacks may call this after verifying
   // output was stored in the customer's private studio-outputs bucket.
   return store.finish(userId,jobId,outcome,outputPath??null);
  }
 });
}
