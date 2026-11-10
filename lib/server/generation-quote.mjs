import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
export function generationCredits(usd,env=process.env){
 if(env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED!=='true')throw Error('CREDIT_PRICING_NOT_APPROVED');
 const value=Number(env.K4K_PROVIDER_USD_PER_CREDIT);
 if(!Number.isFinite(value)||value<0.000001||value>1||!Number.isFinite(usd)||usd<=0)throw Error('CREDIT_PRICING_NOT_CONFIGURED');
 const credits=Math.ceil(Math.round(usd*1e6)/Math.round(value*1e6));
 if(!Number.isSafeInteger(credits)||credits<1||credits>10000)throw Error('CREDIT_PRICE_INVALID');
 return credits;
}
export function draftFingerprint(job,resolution){
 return createHash('sha256').update(JSON.stringify([job.id,job.user_id,job.model,resolution,job.prompt??'',job.reference_paths,job.reference_video_path])).digest('hex');
}
export function quoteSigner(secret){
 if(typeof secret!=='string'||!secret)throw Error('QUOTE_SIGNING_UNAVAILABLE');
 const sign=value=>createHmac('sha256',secret).update('k4k-generation-quote-v1:'+value).digest('base64url');
 return {
  issue(data,now=Date.now()){const encoded=Buffer.from(JSON.stringify({...data,expiresAt:now+5*60*1000})).toString('base64url');return encoded+'.'+sign(encoded)},
  verify(token,now=Date.now()){
   if(typeof token!=='string'||token.length>8192)throw Error('QUOTE_INVALID');
   const parts=token.split('.');if(parts.length!==2)throw Error('QUOTE_INVALID');
   const signature=Buffer.from(parts[1]);const expected=Buffer.from(sign(parts[0]));
   if(signature.length!==expected.length||!timingSafeEqual(signature,expected))throw Error('QUOTE_INVALID');
   let data;try{data=JSON.parse(Buffer.from(parts[0],'base64url').toString())}catch{throw Error('QUOTE_INVALID')}
   if(!Number.isFinite(data.expiresAt)||data.expiresAt<=now||data.expiresAt>now+5*60*1000)throw Error('QUOTE_EXPIRED');
   return data;
  }
 };
}
