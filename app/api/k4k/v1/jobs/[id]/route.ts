import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return fail("Invalid job ID",422);
 const token=request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(!token)return fail("Sign in required",401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return fail("Authentication unavailable",503);
 const sb=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)return fail("Invalid session",401);
 const {data:job,error:dbError}=await sb.from("studio_generation_jobs").select("id,template_id,status,provider,model,reference_paths,main_reference_index,prompt,output_path,credits_reserved,error_message,created_at,updated_at").eq("id",id).eq("user_id",user.id).maybeSingle();
 if(dbError)return fail("Unable to retrieve job",503);
 if(!job)return fail("Job not found",404);
 let output:null|{url:string;expiresInSeconds:number}=null;
 if(job.status==="completed"&&typeof job.output_path==="string"&&job.output_path.startsWith(user.id+"/")){
  const {data,error:signError}=await sb.storage.from("studio-outputs").createSignedUrl(job.output_path,60);
  if(!signError&&data?.signedUrl)output={url:data.signedUrl,expiresInSeconds:60};
 }
 return NextResponse.json({job:{...job,output_path:undefined},output,generationEnabled:false},{headers:{"Cache-Control":"no-store"}});
}
