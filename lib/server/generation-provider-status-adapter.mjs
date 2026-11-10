// Server-only adapter boundary for authenticated provider status lookups.
// The injected lookup MUST authenticate with the provider's server API and
// return verified status data. No provider endpoint, credentials, network call,
// public route or background polling is configured by this module.
export function createGenerationProviderStatusAdapter({lookup,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return async function getCompletedJob({providerJobId}={}){
  if(!enabled)throw Error('PROVIDER_STATUS_DISABLED');
  if(typeof lookup!=='function')throw Error('PROVIDER_LOOKUP_UNAVAILABLE');
  if(typeof providerJobId!=='string'||!providerJobId.trim()||providerJobId.length>256)throw Error('INVALID_PROVIDER_JOB_ID');
  const result=await lookup({providerJobId});
  if(!result||typeof result!=='object'||Array.isArray(result))throw Error('INVALID_PROVIDER_RESPONSE');
  if(result.providerJobId!==providerJobId)throw Error('PROVIDER_JOB_MISMATCH');
  if(!['queued','processing','completed','failed'].includes(result.status))throw Error('INVALID_PROVIDER_STATUS');
  // No client-supplied URL is trusted. An independent authenticated downloader
  // must retrieve bytes using this verified job ID, then pass them to ingestion.
  return Object.freeze({providerJobId,status:result.status});
 };
}
