import {createHmac} from 'node:crypto';
export function waitlistInput(body){
 if(body?.website)return {bot:true};
 const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
 if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('INVALID_EMAIL');
 if(body?.consent!==true)throw Error('CONSENT_REQUIRED');
 return {email,locale:['en','pt','es'].includes(body.locale)?body.locale:'en'};
}
export function waitlistRateKey(ip,secret){return createHmac('sha256',secret).update('k4k-waitlist:'+ip).digest('hex')}
