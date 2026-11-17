// Higgsfield REST transport for a future K4K provider integration.
// Deliberately not connected to billing, public routes or production dispatch.
// Model-specific submit must use its verified official input schema.
// Uses a server-owned complete credential; never logs or returns signed upload URLs.
import {higgsfieldAuthorization} from './higgsfield-auth.mjs';
const ORIGIN='https://api.higgsfield.ai';
const uuid=/^[a-zA-Z0-9_-]{1,128}$/;
const TIMEOUT_MS=20000;
function parseApiPath(value){
 if(typeof value!=='string'||!/^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*){1,8}$/.test(value))throw Error('HIGGSFIELD_MODEL_PATH_INVALID');
 return value;
}
export function higgsfieldPreviewCredential(env=process.env){
 // Accept the SDK's HF_CREDENTIALS format or REST's HF_API_KEY as a single opaque credential.
 // Never copy or decrypt one Vercel secret into another environment.
 if(env.VERCEL_ENV!=='preview')return null;
 const credential=env.HF_CREDENTIALS||env.K4K_HIGGSFIELD_API_PILOT||env.HF_API_KEY;
 return typeof credential==='string'&&credential.length>11&&credential!=='true'&&!/[\\s\\x00-\\x1f]/u.test(credential)?credential:null;
}
export function higgsfieldModelAccess(env=process.env){
 return env.VERCEL_ENV==='preview'&&env.K4K_HIGGSFIELD_GENERATION_PILOT_ENABLED==='true'&&!!higgsfieldPreviewCredential(env);
}
export function createHiggsfieldPlatformApi({credentials,fetchImpl=fetch,baseUrl=ORIGIN}={}){
 if(typeof window!=='undefined')throw Error('SERVER_ONLY');
 if(baseUrl!==ORIGIN)throw Error('HIGGSFIELD_ORIGIN_INVALID');
 const authorization=higgsfieldAuthorization(credentials);
 async function call(path,{method='GET',json}={}){
  let response;
  try{response=await fetchImpl(ORIGIN+'/'+path,{method,headers:{Authorization:authorization,'Content-Type':'application/json'},...(json!==undefined?{body:JSON.stringify(json)}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(TIMEOUT_MS)})}
  catch{throw Error('HIGGSFIELD_NETWORK_UNAVAILABLE')}
  if(!response?.ok){
   const code=response?.status;
   const err=Error(code===401?'HIGGSFIELD_KEY_INVALID':code===402?'HIGGSFIELD_BALANCE_REQUIRED':code===429?'HIGGSFIELD_RATE_LIMITED':'HIGGSFIELD_REQUEST_FAILED');
   err.httpStatus=code;throw err;
  }
  try{return await response.json()}catch{throw Error('HIGGSFIELD_RESPONSE_INVALID')}
 }
 return Object.freeze({
  async submit({modelPath,input,enabled=false}={}){
   if(!enabled)throw Error('HIGGSFIELD_GENERATION_DISABLED');
   const path=parseApiPath(modelPath);
   if(!input||typeof input!=='object'||Array.isArray(input))throw Error('HIGGSFIELD_INPUT_INVALID');
   const data=await call(path,{method:'POST',json:input});
   if(!uuid.test(data?.request_id??'')||typeof data.status_url!=='string')throw Error('HIGGSFIELD_RESPONSE_INVALID');
   // Never follow status_url from provider JSON: use fixed Higgsfield origin.
   return {request_id:data.request_id};
  },
  async status(id){
   if(!uuid.test(id??''))throw Error('HIGGSFIELD_REQUEST_ID_INVALID');
   const data=await call('requests/'+id+'/status');
   if(!['queued','in_progress','completed','failed','nsfw','canceled'].includes(data?.status))throw Error('HIGGSFIELD_RESPONSE_INVALID');
   if(data.status==='completed'&&typeof data?.video?.url!=='string'&&!Array.isArray(data?.images))throw Error('HIGGSFIELD_RESPONSE_INVALID');
   return {request_id:id,status:data.status,...(data.status==='completed'?{video:data.video??null,images:data.images??null}:{})};
  },
  async cancel(id,{enabled=false}={}){
   if(!enabled)throw Error('HIGGSFIELD_CANCEL_DISABLED');
   if(!uuid.test(id??''))throw Error('HIGGSFIELD_REQUEST_ID_INVALID');
   return await call('requests/'+id+'/cancel',{method:'POST'});
  },
  async createImageUpload({contentType,enabled=false}={}){
   if(!enabled)throw Error('HIGGSFIELD_UPLOAD_DISABLED');
   if(!['image/jpeg','image/png','image/webp'].includes(contentType))throw Error('HIGGSFIELD_MEDIA_TYPE_INVALID');
   const data=await call('files/generate-upload-url',{method:'POST',json:{content_type:contentType}});
   if(![data.upload_url,data.public_url].every(s=>{try{return new URL(s).protocol==='https:'}catch{return false}})||!data.upload_headers||typeof data.upload_headers!=='object'||Array.isArray(data.upload_headers))throw Error('HIGGSFIELD_RESPONSE_INVALID');
   // Only return to a restricted authenticated upload route; never to logs.
   return {upload_url:data.upload_url,upload_headers:data.upload_headers,public_url:data.public_url};
  }
 });
}
