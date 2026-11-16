// Server-only fal.ai queue transport. No client routes, side effects on import,
// retries, arbitrary network URLs, or automatic settlement of customer credits.
// A caller must first obtain the one-shot DB dispatch claim.
import {MULTIMODEL_CONTRACTS} from './fal-multimodel-contracts.mjs';
const BASE='https://queue.fal.run/';
const REQUEST_ID=/^[a-zA-Z0-9_-]{1,128}$/;
const keys=Object.values(MULTIMODEL_CONTRACTS);
function modelEndpoint(endpoint){
 if(!keys.some(m=>m.endpoint===endpoint))throw Error('MODEL_NOT_CONFIGURED');
 const parts=endpoint.split('/');
 if(parts.length<2||parts.some(p=>!(/^[a-z0-9][a-z0-9.-]*$/i).test(p)))throw Error('INVALID_MODEL_ENDPOINT');
 return {submit:BASE+endpoint,queueBase:BASE+parts.slice(0,2).join('/')};
}
function validateId(id){if(typeof id!=='string'||!REQUEST_ID.test(id))throw Error('INVALID_PROVIDER_JOB_ID');return id;}
function expectedUrls(queueBase,id){
 const response=queueBase+'/requests/'+id;
 return {response,status:response+'/status'};
}
async function readJson(response){
 let data;try{data=await response.json();}catch{throw Error('PROVIDER_RESPONSE_INVALID');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('PROVIDER_RESPONSE_INVALID');
 return data;
}
export function createFalMultimodelTransport({credentials,fetchImpl=fetch,enabled=false}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 if(typeof credentials!=='string'||!credentials.trim()||/[\r\n]/.test(credentials))throw Error('PROVIDER_CREDENTIALS_MISSING');
 if(typeof fetchImpl!=='function')throw Error('PROVIDER_TRANSPORT_UNAVAILABLE');
 async function request(url,method,body){
  let response;
  try{response=await fetchImpl(url,{
   method,headers:{Authorization:'Key '+credentials,'Content-Type':'application/json',
    ...(method==='POST'?{'X-Fal-No-Retry':'true'}:{})},
   ...(method==='POST'?{body:JSON.stringify(body)}:{}),
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)
  });}catch{throw Error(method==='POST'?'PROVIDER_SUBMISSION_UNCERTAIN':'PROVIDER_STATUS_UNAVAILABLE');}
  // Even documented HTTP rejection may follow a successful upstream enqueue.
  // Never automatically resubmit or refund because of the status code.
  if(!response?.ok)throw Error(method==='POST'?'PROVIDER_SUBMISSION_UNCERTAIN':'PROVIDER_STATUS_UNAVAILABLE');
  return readJson(response);
 }
 return Object.freeze({
  async submitAuthenticated({endpoint,input}={}){
   if(!enabled)throw Error('MULTIMODEL_TRANSPORT_DISABLED');
   const m=modelEndpoint(endpoint);
   if(!input||typeof input!=='object'||Array.isArray(input))throw Error('INVALID_PROVIDER_INPUT');
   const data=await request(m.submit,'POST',input);
   const id=validateId(data.request_id);
   const expected=expectedUrls(m.queueBase,id);
   if(data.response_url!==expected.response||data.status_url!==expected.status
    ||!['IN_QUEUE','IN_PROGRESS','COMPLETED'].includes(data.status))
    throw Error('PROVIDER_SUBMISSION_UNCERTAIN');
   return Object.freeze({request_id:id});
  },
  async lookupAuthenticated({providerRequestId,model}={}){
   if(!enabled)throw Error('MULTIMODEL_TRANSPORT_DISABLED');
   const contract=MULTIMODEL_CONTRACTS[model];if(!contract)throw Error('MODEL_NOT_CONFIGURED');
   const id=validateId(providerRequestId);
   const {queueBase}=modelEndpoint(contract.endpoint);
   const {status,response}=expectedUrls(queueBase,id);
   const data=await request(status,'GET');
   if(data.request_id!==id||!['IN_QUEUE','IN_PROGRESS','COMPLETED'].includes(data.status))
    throw Error('PROVIDER_RESPONSE_INVALID');
   if(data.status==='IN_QUEUE')return Object.freeze({request_id:id,status:'queued'});
   if(data.status==='IN_PROGRESS')return Object.freeze({request_id:id,status:'processing'});
   if(data.error||data.error_type)return Object.freeze({request_id:id,status:'failed'});
   // COMPLETED only means the queue ended; result must be verified separately.
   const output=await request(response,'GET');
   if(output.error||output.error_type)return Object.freeze({request_id:id,status:'failed'});
   // No trust in unverified media URLs, and no customer settlement here.
   return Object.freeze({request_id:id,status:'completed'});
  }
 });
}
