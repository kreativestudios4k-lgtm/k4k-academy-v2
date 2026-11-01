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
  let body:{prompt?:unknown;referencePath?:unknown;mode?:unknown};
  try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
  if(body.mode!=="image-to-video")return NextResponse.json({error:"Character Swap is not available in this API pilot."},{status:400});
  if(typeof body.prompt!=="string"||body.prompt.trim().length<8||body.prompt.length>1800)return NextResponse.json({error:"Enter a prompt between 8 and 1800 characters."},{status:400});
  if(typeof body.referencePath!=="string" || !body.referencePath.startsWith(`${user.id}/`) || !/^[a-f0-9-]+\.(png|jpg|webp)$/i.test(body.referencePath.slice(user.id.length+1))) return NextResponse.json({error:"Invalid reference image path."},{status:400});
  const {data:signed,error:signError}=await supabase.storage.from("studio-references").createSignedUrl(body.referencePath,600);
  if(signError||!signed?.signedUrl)return NextResponse.json({error:"Reference image unavailable."},{status:400});
  try {
    config({credentials});
    const result:unknown=await higgsfield.subscribe("bytedance/seedance-2.5/image-to-video",{
      input:{prompt:body.prompt.trim(),image_url:signed.signedUrl,duration:5,resolution:"720p",aspect_ratio:"9:16",output_format:"mp4"},
      withPolling:true,
    });
    const payload=result as {isCompleted?:boolean;jobs?:Array<{results?:{raw?:{url?:string}}}>};
    const videoUrl=payload?.jobs?.[0]?.results?.raw?.url;
    if(payload?.isCompleted===false||typeof videoUrl!=="string"||!videoUrl.startsWith("https://"))throw Error("Generation did not return a completed video.");
    return NextResponse.json({videoUrl});
  }catch(error){
    console.error("K4K pilot generation error",error instanceof Error?error.message:"unknown");
    return NextResponse.json({error:"Video generation failed. No K4K credits were charged."},{status:502});
  }
}
