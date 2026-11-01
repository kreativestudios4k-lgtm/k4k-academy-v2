import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
 const token=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(!token)return fail("Sign in required",401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return fail("Authentication unavailable",503);
 const sb=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)return fail("Invalid session",401);
 if(!(req.headers.get("content-type")||"").toLowerCase().includes("application/json"))return fail("JSON required",415);
 let input:unknown;try{input=await req.json()}catch{return fail("Invalid JSON",400)}
 if(!input||typeof input!=="object"||Array.isArray(input))return fail("Invalid payload",400);
 const path=(input as Record<string,unknown>).path;
 if(typeof path!=="string"||!new RegExp("^"+user.id+"/k4k-[a-f0-9-]+\\.(mp4|mov|webm)$","i").test(path))return fail("Invalid video path",422);
 const bucket="academy-student-uploads";
 const filename=path.split("/").pop()!;
 const {data:files,error:listError}=await sb.storage.from(bucket).list(user.id,{search:filename,limit:100});
 if(listError)return fail("Could not inspect uploaded video",503);
 const file=files?.find(x=>x.name===filename);
 if(!file)return fail("Video not uploaded yet",404);
 const maxBytes=100*1024*1024;
 const size=typeof file.metadata?.size==="number"?file.metadata.size:null;
 if(size===null||size<=0||size>maxBytes)return fail("Video size invalid",422);
 const {data:signed,error:signError}=await sb.storage.from(bucket).createSignedUrl(path,60);
 if(signError||!signed?.signedUrl)return fail("Video is not accessible",422);
 return NextResponse.json({verified:true,bucket,path,sizeBytes:size,private:true,generated:false,creditsCharged:0},{headers:{"Cache-Control":"no-store"}});
}
