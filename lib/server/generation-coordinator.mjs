// Server-only composition. Callers MUST authenticate and derive the user ID,
// validated owned media, immutable input and price before using this module.
// Not exposed as a route until the reviewed SQL and rollout gates are satisfied.
export function createGenerationCoordinator({store, provider}) {
 if (typeof window !== 'undefined') throw new Error('Server only');
 return {
  async submit({userId,requestKey,input,credits}) {
   let job=await store.reserve(userId,requestKey,input,credits);
   if (!['reserved','submitting'].includes(job.state)) return job;
   job=await store.submitting(userId,job.id);
   // Retry an ambiguous submission ONLY with this durable ID and saved payload.
   // Never settle/refund inside catch: a timeout does not mean generation failed.
   const handle=await provider.submit(job.input,job.id);
   return store.attach(userId,job.id,handle.requestId,handle.statusUrl);
  },
  async refresh({userId,jobId}) {
   const job=await store.read(userId,jobId);
   if (!job || job.user_id!==userId) throw new Error('Job not found');
   if (['completed','refunded','reserved','submitting'].includes(job.state)) return job;
   const result=await provider.status({requestId:job.provider_id,statusUrl:job.provider_status_url});
   return store.settle(userId,job.id,result.requestId,result.status,result.videoUrl);
  }
 };
}
