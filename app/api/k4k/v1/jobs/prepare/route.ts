import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {assessMotion} from "../../../../../../lib/k4k-motion-quality";
export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
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
 const type=request.headers.get("content-type")||"";
 if(!type.toLowerCase().includes("application/json"))return fail("JSON required",415);
 let payload:unknown;try{payload=await request.json()}catch{return fail("Invalid JSON",400)}
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return fail("Invalid payload",400);
 const p=payload as Record<string,unknown>;
 if(p.mode!=="motion-transfer")return fail("Only motion-transfer analysis is supported",422);
 const v=p.video;
 if(!v||typeof v!=="object"||Array.isArray(v))return fail("Video metadata required",422);
 const video=v as Record<string,unknown>;
 if(typeof video.name!=="string"||!video.name||video.name.length>200||typeof video.type!=="string"||!video.type.startsWith("video/")||typeof video.sizeBytes!=="number"||!Number.isFinite(video.sizeBytes)||video.sizeBytes<=0||video.sizeBytes>100*1024*1024)return fail("Unsupported video metadata or size",422);
 const numberOrNull=(x:unknown)=>typeof x==="number"&&Number.isFinite(x)&&x>=0?x:null;
 const duration=numberOrNull(video.durationSeconds);
 if(duration!==null&&duration>120)return fail("Video exceeds maximum analysis duration",422);
 if(!Array.isArray(p.images)||p.images.length>30||p.images.some(x=>!x||typeof x!=="object"||typeof x.name!=="string"||x.name.length>200))return fail("Invalid character references",422);
 const images=(p.images as {name:string}[]).map(x=>({name:x.name}));
 const report=assessMotion({video:{name:video.name,type:video.type,sizeBytes:video.sizeBytes,durationSeconds:duration,width:numberOrNull(video.width),height:numberOrNull(video.height),fps:numberOrNull(video.fps)},images});
 return NextResponse.json({jobCreated:false,generationEnabled:false,chargeAmount:0,providerCalled:false,assessment:report,nextStep:"Generation requires a separately approved provider and credit ledger."},{headers:{"Cache-Control":"no-store"}});
}
