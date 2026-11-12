// Provider-event boundary. Authentication is supplied by the trusted caller;
// this module never accepts an unsigned browser callback or a client claim.
export function createGenerationProviderEventHandler({pipeline,authenticate,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 return Object.freeze({
  async handle({headers,payload}={}){
   if(!enabled)throw Error('PROVIDER_EVENTS_DISABLED');
   if(typeof authenticate!=='function'||!pipeline?.complete)throw Error('PROVIDER_EVENT_HANDLER_UNAVAILABLE');
   const trusted=await authenticate({headers,payload});
   if(trusted!==true)throw Error('PROVIDER_EVENT_UNAUTHENTICATED');
   const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
   const {userId,jobId,providerJobId,outcome,outputPath=null}=payload??{};
   if(!uuid.test(userId??'')||!uuid.test(jobId??'')||typeof providerJobId!=='string'||!providerJobId.trim()||providerJobId.length>256)throw Error('INVALID_PROVIDER_EVENT');
   if(!['completed','failed'].includes(outcome))throw Error('INVALID_PROVIDER_OUTCOME');
   if(outcome==='completed'&&outputPath!==userId+'/'+jobId+'.mp4')throw Error('INVALID_PROVIDER_OUTPUT');
   if(outcome==='failed'&&outputPath!==null)throw Error('INVALID_PROVIDER_OUTPUT');
   return pipeline.complete({userId,jobId,providerJobId,outcome,outputPath});
  }
 });
}
