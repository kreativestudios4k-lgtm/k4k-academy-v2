// Safe K4K public-route smoke check: read-only GETs, never generate or charge.
const base=process.env.K4K_SMOKE_BASE_URL||'https://kreativestudios4k.com';
const origin=new URL(base);
if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||!['kreativestudios4k.com','kreativestudios4k-site.vercel.app'].includes(origin.hostname))throw Error('SMOKE_BASE_URL_NOT_APPROVED');
const routes=['/','/k4k-app/motion','/k4k-app/image','/k4k-app/video'];
let failures=0;
for(const path of routes){
 try{
  const url=new URL(path,origin);
  const response=await fetch(url,{method:'GET',redirect:'follow',headers:{'User-Agent':'K4K-ReadOnly-Production-Sanity/1.0'},signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const html=await response.text();
  if(!html.includes('K4K APP')||!html.includes('data-dpl-id='))throw Error('Expected K4K deployment markers missing');
  if(/Application error: a client-side exception has occurred|Internal Server Error|__next_error__/.test(html))throw Error('Error marker in public HTML');
  console.log('OK '+path+' (HTTP '+response.status+')');
 }catch(e){failures++;console.error('FAIL '+path+': '+String(e?.message||e));}
}
if(failures){console.error('K4K production smoke: '+failures+' route failures. Check Vercel logs and the latest production deployment before further releases.');process.exitCode=1;}
else console.log('K4K public smoke OK. No customer account, credits or provider API accessed.');
