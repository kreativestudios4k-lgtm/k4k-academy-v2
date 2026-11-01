import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
 const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
 if (!token) return NextResponse.json({error:"Sign in required."},{status:401,headers:noStore});
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if (!url || !key) return NextResponse.json({error:"Studio is not configured."},{status:503,headers:noStore});
 const supabase = createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await supabase.auth.getUser(token);
 if(authError||!user) return NextResponse.json({error:"Session expired."},{status:401,headers:noStore});
 const {data,error}=await supabase.from("studio_generation_jobs")
  .select("id,status,model,prompt,output_path,created_at,updated_at,error_message")
  .eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);
 if(error) return NextResponse.json({error:"Unable to load your creations."},{status:503,headers:noStore});
 const creations=(data||[]).map(job=>({
  id:job.id,status:job.status,model:job.model,prompt:job.prompt,
  videoUrl:job.status==="completed"&&typeof job.output_path==="string"&&job.output_path.startsWith("https://")?job.output_path:null,
  createdAt:job.created_at,updatedAt:job.updated_at,
  error:job.status==="failed"?job.error_message:null
 }));
 return NextResponse.json({creations},{headers:noStore});
}
