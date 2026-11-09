import {createHmac,timingSafeEqual} from 'node:crypto';

// Server-to-server signature verification for a trusted internal adapter.
// This is NOT a provider-specific webhook verifier. The adapter must separately
// authenticate provider-originated events before signing this payload.
export function createInternalGenerationEventAuthenticator({secret,now=()=>Date.now(),maxAgeMs=300000,claimNonce}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 return async function authenticate({headers,rawBody}={}){
  if(typeof secret!=='string'||Buffer.byteLength(secret)<32||typeof rawBody!=='string'||typeof claimNonce!=='function')return false;
  const get=name=>typeof headers?.get==='function'?headers.get(name):headers?.[name]??headers?.[name.toLowerCase()];
  const timestamp=get('x-k4k-event-timestamp'),nonce=get('x-k4k-event-nonce'),signature=get('x-k4k-event-signature');
  if(typeof timestamp!=='string'||!/^[0-9]{13}$/.test(timestamp)||typeof nonce!=='string'||!/^[a-zA-Z0-9_-]{16,128}$/.test(nonce)||typeof signature!=='string'||!/^sha256=[0-9a-f]{64}$/i.test(signature))return false;
  if(Math.abs(now()-Number(timestamp))>maxAgeMs)return false;
  const expected=createHmac('sha256',secret).update(timestamp+'.'+nonce+'.'+rawBody).digest();
  const supplied=Buffer.from(signature.slice(7),'hex');
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return false;
  try{return await claimNonce(nonce,Number(timestamp))===true}catch{return false}
 };
}
