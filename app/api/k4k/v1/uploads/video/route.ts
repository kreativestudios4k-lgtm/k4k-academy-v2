import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
const ALLOWED:Record<string,string>={"video/mp4":"mp4","video/quicktime":"mov","video/webm":"webm"};
export async function POST(request:Request){
 const token=request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(!token)return fail("Sign in required",401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return fail("Authentication unavailable",503);
 const sb=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)return fail("Invalid session",401);
 const {data:paid,error:membershipError}=await sb.rpc("k4k_ericm_has_paid_access");
 if(membershipError||paid!==true)return fail("Active Academy membership required",403);
 if(!(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return fail("JSON required",415);
 let input:unknown;try{input=await request.json()}catch{return fail("Invalid JSON",400)}
 if(!input||typeof input!=="object"||Array.isArray(input))return fail("Invalid payload",400);
 const body=input as Record<string,unknown>;
 if(typeof body.mimeType!=="string"||!Object.hasOwn(ALLOWED,body.mimeType))return fail("Only MP4, MOV and WebM videos are accepted",422);
 if(typeof body.sizeBytes!=="number"||!Number.isSafeInteger(body.sizeBytes)||body.sizeBytes<1||body.sizeBytes>100*1024*1024)return fail("Video must be 100 MB or smaller",422);
 // Existing private Academy bucket already enforces per-user folder access and 100 MB limit.
 const bucket="academy-student-uploads";
 const path=`${user.id}/k4k-${crypto.randomUUID()}.${ALLOWED[body.mimeType]}`;
 const {data,error:signError}=await sb.storage.from(bucket).createSignedUploadUrl(path);
 if(signError||!data?.token)return fail("Unable to authorize video upload",503);
 return NextResponse.json({bucket,path,token:data.token,expiresInSeconds:7200,maxBytes:100*1024*1024,mimeType:body.mimeType,uploadMethod:"supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {contentType:mimeType})",note:"Upload authorization only. No video generation or credit charge."},{headers:{"Cache-Control":"no-store"}});
}
