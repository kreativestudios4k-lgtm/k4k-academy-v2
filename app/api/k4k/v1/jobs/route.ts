import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
export async function GET(req:Request){
 const token=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(!token)return NextResponse.json({error:"Sign in required"},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:"Authentication unavailable"},{status:503});
 const sb=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)return NextResponse.json({error:"Invalid session"},{status:401});
 const {data,error:dbError}=await sb.from("studio_generation_jobs").select("id,template_id,status,provider,model,credits_reserved,output_path,created_at,updated_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(25);
 if(dbError)return NextResponse.json({error:"Unable to retrieve jobs"},{status:503});
 return NextResponse.json({jobs:data??[],generationEnabled:false},{headers:{"Cache-Control":"no-store"}});
}
