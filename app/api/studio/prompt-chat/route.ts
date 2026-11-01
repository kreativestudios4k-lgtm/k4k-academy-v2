import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const key=process.env.OPENAI_API_KEY;
 if(!key)return NextResponse.json({error:"Live prompt chat is not configured yet."},{status:503});
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return NextResponse.json({error:"Sign in required"},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!publicKey)return NextResponse.json({error:"Auth unavailable"},{status:503});
 const sb=createClient(url,publicKey,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:userError}=await sb.auth.getUser(auth.slice(7));
 if(userError||!user)return NextResponse.json({error:"Invalid session"},{status:401});
 const {data:allowed,error:accessError}=await sb.rpc("k4k_ericm_has_paid_access");
 if(accessError||allowed!==true)return NextResponse.json({error:"Active paid membership required"},{status:403});
 let body;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 const messages=Array.isArray(body.messages)?body.messages.slice(-12).filter((m:unknown):m is {role:"user"|"assistant";content:string}=>!!m&&typeof m==="object"&&["user","assistant"].includes((m as {role:string}).role)&&typeof (m as {content:unknown}).content==="string").map((m:{role:string;content:string})=>({role:m.role,content:m.content.slice(0,3500)})):[];
 if(!messages.length)return NextResponse.json({error:"Message required"},{status:400});
 const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.K4K_PROMPT_CHAT_MODEL||"gpt-4o-mini",temperature:0.7,max_tokens:750,messages:[{role:"system",content:"You are K4K Prompt Studio, a creative AI assistant for high-quality image and video generation prompts. Ask concise clarifying questions when necessary; otherwise write complete production-ready prompts. Support image generation, character reference consistency, cinematic motion, scene-by-scene planning, camera angles and negative prompts. Never claim exact motion replication is guaranteed. Keep replies practical."},...messages]})});
 if(!response.ok)return NextResponse.json({error:"Prompt service temporarily unavailable"},{status:502});
 const result=await response.json();return NextResponse.json({reply:result.choices?.[0]?.message?.content||"No response generated."},{headers:{"Cache-Control":"no-store"}});
}
