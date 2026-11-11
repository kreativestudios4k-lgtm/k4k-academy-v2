import {waitlistInput,waitlistRateKey} from '../../../lib/server/waitlist.mjs';
export const runtime='nodejs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'INVALID_ORIGIN'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'INVALID_REQUEST'},415);
  const raw=await request.text();if(raw.length>2048)return json({error:'INVALID_REQUEST'},413);
  const input=waitlistInput(JSON.parse(raw));if(input.bot)return json({accepted:true});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!secret)return json({error:'WAITLIST_UNAVAILABLE'},503);
  // Vercel's overwritten client-IP header; never retain raw IPs or trust browser fields.
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const response=await fetch(url+'/rest/v1/rpc/k4k_join_waitlist',{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({p_email:input.email,p_locale:input.locale,p_rate_key:waitlistRateKey(ip,secret)}),signal:AbortSignal.timeout(10000)});
  if(!response.ok){const result=await response.json().catch(()=>({}));if(result.message==='RATE_LIMITED')return json({error:'RATE_LIMITED'},429);return json({error:'WAITLIST_UNAVAILABLE'},503)}
  return json({accepted:true});
 }catch(error){return json({error:['INVALID_EMAIL','CONSENT_REQUIRED'].includes(error.message)?error.message:'WAITLIST_UNAVAILABLE'},['INVALID_EMAIL','CONSENT_REQUIRED'].includes(error.message)?400:503)}
}
