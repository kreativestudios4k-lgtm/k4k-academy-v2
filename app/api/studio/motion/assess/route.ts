import {NextResponse} from "next/server";
import {assessMotion} from "../../../../../lib/k4k-motion-quality";
export const runtime="nodejs";
export async function POST(req:Request){
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return NextResponse.json({error:"Sign in required"},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:"Authentication unavailable"},{status:503});
 const {createClient}=await import("@supabase/supabase-js");
 const sb=createClient(url,key,{global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await sb.auth.getUser(auth.slice(7));
 if(error||!user)return NextResponse.json({error:"Invalid session"},{status:401});
 const allowed=await sb.rpc("k4k_ericm_has_paid_access");
 if(allowed.error||allowed.data!==true)return NextResponse.json({error:"Active paid membership required"},{status:403});
 let payload:unknown;try{payload=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(!payload||typeof payload!=="object")return NextResponse.json({error:"Invalid payload"},{status:400});
 const p=payload as Record<string,unknown>;const v=p.video as Record<string,unknown>|undefined;
 if(!v||typeof v.name!=="string"||v.name.length>200||typeof v.sizeBytes!=="number"||v.sizeBytes<0||v.sizeBytes>500e6||typeof v.type!=="string")return NextResponse.json({error:"Invalid video metadata"},{status:400});
 const numeric=(x:unknown)=>typeof x==="number"&&Number.isFinite(x)&&x>=0?x:null;
 const imgs=Array.isArray(p.images)?p.images.slice(0,30).filter((x):x is {name:string}=>!!x&&typeof x==="object"&&typeof x.name==="string"&&x.name.length<=200):[];
 return NextResponse.json(assessMotion({video:{name:v.name,sizeBytes:v.sizeBytes,type:v.type,durationSeconds:numeric(v.durationSeconds),width:numeric(v.width),height:numeric(v.height),fps:numeric(v.fps)},images:imgs}),{headers:{"Cache-Control":"no-store"}});
}
