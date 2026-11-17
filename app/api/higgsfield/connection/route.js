import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createHiggsfieldCredentialProbe} from '../../../../lib/server/higgsfield-credential-probe.mjs';
export const runtime='nodejs';
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{
 'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Authorization'
}});
export async function GET(request){
 if(process.env.VERCEL_ENV!=='preview'||process.env.K4K_HIGGSFIELD_CONNECTION_PROBE_ENABLED!=='true')
  return respond({error:'NOT_AVAILABLE'},404);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 const ownerId=process.env.K4K_HIGGSFIELD_CONNECTION_OWNER_ID;
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(ownerId??''))return respond({error:'NOT_AVAILABLE'},404);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return respond({error:'UNAVAILABLE'},503);
 try{
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}={},error}=await auth.auth.getUser(token);
  if(error||!user||user.is_anonymous)return respond({error:'UNAUTHENTICATED'},401);
  if(user.id!==ownerId)return respond({error:'NOT_AVAILABLE'},404);
  // Probe distinct preview credentials independently. Do not expose tokens,
  // compare them to browser data or silently substitute a live production key.
  const candidates=[
   ['pilot',process.env.K4K_HIGGSFIELD_API_PILOT],
   ['sdk',process.env.HF_CREDENTIALS]
  ].filter(([,v])=>typeof v==='string'&&v.length>=12&&v!=='true'&&!/[\s\x00-\x1f]/u.test(v));
  if(!candidates.length)return respond({state:'not_configured',credentialVerified:false,paidGenerationEnabled:false},503);
  const attempts=[];
  for(const [source,credentials] of candidates){
   const result=await createHiggsfieldCredentialProbe({credentials})();
   attempts.push({source,state:result.state,credentialVerified:result.credentialVerified===true});
  }
  const accepted=attempts.find(a=>a.credentialVerified);
  if(accepted)return respond({state:'authenticated',credentialVerified:true,source:accepted.source,attempts,paidGenerationEnabled:false});
  const state=attempts.some(a=>a.state==='rejected')?'rejected':attempts[0].state;
  return respond({state,credentialVerified:false,attempts,paidGenerationEnabled:false},200);
 }catch{return respond({state:'unavailable',paidGenerationEnabled:false},503);}
}
