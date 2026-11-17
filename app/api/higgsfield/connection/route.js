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
  const key=process.env.HF_CREDENTIALS||process.env.HF_API_KEY;
  if(typeof key!=='string'||!key.trim())return respond({state:'not_configured'},503);
  const result=await createHiggsfieldCredentialProbe({credentials:key})();
  return respond({...result,paidGenerationEnabled:false});
 }catch{return respond({state:'unavailable',paidGenerationEnabled:false},503);}
}
