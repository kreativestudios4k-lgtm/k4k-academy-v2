import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

const VERSION='1';
const COUNTRY=/^[A-Z]{2}$/;
const SIG=/^[a-f0-9]{64}$/;
function sha256(value){return createHash('sha256').update(value,'utf8').digest('hex');}

// This exact canonical payload is shared with K4K V2. Never trust the public
// x-vercel-ip-country after a server-to-server hop: Vercel regenerates it for
// the V2 server's egress IP, not the customer's original region.
export function billingCountrySignature({country,body,token,timestamp,secret}){
  if(!COUNTRY.test(country)||!/^\d{10}$/.test(String(timestamp))||
      typeof body!=='string'||typeof token!=='string'||!token||
      typeof secret!=='string'||Buffer.byteLength(secret,'utf8')<32)
    throw Error('COUNTRY_RELAY_INVALID');
  const canonical=['k4k-billing-country-v1',String(timestamp),country,sha256(body),sha256(token)].join('\n');
  return createHmac('sha256',secret).update(canonical,'utf8').digest('hex');
}

// Returns null for direct authenticated requests to the original app,
// which retain their normal Vercel-generated source country. Relayed
// requests must have ALL signed fields and pass strict verification.
export function verifiedBillingCountry(headers,{body,token,secret=process.env.K4K_BILLING_REGION_RELAY_SECRET,now=Date.now()}){
  const version=headers.get('x-k4k-region-version');
  const country=headers.get('x-k4k-region-country');
  const timestamp=headers.get('x-k4k-region-timestamp');
  const mac=headers.get('x-k4k-region-signature');
  if(!version&&!country&&!timestamp&&!mac)return null;
  if(version!==VERSION||!COUNTRY.test(country||'')||!/^\d{10}$/.test(timestamp||'')||
     !SIG.test(mac||'')||!Number.isFinite(now)||
     Math.abs(Math.floor(now/1000)-Number(timestamp))>90)
    throw Error('COUNTRY_RELAY_INVALID');
  if(typeof secret!=='string'||Buffer.byteLength(secret,'utf8')<32)
    throw Error('COUNTRY_RELAY_SETUP_REQUIRED');
  const expected=billingCountrySignature({country,body,token,timestamp,secret});
  const actualBytes=Buffer.from(mac,'hex');
  const expectedBytes=Buffer.from(expected,'hex');
  if(actualBytes.length!==expectedBytes.length||!timingSafeEqual(actualBytes,expectedBytes))
    throw Error('COUNTRY_RELAY_INVALID');
  return country;
}
