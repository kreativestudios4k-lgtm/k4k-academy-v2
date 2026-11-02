import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { config, higgsfield } from "@higgsfield/client/v2";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const credentials = process.env.HF_CREDENTIALS;
  if (!url || !key || !credentials) return NextResponse.json({error:"Generation provider is not configured."},{status:503});
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({error:"Sign in required."},{status:401});
  const supabase = createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}} = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({error:"Invalid session."},{status:401});
  // A private pilot gate prevents unlimited paid provider calls before atomic credit billing exists.
  const allowlist = (process.env.K4K_GENERATION_TEST_USERS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  if (process.env.K4K_ENABLE_TEST_GENERATION!=="true" || !user.email || !allowlist.includes(user.email.toLowerCase())) {
    return NextResponse.json({error:"Generation is in a private test. Credits are not being charged."},{status:403});
  }
  let body:{prompt?:unknown;referencePath?:unknown;mode?:unknown;draftJobId?:unknown};
  try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
  if(body.mode!=="image-to-video")return NextResponse.json({error:"Character Swap is not available in this API pilot."},{status:400});
  if(typeof body.prompt!=="string"||body.prompt.trim().length<8||body.prompt.length>1800)return NextResponse.json({error:"Enter a prompt between 8 and 1800 characters."},{status:400});
  if(typeof body.referencePath!=="string" || !body.referencePath.startsWith(`${user.id}/`) || !/^[a-f0-9-]+\.(png|jpg|webp)$/i.test(body.referencePath.slice(user.id.length+1))) return NextResponse.json({error:"Invalid reference image path."},{status:400});
  const {data:signed,error:signError}=await supabase.storage.from("studio-references").createSignedUrl(body.referencePath,600);
  if(signError||!signed?.signedUrl)return NextResponse.json({error:"Reference image unavailable."},{status:400});
  let draftJobId:string|undefined;
  if(body.draftJobId!==undefined){
    if(typeof body.draftJobId!=="string"||!/^[a-f0-9-]{36}$/i.test(body.draftJobId))return NextResponse.json({error:"Invalid project ID."},{status:400});
    const {data:draft,error:draftError}=await supabase.from("studio_generation_jobs").select("id,status,reference_paths,prompt").eq("id",body.draftJobId).eq("user_id",user.id).single();
    if(draftError||!draft||draft.status!=="draft"||!draft.reference_paths?.includes(body.referencePath))return NextResponse.json({error:"Project does not match your saved reference image."},{status:409});
    draftJobId=draft.id;
  }
  const {data: jobId, error: jobError} = await supabase.rpc("k4k_studio_pilot_job_start",{p_reference_path:body.referencePath,p_prompt:body.prompt.trim()});
  if(jobError || typeof jobId!=="string")return NextResponse.json({error:"Unable to record generation request. No provider call was made."},{status:503});
  try {
    config({credentials});
    const result:unknown=await higgsfield.subscribe("bytedance/seedance-2.5/image-to-video",{
      input:{prompt:body.prompt.trim(),image_url:signed.signedUrl,duration:5,resolution:"720p",aspect_ratio:"9:16",output_format:"mp4"},
      withPolling:true,
    });
    const payload=result as {isCompleted?:boolean;jobs?:Array<{results?:{raw?:{url?:string}}}>};
    const videoUrl=payload?.jobs?.[0]?.results?.raw?.url;
    if(payload?.isCompleted===false||typeof videoUrl!=="string"||!videoUrl.startsWith("https://"))throw Error("Generation did not return a completed video.");
    const {error: logError} = await supabase.rpc("k4k_studio_pilot_job_finish",{p_job_id:jobId,p_success:true,p_output_url:videoUrl});
    if(logError)console.error("K4K generation completion log failed",logError.message);
    if(draftJobId){
      const {error:saveError}=await supabase.from("studio_generation_jobs").update({status:"completed",provider:"higgsfield",model:"bytedance/seedance-2.5/image-to-video",output_path:videoUrl,provider_job_id:jobId}).eq("id",draftJobId).eq("user_id",user.id).eq("status","draft");
      if(saveError)console.error("K4K output linking failed",saveError.code);
    }
    return NextResponse.json({videoUrl,jobId,draftJobId:draftJobId??null});
  }catch(error){
    console.error("K4K pilot generation error",error instanceof Error?error.message:"unknown");
    const {error: logError} = await supabase.rpc("k4k_studio_pilot_job_finish",{p_job_id:jobId,p_success:false,p_error:"Provider generation failed"});
    if(logError)console.error("K4K generation failure log failed",logError.message);
    return NextResponse.json({error:"Video generation failed. No K4K credits were charged."},{status:502});
  }
}
