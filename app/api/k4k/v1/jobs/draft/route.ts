import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
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
 if(typeof body.templateId!=="string"||body.templateId.length>100||!/^[a-z0-9_-]+$/i.test(body.templateId))return fail("Invalid template",422);
 if(typeof body.prompt!=="string"||body.prompt.length>1800)return fail("Prompt too long or missing",422);
 if(!Array.isArray(body.referencePaths)||body.referencePaths.length<1||body.referencePaths.length>30)return fail("1 to 30 image references required",422);
 const paths=body.referencePaths;
 if(paths.some(p=>typeof p!=="string"||!new RegExp("^"+user.id.replace(/-/g,"\\-")+"/[a-f0-9-]+\\.(png|jpg|jpeg|webp)$","i").test(p))||new Set(paths).size!==paths.length)return fail("Invalid reference paths",422);
 const main=body.mainReferenceIndex===undefined?0:body.mainReferenceIndex;
 if(!Number.isInteger(main)||typeof main!=="number"||main<0||main>=paths.length)return fail("Invalid main reference",422);
 // Verify that each reference exists in the user's private bucket before recording a draft.
 for(const path of paths as string[]){
  const {data,error:signError}=await sb.storage.from("studio-references").createSignedUrl(path,60);
  if(signError||!data?.signedUrl)return fail("A reference image is missing or inaccessible",422);
 }
 const {data,error:insertError}=await sb.from("studio_generation_jobs").insert({user_id:user.id,template_id:body.templateId,prompt:body.prompt,reference_paths:paths,main_reference_index:main,status:"draft",credits_reserved:0}).select("id,status,created_at").single();
 if(insertError){console.error("K4K draft creation failed",insertError.code);return fail("Could not create draft",503)}
 return NextResponse.json({job:data,generationEnabled:false,providerCalled:false,creditsCharged:0},{status:201,headers:{"Cache-Control":"no-store"}});
}
