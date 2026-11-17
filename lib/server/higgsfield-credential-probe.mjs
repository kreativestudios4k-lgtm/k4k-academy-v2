// Non-billable Higgsfield credential probe. Does not submit a generation.
import {higgsfieldAuthorization} from './higgsfield-auth.mjs';
const CHECK='https://api.higgsfield.ai/requests/k4k-connection-check-nonexistent-000/status';
export function createHiggsfieldCredentialProbe({credentials,fetchImpl=fetch}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 const authorization=higgsfieldAuthorization(credentials);
 return async function probe(){
  if(typeof fetchImpl!=='function')throw Error('PROVIDER_UNAVAILABLE');
  let response;
  try{response=await fetchImpl(CHECK,{method:'GET',headers:{Authorization:authorization,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});}
  catch{return Object.freeze({state:'unreachable'});}
  // A non-existent request's 404 can only establish that the API responded.
  // It is NOT proof that this key is valid or a paid model is accessible.
  if(response?.status===401)return Object.freeze({state:'rejected'});
  if(response?.status===402)return Object.freeze({state:'balance_required'});
  if(response?.status===403)return Object.freeze({state:'access_denied'});
  if(response?.status===429)return Object.freeze({state:'rate_limited'});
  if(response?.status===404)return Object.freeze({state:'api_reachable',credentialVerified:false});
  if(response?.ok)return Object.freeze({state:'api_reachable',credentialVerified:false});
  return Object.freeze({state:'indeterminate',httpStatus:Number.isInteger(response?.status)?response.status:503});
 };
}
