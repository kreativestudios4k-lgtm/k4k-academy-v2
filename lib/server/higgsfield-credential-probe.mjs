// Non-billable, server-side developer API authentication probe.
// A 200 from the documented Higgsfield presets endpoint validates an API key;
// a 404 to an invented request ID never proves authentication.
import {higgsfieldAuthorization} from './higgsfield-auth.mjs';
const CHECK='https://api.higgsfield.ai/models/higgsfield/genjutsu/restyle/v1.0/presets';
export function createHiggsfieldCredentialProbe({credentials,fetchImpl=fetch}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 const authorization=higgsfieldAuthorization(credentials);
 return async function probe(){
  if(typeof fetchImpl!=='function')throw Error('PROVIDER_UNAVAILABLE');
  let response;
  try{response=await fetchImpl(CHECK,{method:'GET',headers:{Authorization:authorization,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});}
  catch{return Object.freeze({state:'unreachable',credentialVerified:false});}
  if(response?.status===401)return Object.freeze({state:'rejected',credentialVerified:false});
  if(response?.status===402)return Object.freeze({state:'balance_required',credentialVerified:false});
  if(response?.status===403)return Object.freeze({state:'access_denied',credentialVerified:false});
  if(response?.status===429)return Object.freeze({state:'rate_limited',credentialVerified:false});
  // This endpoint is documented as authenticated and read-only. Do not parse or
  // expose the provider's catalog or secret: status alone is enough.
  if(response?.ok)return Object.freeze({state:'authenticated',credentialVerified:true,paidGenerationEnabled:false});
  return Object.freeze({state:'indeterminate',credentialVerified:false,httpStatus:Number.isInteger(response?.status)?response.status:503});
 };
}
