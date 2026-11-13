import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export async function POST(request){
 if(process.env.K4K_LAUNCH_TESTER_GRANTS_ENABLED!=='true')return json({error:'TESTER_GRANTS_DISABLED'},503);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return json({error:'UNAUTHENTICATED'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!secret)return json({error:'UNAVAILABLE'},503);
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
 if(error||!user||user.is_anonymous)return json({error:'UNAUTHENTICATED'},401);
 const db=createClient(url,secret,options);
 const {data:admin,error:adminError}=await db.from('k4k_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError)return json({error:'UNAVAILABLE'},503);if(!admin)return json({error:'FORBIDDEN'},403);
 let body;try{body=await request.json()}catch{return json({error:'INVALID_TESTER'},400)}
 if(!uuid.test(body?.userId||'')||Object.keys(body).some(k=>k!=='userId'))return json({error:'INVALID_TESTER'},400);
 const {data,error:grantError}=await db.rpc('k4k_launch_grant_tester',{p_user:body.userId});
 if(grantError||!data)return json({error:grantError?.message==='TESTER_LIMIT'?'TESTER_LIMIT':'GRANT_UNAVAILABLE'},grantError?.message==='TESTER_LIMIT'?409:503);
 return json(data);
}
