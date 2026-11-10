// Higgsfield REST status polling. Server-only; never expose the API key.
// No generation submission, paid calls, webhook or media download here.
const API_ORIGIN='https://api.higgsfield.ai';
export function createHiggsfieldStatusLookup({apiKey,fetchImpl,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 return async function lookup({providerJobId}={}){
  if(!enabled)throw Error('HIGGSFIELD_STATUS_DISABLED');
  if(typeof apiKey!=='string'||!apiKey.trim()||typeof fetchImpl!=='function')throw Error('HIGGSFIELD_STATUS_UNAVAILABLE');
  if(typeof providerJobId!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(providerJobId))throw Error('INVALID_PROVIDER_JOB_ID');
  const response=await fetchImpl(API_ORIGIN+'/requests/'+encodeURIComponent(providerJobId)+'/status',{
   method:'GET',headers:{Authorization:'Key '+apiKey,Accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)
  });
  if(!response?.ok)throw Error('HIGGSFIELD_STATUS_REQUEST_FAILED');
  const payload=await response.json();
  if(!payload||typeof payload!=='object'||payload.request_id!==providerJobId)throw Error('HIGGSFIELD_STATUS_MISMATCH');
  const statuses={queued:'queued',in_progress:'processing',completed:'completed',failed:'failed',nsfw:'failed',canceled:'failed'};
  if(!Object.hasOwn(statuses,payload.status))throw Error('HIGGSFIELD_STATUS_UNKNOWN');
  // Intentionally omit video.url; media download requires a separate trusted adapter.
  return Object.freeze({providerJobId,status:statuses[payload.status]});
 };
}
