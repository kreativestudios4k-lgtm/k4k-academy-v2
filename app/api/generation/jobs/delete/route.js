import {createClient} from '@supabase/supabase-js';
import {deleteGeneratedVideo} from '../../../../../lib/server/generation-video-delete.mjs';
export const runtime='nodejs';
const respond=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function DELETE(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return respond({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return respond({error:'UNAVAILABLE'},503);
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const {data:{user}={},error:authError}=await createClient(url,anon,options).auth.getUser(token);
 if(authError||!user||user.is_anonymous)return respond({error:'UNAUTHENTICATED'},401);
 let body;try{body=await request.json()}catch{return respond({error:'INVALID_JSON'},400)}
 const db=createClient(url,secret,options);
 try{const result=await deleteGeneratedVideo({db,userId:user.id,jobId:body?.jobId});return respond(result,result.storageCleanupPending?202:200)}
 catch(e){const status=e.message==='INVALID_JOB'?400:e.message==='VIDEO_NOT_FOUND'?404:e.message==='VIDEO_NOT_DELETABLE'?409:503;return respond({error:status===503?'VIDEO_DELETE_UNAVAILABLE':e.message},status)}
}
