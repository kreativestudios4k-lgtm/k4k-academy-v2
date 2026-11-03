import {createHmac, timingSafeEqual} from 'node:crypto';

// Server-only token for short-lived, user-bound generation quotes.
// This is NOT authorization to charge. At reservation time, reprice against
// the current verified server catalog and reject stale quote versions.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODEL=/^[a-z0-9][a-z0-9_-]{1,63}$/;
const VERSION=/^[a-zA-Z0-9._-]{1,80}$/;
const B64URL=/^[A-Za-z0-9_-]+$/;
const MAX_TTL_MS=5*60*1000;
function secretKey(secret){if(typeof secret!=='string'||secret.length<32)throw new Error('Quote signing key unavailable');return secret;}
function validQuote(q){return q&&typeof q==='object'&&typeof q.modelId==='string'&&MODEL.test(q.modelId)&&Number.isInteger(q.durationSeconds)&&q.durationSeconds>=1&&q.durationSeconds<=60&&['720p','1080p'].includes(q.resolution)&&Number.isSafeInteger(q.credits)&&q.credits>0&&q.credits<=100000&&q.currency==='GBP'&&Number.isSafeInteger(q.estimatedProviderCostPence)&&q.estimatedProviderCostPence>0&&typeof q.quoteVersion==='string'&&VERSION.test(q.quoteVersion);}
function sign(payload,key){return createHmac('sha256',key).update(payload).digest('base64url');}
export function issueQuoteToken({userId,quote,secret,now=Date.now(),ttlMs=120000}){
 const key=secretKey(secret);
 if(!UUID.test(userId)||!validQuote(quote)||!Number.isSafeInteger(now)||!Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>MAX_TTL_MS)throw new Error('Invalid quote issuance');
 const data={v:1,sub:userId,modelId:quote.modelId,durationSeconds:quote.durationSeconds,resolution:quote.resolution,credits:quote.credits,currency:'GBP',estimatedProviderCostPence:quote.estimatedProviderCostPence,quoteVersion:quote.quoteVersion,iat:now,exp:now+ttlMs};
 const encoded=Buffer.from(JSON.stringify(data)).toString('base64url');
 return encoded+'.'+sign(encoded,key);
}
export function verifyQuoteToken({token,userId,secret,now=Date.now()}){
 const key=secretKey(secret);
 if(!UUID.test(userId)||typeof token!=='string'||token.length>2048||!Number.isSafeInteger(now))throw new Error('Invalid quote token');
 const parts=token.split('.');
 if(parts.length!==2||!parts.every(p=>B64URL.test(p)))throw new Error('Invalid quote token');
 const [encoded,mac]=parts;
 const actual=Buffer.from(mac,'base64url');
 const expected=Buffer.from(sign(encoded,key),'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error('Invalid quote signature');
 let data;
 try{data=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));}catch{throw new Error('Invalid quote payload');}
 if(data.v!==1||data.sub!==userId||!validQuote(data)||!Number.isSafeInteger(data.iat)||!Number.isSafeInteger(data.exp)||data.exp-data.iat<1000||data.exp-data.iat>MAX_TTL_MS||now<data.iat||now>=data.exp)throw new Error('Quote expired or invalid');
 return Object.freeze({modelId:data.modelId,durationSeconds:data.durationSeconds,resolution:data.resolution,credits:data.credits,currency:data.currency,estimatedProviderCostPence:data.estimatedProviderCostPence,quoteVersion:data.quoteVersion});
}
