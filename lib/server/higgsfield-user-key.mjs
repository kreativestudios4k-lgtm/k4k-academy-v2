// Server-only helper for a per-user Higgsfield API key stored in an HTTP-only cookie.
export const HIGGSFIELD_API_KEY_COOKIE='k4k_hf_api_key';
export function isValidCopiedHiggsfieldKey(value){
 if(typeof window!=='undefined')throw new Error('SERVER_ONLY');
 return typeof value==='string'&&value.length>0&&value.length<=2048&&!/[\\s\\x00-\\x1f\\x7f]/u.test(value)&&!/^Key\\s/i.test(value);
}
export function encodeHiggsfieldUserKey({userId,apiKey}={}){
 if(typeof window!=='undefined')throw new Error('SERVER_ONLY');
 if(typeof userId!=='string'||!userId||!isValidCopiedHiggsfieldKey(apiKey))throw new Error('INVALID_HIGGSFIELD_KEY');
 return Buffer.from(JSON.stringify({v:1,userId,apiKey}),'utf8').toString('base64url');
}
export function decodeHiggsfieldUserKey(cookieValue,userId){
 if(typeof window!=='undefined')throw new Error('SERVER_ONLY');
 if(typeof cookieValue!=='string'||typeof userId!=='string'||!userId)return null;
 try{
  const record=JSON.parse(Buffer.from(cookieValue,'base64url').toString('utf8'));
  if(record?.v!==1||record.userId!==userId||!isValidCopiedHiggsfieldKey(record.apiKey))return null;
  return record.apiKey;
 }catch{return null}
}
