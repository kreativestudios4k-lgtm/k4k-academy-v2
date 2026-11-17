// Temporary preview-only upload contract diagnostic. No file transfer or generation.
import {higgsfieldAuthorization} from '../lib/server/higgsfield-auth.mjs';
if(process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='feat/multimodel-output-ingestion-20261116'&&process.env.HF_CREDENTIALS){
 try{
  const r=await fetch('https://api.higgsfield.ai/files/generate-upload-url',{method:'POST',headers:{Authorization:higgsfieldAuthorization(process.env.HF_CREDENTIALS),'Content-Type':'application/json'},body:JSON.stringify({content_type:'video/mp4'}),redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok)console.log('HF_UPLOAD_CONTRACT',JSON.stringify({httpStatus:r.status}));
  else{const data=await r.json();const a=new URL(data.upload_url),b=new URL(data.public_url);console.log('HF_UPLOAD_CONTRACT',JSON.stringify({uploadHost:a.hostname,publicHost:b.hostname,uploadProtocol:a.protocol,publicProtocol:b.protocol,uploadPort:a.port,publicPort:b.port,publicHasQuery:!!b.search,hasHash:!!(a.hash||b.hash),headerNames:Object.keys(data.upload_headers||{})}));}
 }catch{console.log('HF_UPLOAD_CONTRACT unavailable');}
}
